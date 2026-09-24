import type { QuoteOption } from "./ffeQueries";

/* ---------------- document shape (stored in proposals.line_items) ---------------- */

export interface DocImage { path: string; caption: string | null }
/** One render page in the rail. `area` links it to a design area; null = a page sales added. */
export interface DocPage { id: string; area: string | null; title: string; desc: string; images: DocImage[] }
export interface ItemGroup { room: string; items: { item: string; qty: number }[] }

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
  finalAt: string | null;
}

export const DEFAULT_TERMS =
  "Price includes everything — design, procurement, delivery, installation and styling, handed over move-in ready. Images are design renders; final items depend on market availability — we will keep the result as close to the renders as possible. Quotation valid 14 days from the date above.";

export const defaultDesc = (style: string, area: string) =>
  `${style} ${area.toLowerCase()} designed around the client brief — furniture, lighting and finishes selected to match the renders shown.`;

export const newId = () => crypto.randomUUID();

/* ---------------- design → pages ---------------- */

export interface SourceImage { storage_path: string; caption: string | null; room: string | null; kind: string; file_name: string | null }
export interface SourceDesign { id: string; version: number; status: string; images: SourceImage[] }

const isPdfPath = (p: string) => p.toLowerCase().endsWith(".pdf");
const isFloor = (i: SourceImage) => i.kind === "Floor plan" || i.room === "Floor Plan";
const isMood = (i: SourceImage) => i.kind === "Mood board" || i.room === "Mood Board";
/** Images sales uploaded inside the editor live under designs/<lead>/proposal/… and survive a design refresh. */
const isOwnUpload = (p: string) => p.includes("/proposal/");

export const designParts = (design: SourceDesign) => {
  const renders = design.images.filter((i) => !isFloor(i) && !isMood(i) && !isPdfPath(i.storage_path));
  const order: string[] = [];
  const map = new Map<string, DocImage[]>();
  for (const i of renders) {
    const a = i.room ?? "Other";
    if (!map.has(a)) { map.set(a, []); order.push(a); }
    map.get(a)!.push({ path: i.storage_path, caption: i.caption });
  }
  const floor = design.images.find(isFloor);
  return {
    hero: renders[0]?.storage_path ?? null,
    areas: order.map((area) => ({ area, images: map.get(area)! })),
    floor: floor ? { path: floor.storage_path, name: floor.file_name } : null,
    mood: design.images.filter((i) => isMood(i) && !isPdfPath(i.storage_path)).map((i) => ({ path: i.storage_path, caption: i.caption })),
  };
};

/** Refresh images from a design version, keeping every title and description sales has written. */
export const applyDesign = (doc: ProposalDocument, design: SourceDesign, style: string): ProposalDocument => {
  const d = designParts(design);
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
    pages.push({ id: newId(), area: a.area, title: a.area, desc: defaultDesc(style, a.area), images: a.images });
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
  style: string;
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
    finalAt: null,
  };
  if (v.design) doc = applyDesign(doc, v.design, v.style);
  if (v.quote) doc = applyQuote(doc, v.quote, v.groups);
  return doc;
};

/** Proposals saved before the rebuild used a different shape; lift them into v2 on read. */
export const normalizeDoc = (raw: unknown): ProposalDocument => {
  const d = (raw ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (d.v === 2) return d as ProposalDocument;
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
const groupWeight = (g: ItemGroup) => 1.6 + g.items.length;

export const paginateItems = (groups: ItemGroup[]) => {
  const pages: ItemGroup[][] = [];
  let cur: ItemGroup[] = [], w = 0;
  for (const g of groups) {
    const gw = groupWeight(g);
    if (cur.length && w + gw > ITEM_PAGE_CAP) { pages.push(cur); cur = []; w = 0; }
    cur.push(g); w += gw;
  }
  if (cur.length) pages.push(cur);
  return { pages, usedWeight: w };
};

export const autoCombine = (usedWeight: number, optionCount: number) =>
  Math.ceil(usedWeight / 3) + (8 + 10 * Math.ceil(optionCount / 2) + 5) <= 38;

export const MAX_IMAGES_PER_PAGE = 2;

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
  const { pages, usedWeight } = paginateItems(groups);
  const guess = autoCombine(usedWeight, doc.investment.options.length);
  const combine = showItems && showInvest && (doc.toggles.combine ?? guess);
  if (showItems) {
    pages.forEach((g, k) => sheets.push({
      kind: "items", title: pages.length > 1 ? `Item list · ${k + 1} of ${pages.length}` : "Item list",
      groups: g, withInvest: combine && k === pages.length - 1,
    }));
  }
  if (showInvest && !combine) sheets.push({ kind: "invest" });
  return { sheets, combineGuess: guess, combined: combine, canCombine: showItems && showInvest };
};
