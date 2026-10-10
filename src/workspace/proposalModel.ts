import type { QuoteOption } from "./ffeQueries";
import { DESIGN_AREAS } from "./designSchema";

/* ---------------- document shape (stored in proposals.line_items) ---------------- */

export interface DocImage { path: string; caption: string | null }
/** One render page in the rail. `area` links it to a design area; null = a page sales added. */
export interface DocPage { id: string; area: string | null; title: string; desc: string; images: DocImage[] }
export interface ItemGroup { room: string; items: { item: string; qty: number }[] }

export interface ItemListDiff { added: number; removed: number; quantitiesChanged: number; differs: boolean }

/** Compare proposal item content without treating room or item ordering as a change. */
export const itemListDiff = (stored: ItemGroup[], live: ItemGroup[]): ItemListDiff => {
  const collect = (groups: ItemGroup[]) => {
    const map = new Map<string, number[]>();
    for (const group of groups) {
      for (const row of group.items) {
        const key = JSON.stringify([group.room, row.item]);
        map.set(key, [...(map.get(key) ?? []), Number(row.qty)]);
      }
    }
    for (const quantities of map.values()) quantities.sort((a, b) => a - b);
    return map;
  };
  const before = collect(stored);
  const after = collect(live);
  let added = 0;
  let removed = 0;
  let quantitiesChanged = 0;
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const oldQuantities = [...(before.get(key) ?? [])];
    const newQuantities = [...(after.get(key) ?? [])];
    for (let i = oldQuantities.length - 1; i >= 0; i -= 1) {
      const match = newQuantities.indexOf(oldQuantities[i] ?? 0);
      if (match < 0) continue;
      oldQuantities.splice(i, 1);
      newQuantities.splice(match, 1);
    }
    const changed = Math.min(oldQuantities.length, newQuantities.length);
    quantitiesChanged += changed;
    removed += oldQuantities.length - changed;
    added += newQuantities.length - changed;
  }
  return { added, removed, quantitiesChanged, differs: added + removed + quantitiesChanged > 0 };
};

export interface ProposalDocument {
  v: 2;
  designId: string | null;
  designVersion: number | null;
  /** ffe_costings.version this document's prices came from; null = budget placeholders. */
  quoteVersion: number | null;
  cover: { client: string; scope: string; location: string; date: string; validity: string; intro: string; hero: string | null };
  floorPlan: { path: string | null; name: string | null; text: string };
  pages: DocPage[];
  moodBoard: DocImage[];
  itemList: ItemGroup[];
  investment: { options: QuoteOption[]; vat: number; down: number; terms: string };
  /** combine: null = decide automatically. */
  toggles: { floorPlan: boolean; moodBoard: boolean; itemList: boolean; investment: boolean; combine: boolean | null };
  /** Small line at the foot of every picture page (render pages and mood board). */
  imagesNote: string;
  finalAt: string | null;
}

export const DEFAULT_TERMS =
  "Price includes everything — design, procurement, delivery, installation and styling, handed over move-in ready. Images are design renders; final items depend on market availability — we will keep the result as close to the renders as possible. Quotation valid 14 days from the date above.";

export const DEFAULT_IMAGES_NOTE =
  "These are concept images. Final items depend on availability in the market at the time we execute the design — we will keep the result as close to these as possible.";

/** Opening line for a new render page, chosen by the room's area (not the page title —
 *  sales can rename a title). `area: null` = a page sales added; it gets the generic line.
 *  Deliberately free of interpolated fields: `style` is sales' free text (it has held
 *  "Elite or Regal from our catalogue") and reads as nonsense mid-sentence.
 *  It is a placeholder — sales replaces it with copy written for the room. */
const DEFAULT_DESCS: Array<[RegExp, string]> = [
  [/living|dining/i, "Where the home gathers. Seating arranged for conversation, a table that holds a long dinner, and light layered so the room works as well at breakfast as it does late in the evening."],
  [/bedroom/i, "A room with one job: rest. Quiet layers, storage that stays out of sight, and lighting soft enough to wind down by."],
  [/kitchen/i, "Built for daily use — hard-wearing surfaces, storage within reach, and everything where your hand expects it."],
  [/bath/i, "Calm, practical and hotel-fresh — finishes chosen to look as good on the hundredth morning as on the first."],
  [/entrance|foyer|hallway/i, "The first thing anyone sees, and the place keys, shoes and bags actually land."],
  [/balcony|terrace/i, "Outdoor seating made for Dubai evenings — comfortable, weather-honest and easy to keep."],
  [/maid/i, "Compact and complete: everything needed for comfort, nothing wasted on space."],
];
const GENERIC_DESC =
  "Designed around your brief — every piece, finish and light chosen to work together in this room.";

export const defaultDesc = (area: string | null) => {
  if (area) {
    for (const [pattern, text] of DEFAULT_DESCS) {
      if (pattern.test(area)) return text;
    }
  }
  return GENERIC_DESC;
};

/** True when a page still carries the default line for its area (one source of truth for the rail's hint). */
export const isDefaultDesc = (desc: string, area: string | null) => desc === defaultDesc(area);

export const newId = () => crypto.randomUUID();

/* ---------------- design → pages ---------------- */

export interface SourceImage { storage_path: string; caption: string | null; room: string | null; kind: string; file_name: string | null }
export interface SourceDesign { id: string; version: number; status: string; images: SourceImage[] }

const isPdfPath = (p: string) => p.toLowerCase().endsWith(".pdf");
const isFloor = (i: SourceImage) => i.kind === "Floor plan" || i.room === "Floor Plan";
/** Mood-board kind: ordered after renders within its room. */
const isMoodKind = (i: SourceImage) => i.kind === "Mood board";
/** Filed in the generic Mood Board area (no room of its own): goes to the trailing mood-board page. */
const isRoomless = (i: SourceImage) => i.room === "Mood Board";
/** Images sales uploaded inside the editor live under designs/<lead>/proposal/… and survive a design refresh. */
const isOwnUpload = (p: string) => p.includes("/proposal/");
const AREA_RANK = new Map((DESIGN_AREAS as readonly string[]).map((a, i) => [a.toLowerCase(), i]));

export const designParts = (design: SourceDesign) => {
  const usable = design.images.filter((i) => !isFloor(i) && !isPdfPath(i.storage_path));
  const roomed = usable.filter((i) => !isRoomless(i));
  const renders = usable.filter((i) => !isMoodKind(i));
  const moodKind = usable.filter(isMoodKind);
  const order: string[] = [];
  const map = new Map<string, DocImage[]>();
  // Renders first, then mood boards, within each room.
  for (const i of [...roomed.filter((x) => !isMoodKind(x)), ...roomed.filter(isMoodKind)]) {
    const a = i.room ?? "Other";
    if (!map.has(a)) { map.set(a, []); order.push(a); }
    map.get(a)!.push({ path: i.storage_path, caption: i.caption });
  }
  // Canonical areas first; custom areas keep their first-seen order (sort is stable).
  const rank = (a: string) => AREA_RANK.get(a.toLowerCase()) ?? DESIGN_AREAS.length;
  order.sort((a, b) => rank(a) - rank(b));
  const floor = design.images.find(isFloor);
  return {
    hero: renders[0]?.storage_path ?? moodKind[0]?.storage_path ?? null,
    areas: order.map((area) => ({ area, images: map.get(area)! })),
    floor: floor ? { path: floor.storage_path, name: floor.file_name } : null,
    mood: usable.filter(isRoomless).map((i) => ({ path: i.storage_path, caption: i.caption })),
  };
};

/** Refresh images from a design version, keeping every title and description sales has written. */
export const applyDesign = (doc: ProposalDocument, design: SourceDesign): ProposalDocument => {
  const parts = designParts(design);
  // Captions sales has edited survive a refresh, matched by picture path.
  const edited = new Map<string, string | null>();
  for (const i of [...doc.pages.flatMap((p) => p.images), ...doc.moodBoard]) edited.set(i.path, i.caption);
  const keep = (imgs: DocImage[]) => imgs.map((i) => (edited.has(i.path) ? { ...i, caption: edited.get(i.path) ?? null } : i));
  const d = { ...parts, areas: parts.areas.map((a) => ({ ...a, images: keep(a.images) })), mood: keep(parts.mood) };
  const seen = new Set<string>();
  const pages: DocPage[] = [];
  for (const p of doc.pages) {
    if (!p.area) { pages.push(p); continue; }
    const src = d.areas.find((a) => a.area === p.area);
    if (!src) continue;
    seen.add(p.area);
    pages.push({ ...p, images: [...src.images, ...p.images.filter((i) => isOwnUpload(i.path))] });
  }
  for (const a of d.areas) {
    if (seen.has(a.area)) continue;
    pages.push({ id: newId(), area: a.area, title: a.area, desc: defaultDesc(a.area), images: a.images });
  }
  const keepFloor = doc.floorPlan.path && isOwnUpload(doc.floorPlan.path);
  return {
    ...doc,
    designId: design.id,
    designVersion: design.version,
    cover: { ...doc.cover, hero: d.hero ?? doc.cover.hero },
    pages,
    floorPlan: keepFloor ? doc.floorPlan : { ...doc.floorPlan, path: d.floor?.path ?? null, name: d.floor?.name ?? null },
    moodBoard: [...d.mood, ...doc.moodBoard.filter((m) => isOwnUpload(m.path))],
    finalAt: null,
  };
};

export const applyQuote = (doc: ProposalDocument, quote: { version: number; options: QuoteOption[] }, groups: ItemGroup[]): ProposalDocument => ({
  ...doc,
  quoteVersion: quote.version,
  investment: { ...doc.investment, options: quote.options.map((o) => ({ label: o.label, desc: o.desc, amount: Number(o.amount) || 0 })) },
  itemList: groups.length ? groups : doc.itemList,
  finalAt: null,
});

export const buildDocument = (v: {
  lead: { name: string; property: string | null; building: string | null; location: string | null; unit_type: string | null; scope: string | null; budget: number | null };
  design: SourceDesign | null;
  quote: { version: number; options: QuoteOption[] } | null;
  groups: ItemGroup[];
}): ProposalDocument => {
  const unit = v.lead.unit_type?.trim() ?? "";
  let doc: ProposalDocument = {
    v: 2,
    designId: null, designVersion: null, quoteVersion: null,
    cover: {
      client: v.lead.name,
      scope: v.lead.scope?.trim() || (unit ? `${unit} · full furnishing` : "Full furnishing"),
      location: [v.lead.property ?? v.lead.building, v.lead.location].filter(Boolean).join(", "),
      date: new Date().toISOString().slice(0, 10),
      validity: "14 days",
      intro: `A complete furnishing proposal for your ${unit || "home"}${v.lead.property ? ` at ${v.lead.property}` : ""} — designed around your brief, sourced, delivered, installed and styled, handed over ready to live in.`,
      hero: null,
    },
    floorPlan: { path: null, name: null, text: "" },
    pages: [],
    moodBoard: [],
    itemList: v.groups,
    investment: {
      options: [{ label: "Option A", desc: "Full furnishing, appliances & styling", amount: Number(v.lead.budget) || 0 }],
      vat: 5, down: 80, terms: DEFAULT_TERMS,
    },
    toggles: { floorPlan: true, moodBoard: true, itemList: true, investment: true, combine: null },
    imagesNote: DEFAULT_IMAGES_NOTE,
    finalAt: null,
  };
  if (v.design) doc = applyDesign(doc, v.design);
  if (v.quote) doc = applyQuote(doc, v.quote, v.groups);
  return doc;
};

/** Proposals saved before the rebuild used a different shape; lift them into v2 on read. */
export const normalizeDoc = (raw: unknown): ProposalDocument => {
  const d = (raw ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (d.v === 2) return { ...(d as ProposalDocument), imagesNote: typeof d.imagesNote === "string" ? d.imagesNote : DEFAULT_IMAGES_NOTE };
  const c = d.cover ?? {};
  const inv = d.investment ?? {};
  return {
    v: 2,
    designId: d.designId ?? null, designVersion: d.designVersion ?? null, quoteVersion: null,
    cover: {
      client: c.client ?? "", scope: c.unit ?? "", location: c.property ?? "", date: c.date ?? new Date().toISOString().slice(0, 10),
      validity: "14 days", intro: "", hero: c.hero ?? null,
    },
    floorPlan: { path: d.floorPlan?.path ?? null, name: d.floorPlan?.name ?? null, text: "" },
    pages: (d.areas ?? []).map((a: { area: string; title: string; desc: string; images: DocImage[] }) => ({ id: newId(), area: a.area, title: a.title, desc: a.desc, images: a.images ?? [] })),
    moodBoard: (d.moodBoard ?? []).map((m: { path: string }) => ({ path: m.path, caption: null })),
    itemList: d.itemList ?? [],
    investment: { options: inv.options ?? [], vat: inv.vat ?? 5, down: inv.downpayment ?? 80, terms: inv.terms || DEFAULT_TERMS },
    toggles: {
      floorPlan: d.toggles?.floorPlan ?? true, moodBoard: d.toggles?.moodBoard ?? true,
      itemList: d.toggles?.itemList ?? true, investment: d.toggles?.investment ?? true, combine: null,
    },
    imagesNote: DEFAULT_IMAGES_NOTE,
    finalAt: null,
  };
};

/* ---------------- numbers ---------------- */

export const money = (n: number) => `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const priceLines = (amount: number, vat: number, down: number) => {
  const total = amount * (1 + vat / 100);
  return { base: amount, vat: total - amount, total, down: total * (down / 100), balance: total * (1 - down / 100) };
};
export const investEyebrow = (n: number) => (n > 1 ? `${n} options` : "One complete package");

/* ---------------- pagination ---------------- */

export const ITEM_PAGE_CAP = 114;
/** ~30 characters fit on one line of a 3-column item list; a longer name wraps and costs another row. */
const ITEM_CHARS_PER_LINE = 30;
const itemRows = (item: string) => Math.max(1, Math.ceil(item.length / ITEM_CHARS_PER_LINE));
/** Spec weight is 1.6 + items.length; wrapped names count once per line so a page can never overflow. */
const groupWeight = (g: ItemGroup) => 1.6 + g.items.reduce((s, i) => s + itemRows(i.item), 0);

/**
 * How much item list fits above the investment table on a combined last page (4 columns, measured:
 * a 2-bedroom list of weight 92 fills it with one option). Each extra option row takes some back.
 */
export const combinedPageCap = (optionCount: number) => 96 - 8 * (Math.max(1, optionCount) - 1);

/** lastCap: what the final page may hold — smaller when the investment shares that page. */
export const paginateItems = (groups: ItemGroup[], lastCap: number = ITEM_PAGE_CAP) => {
  if (!groups.length) return { pages: [] as ItemGroup[][], pageWeights: [] as number[], usedWeight: 0 };
  const weights = groups.map(groupWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const prefix = [0];
  for (const weight of weights) prefix.push((prefix[prefix.length - 1] ?? 0) + weight);

  /** Ordered partitioning keeps room order while making every page look intentionally filled. */
  const partition = (pageCount: number) => {
    const target = totalWeight / pageCount;
    const dp = Array.from({ length: pageCount + 1 }, () => Array(groups.length + 1).fill(Number.POSITIVE_INFINITY));
    const cut = Array.from({ length: pageCount + 1 }, () => Array(groups.length + 1).fill(-1));
    dp[0][0] = 0;
    for (let page = 1; page <= pageCount; page += 1) {
      for (let end = page; end <= groups.length; end += 1) {
        for (let start = page - 1; start < end; start += 1) {
          const weight = (prefix[end] ?? 0) - (prefix[start] ?? 0);
          if (weight > (page === pageCount ? lastCap : ITEM_PAGE_CAP) || !Number.isFinite(dp[page - 1]?.[start])) continue;
          const score = (dp[page - 1]?.[start] ?? 0) + Math.pow(weight - target, 2);
          if (score < (dp[page]?.[end] ?? Number.POSITIVE_INFINITY)) {
            if (dp[page]) dp[page][end] = score;
            if (cut[page]) cut[page][end] = start;
          }
        }
      }
    }
    if (!Number.isFinite(dp[pageCount]?.[groups.length])) return null;
    const ranges: Array<[number, number]> = [];
    let end = groups.length;
    for (let page = pageCount; page > 0; page -= 1) {
      const start = cut[page]?.[end] ?? -1;
      if (start < 0) return null;
      ranges.unshift([start, end]);
      end = start;
    }
    return ranges;
  };

  let pageCount = Math.max(1, Math.ceil(totalWeight / ITEM_PAGE_CAP), 1 + Math.ceil(Math.max(0, totalWeight - lastCap) / ITEM_PAGE_CAP));
  let ranges = partition(pageCount);
  while (!ranges && pageCount < groups.length) {
    pageCount += 1;
    ranges = partition(pageCount);
  }
  if (!ranges) {
    // Can't respect lastCap (one room is bigger than a combined page): report it so the caller doesn't combine.
    if (lastCap < ITEM_PAGE_CAP) return { pages: [] as ItemGroup[][], pageWeights: [] as number[], usedWeight: 0, fits: false };
    ranges = groups.map((_, index) => [index, index + 1] as [number, number]);
  }
  const pages = ranges.map(([start, end]) => groups.slice(start, end));
  const pageWeights = ranges.map(([start, end]) => (prefix[end] ?? 0) - (prefix[start] ?? 0));
  return { pages, pageWeights, usedWeight: pageWeights[pageWeights.length - 1] ?? 0, fits: true };
};

/** A room stays on one proposal sheet unless it has more than six pictures. */
export const MAX_IMAGES_PER_PAGE = 6;

export type Sheet =
  | { kind: "cover" }
  | { kind: "floor" }
  | { kind: "area"; eyebrow: string; title: string; desc: string | null; images: DocImage[] }
  | { kind: "items"; title: string; groups: ItemGroup[]; withInvest: boolean }
  | { kind: "invest" };

export const layoutSheets = (doc: ProposalDocument) => {
  const sheets: Sheet[] = [{ kind: "cover" }];
  if (doc.toggles.floorPlan) sheets.push({ kind: "floor" });
  const areaPage = (eyebrow: string, title: string, desc: string, images: DocImage[]) => {
    const chunks: DocImage[][] = [];
    for (let i = 0; i < images.length; i += MAX_IMAGES_PER_PAGE) chunks.push(images.slice(i, i + MAX_IMAGES_PER_PAGE));
    if (!chunks.length) chunks.push([]);
    chunks.forEach((imgs, k) => sheets.push({
      kind: "area", eyebrow: chunks.length > 1 ? `${eyebrow} · ${k + 1} of ${chunks.length}` : eyebrow,
      title, desc: k === 0 ? desc : null, images: imgs,
    }));
  };
  doc.pages.forEach((p, i) => areaPage(`Area ${String(i + 1).padStart(2, "0")}`, p.title, p.desc, p.images));
  if (doc.toggles.moodBoard && doc.moodBoard.length) {
    areaPage("Design direction", "Mood board", "The palette, textures and references guiding the design.", doc.moodBoard);
  }
  const groups = doc.itemList.filter((g) => g.items.length);
  const showItems = doc.toggles.itemList && groups.length > 0;
  const showInvest = doc.toggles.investment && doc.investment.options.length > 0;
  // Default (combine: null) is one page for the last of the item list and the investment: the item
  // pages are re-balanced so the last one leaves room for the table. Only when even that can't fit
  // (one room larger than a combined page) does the investment get its own page.
  const combinedTry = showItems && showInvest ? paginateItems(groups, combinedPageCap(doc.investment.options.length)) : null;
  const guess = !!combinedTry?.fits;
  const combine = showItems && showInvest && (doc.toggles.combine ?? guess);
  const { pages } = combine && combinedTry?.fits ? combinedTry : paginateItems(groups);
  if (showItems) {
    pages.forEach((g, k) => sheets.push({
      kind: "items", title: pages.length > 1 ? `Item list · ${k + 1} of ${pages.length}` : "Item list",
      groups: g, withInvest: combine && k === pages.length - 1,
    }));
  }
  if (showInvest && !combine) sheets.push({ kind: "invest" });
  return { sheets, combineGuess: guess, combined: combine, canCombine: showItems && showInvest };
};
