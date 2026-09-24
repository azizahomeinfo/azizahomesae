export const PROJECT_TYPES = ["New Fit-Out", "Refresh", "Partial Package", "Staging", "Other"];
export const CONTRACT_STATES = ["Quote Sent", "Deposit Paid", "Contract Signed", "Pending"];
export const STYLES = [
  "Contemporary", "Modern Minimal", "Scandinavian", "Mid-Century", "Coastal", "Industrial Chic",
  "Classic / Traditional", "Boho", "Eclectic Mix", "Luxury Hotel", "Family-Friendly Durable", "Other",
];
export const ACCENTS = ["Rustic Wood", "Metallic Glam", "Organic / Biophilic", "Color-Pop", "Monochrome", "Cultural Motifs", "Other"];
export const ZONES = ["Living / Dining", "Bedrooms", "Kitchen", "Bathrooms", "Misc / Feature Walls"];
export const OUTPUTS = ["AI 3D render", "Mood board"];

export type Included = "inc" | "exc" | "pend";

interface ChecklistItem { item: string; std: string; included: Included }
interface ChecklistSection { code: string; title: string; notesLabel: string; items: ChecklistItem[] }

const ALT = "Alt / Spec Notes";
const mk = (rows: [string, string | number, Included?][]): ChecklistItem[] =>
  rows.map(([item, std, included]) => ({ item, std: String(std), included: included ?? "inc" }));

const LIVING = mk([
  ["Sofa", 1], ["Wall Art Above Sofa", 1], ["Floor Lamp", 1], ["TV Unit", 1], ["Coffee Table", 1],
  ["Dining Table", 1], ["Dining Chairs", 4], ["Ceiling Pendant Above Sofa", 1], ["Rug (Living)", 1],
  ["Faux Plant w/ Pot", 1], ["Full Length Mirror", 1], ["Curtain w/ Sheer (Living)", "1 set"],
  ["Balcony Set – 2-Seater", 1],
]);
const MASTER = mk([
  ["King Bed + Mattress 1.8m", 1], ["Nightstands", 2], ["Ceiling Pendant", 1], ["Wall Lamps", 2],
  ["Dresser + Ottoman + Mirror", 1], ["Bedroom Rug", 1], ["Curtain w/ Sheer", "1 set"], ["Wall Art Décor", 1],
  ["Pillows", 4], ["Comforter", 1], ["Decorative Cushions", 2], ["Throw", 1], ["Bedding Set", 2],
]);
const GUEST = mk([
  ["Queen Bed + Mattress 1.6m", 1], ["Nightstands", 2], ["Ceiling Pendant", 1], ["Wall Lamps", 2],
  ["Dresser + Mirror", 1], ["Bedroom Rug", 1], ["Curtain w/ Sheer", "1 set"], ["Wall Art Décor", 1],
  ["Pillows", 4], ["Comforter", 1], ["Decorative Cushions", 2], ["Throw", 1], ["Bedding Set", 2],
]);
const SLEEPING = mk([
  ["Queen Bed + Mattress 1.6m", 1], ["Nightstands", 2], ["Wall Sconces", 2], ["Bedroom Rug", 1],
  ["Curtain w/ Sheer", "1 set"], ["Wall Art Décor", 1], ["Pillows", 4], ["Comforter", 1],
  ["Decorative Cushions", 2], ["Throw", 1], ["Bedding Set", 2],
]);
const MAID = mk([["Single Bed + Mattress", 1], ["Nightstand", 1], ["Curtain", "1 set"], ["Pillows", 2], ["Comforter", 1], ["Bedding Set", 1]]);
const BATH = mk([["Soap Dispenser Set", 2], ["Trash Can", 2], ["Towel Set", 2], ["Bathroom Amenities", 1]]);
const KITCHEN = mk([
  ["Cookware Set (10 pcs)", 1], ["Utensil Set", 1], ["Dinner Set for 6", 1], ["Knife Set", 1],
  ["Cutlery Set (24 pcs)", 1], ["Highball Glass", 6], ["Wine Glass", 6], ["Placemat", 4], ["Cutlery Tray", 1],
  ["Colander", 1], ["Peeler", 1], ["Can Opener", 1], ["Steel Grater", 1], ["Wine Bottle Opener", 1],
  ["Ironing Board", 1], ["Drying Rack", 1], ["Hanger Set", 2], ["Chopping Board", 1], ["Kitchen Towels", 2],
  ["Napkin Rings", 4], ["Table Napkins", 4], ["Mugs", 4],
]);
const APPLIANCES = mk([
  ["Microwave", 1], ["TV 65”", 1], ["Electric Kettle", 1], ["Fridge", 1], ["Washing Machine", 1],
  ["Iron", 1], ["Hair Dryer", 1], ["Coffee Machine", 1],
]);
const DTCM = mk([
  ["Safety Box", 1], ["Prayer Mat", 1, "pend"], ["Smart Lock (Supply & Install – Oji EVO or other)", 1, "pend"],
  ["First Aid Kit", 1], ["Ash Tray", 1], ["Weighing Scale", 1],
]);

const sec = (title: string, items: ChecklistItem[], notesLabel = ALT): ChecklistSection => ({ code: "", title, notesLabel, items });

/** Bedrooms, maid's room for a unit type. Unknown / null falls back to 2 Bedroom. */
const layoutOf = (unitType: string | null | undefined) => {
  const t = (unitType ?? "").trim().toLowerCase();
  if (t === "studio") return { studio: true, beds: 0, maid: false };
  const m = t.match(/^(\d)\s*bedroom(\s*\+\s*maid)?$/);
  if (!m) return { studio: false, beds: 2, maid: false };
  return { studio: false, beds: Number(m[1]), maid: !!m[2] };
};

/**
 * Default FF&E sections for a unit type: every bedroom is its own section.
 * One guest room is "Guest Bedroom"; two or more are numbered from 1.
 */
const layoutSections = (unitType: string | null | undefined): ChecklistSection[] => {
  const { studio, beds, maid } = layoutOf(unitType);
  const rooms: ChecklistSection[] = [];
  if (studio) rooms.push(sec("Sleeping Area", SLEEPING));
  else {
    rooms.push(sec("Master Bedroom", MASTER));
    const guests = Math.max(0, beds - 1);
    for (let g = 1; g <= guests; g++) rooms.push(sec(guests === 1 ? "Guest Bedroom" : `Guest Bedroom ${g}`, GUEST));
    if (maid) rooms.push(sec("Maid's Room", MAID));
  }
  return [
    sec("Living & Dining", LIVING), ...rooms, sec("Bathroom", BATH), sec("Kitchenware & Tabletop", KITCHEN),
    sec("Appliances", APPLIANCES), sec("Safety, Access & Compliance (DTCM & Other)", DTCM, "Location / Spec Notes"),
  ];
};

/** Fresh, editable FF&E sections for a unit type. Codes are not stored: the number is the section's position. */
export const sectionsForLayout = (unitType: string | null): FfeSection[] =>
  layoutSections(unitType).map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, required: "", notes: "" })) }));

export interface BriefHeader {
  account: string; primary: string; property: string; unit: string; size: string; rooms: string; outdoor: string;
  projectType: string; projectTypeOther: string; urgency: string; budget: string; contract: string[];
}
export interface BriefStyle {
  vision: string; special: string; primaryStyle: string; primaryOther: string; accents: string[];
  accentNotes: string; refs: string; dislikes: string; outputs: string[];
}
export interface ColourRow { zone: string; base: string; accent: string; saturation: string; notes: string }
export interface FfeItem {
  item: string; std: string; included: Included; required: string; notes: string;
  /** Set on anything a user added; standard checklist items leave it unset. */
  custom?: boolean;
  /** Original checklist name of a standard item that has been renamed, so "Restore" does not re-add it. */
  origin?: string;
}
export interface FfeSection { code: string; title: string; notesLabel: string; items: FfeItem[]; custom?: boolean }

export const blankFfeItem = (): FfeItem => ({ item: "", std: "", included: "inc", required: "", notes: "", custom: true });
export const blankFfeSection = (title: string): FfeSection => ({
  code: "", title, notesLabel: ALT, items: [blankFfeItem()], custom: true,
});

const norm = (v: string) => v.trim().toLowerCase();

const sameName = (a: string, b: string) => norm(a) === norm(b);

/** Layout sections absent from the document, matched by trimmed, case-insensitive name. */
export const missingLayoutSections = (ffe: FfeSection[], unitType: string | null): FfeSection[] =>
  sectionsForLayout(unitType).filter((l) => !ffe.some((s) => sameName(s.title, l.title)));

/** Append missing layout sections. Never deletes, renames or reorders, and never touches existing items. */
export const addMissingSections = (ffe: FfeSection[], unitType: string | null): FfeSection[] =>
  [...ffe, ...missingLayoutSections(ffe, unitType)];

/**
 * Re-add any standard item missing from a standard section of this unit's layout (matched by section name),
 * and any missing layout section. Never touches existing or custom items.
 */
export const restoreStandardFfe = (ffe: FfeSection[], unitType: string | null): FfeSection[] => {
  const out = ffe.map((s) => ({ ...s, items: [...s.items] }));
  for (const std of layoutSections(unitType)) {
    const sec = out.find((s) => !s.custom && sameName(s.title, std.title));
    if (!sec) { out.push({ ...std, items: std.items.map((i) => ({ ...i, required: "", notes: "" })) }); continue; }
    const present = new Set(sec.items.filter((i) => !i.custom).flatMap((i) => [norm(i.item), norm(i.origin ?? "")]));
    for (const i of std.items) if (!present.has(norm(i.item))) sec.items.push({ ...i, required: "", notes: "" });
  }
  return out;
};
/** Retained only for historic briefs: the `bedrooms` column is no longer written or shown. Bedrooms are FF&E sections now. */
export interface BedroomRow { bedroom: string; size: string; headboard: string; lighting: string; notes: string }
export interface BriefLists { existing: string[]; issues: string[]; queries: string[] }
export interface BriefAttachments { floorPlan: boolean; siteVisit: boolean }

export interface BriefDoc {
  header: BriefHeader; style: BriefStyle; colours: ColourRow[]; ffe: FfeSection[];
  lists: BriefLists; attachments: BriefAttachments;
}

interface LeadLike {
  name?: string | null; property?: string | null; building?: string | null; unit_type?: string | null;
  size?: string | null; budget?: number | string | null;
}

export const blankBrief = (lead: LeadLike): BriefDoc => ({
  header: {
    account: lead.name ?? "", primary: "", property: lead.property ?? lead.building ?? "",
    unit: lead.unit_type ?? "", size: lead.size ?? "", rooms: "", outdoor: "", projectType: "New Fit-Out",
    projectTypeOther: "", urgency: "", budget: lead.budget != null ? String(lead.budget) : "", contract: [],
  },
  style: {
    vision: "", special: "", primaryStyle: "", primaryOther: "", accents: [], accentNotes: "", refs: "",
    dislikes: "", outputs: [],
  },
  colours: ZONES.map((zone) => ({ zone, base: "", accent: "", saturation: "", notes: "" })),
  // Generated from the unit type only here, when the brief is first created — never silently afterwards.
  ffe: sectionsForLayout(lead.unit_type ?? null),
  lists: { existing: [], issues: [], queries: [] },
  attachments: { floorPlan: false, siteVisit: false },
});

/** Merge a stored (possibly partial) document over the blank one so old/empty rows never crash the editor. */
export const normaliseBrief = (
  stored: Partial<Record<keyof BriefDoc, unknown>>,
  lead: LeadLike,
): BriefDoc => {
  const b = blankBrief(lead);
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as object) : null);
  const arr = (v: unknown) => (Array.isArray(v) && v.length ? v : null);
  const h = obj(stored.header);
  const s = obj(stored.style);
  const l = obj(stored.lists);
  const a = obj(stored.attachments);
  return {
    header: h && Object.keys(h).length ? { ...b.header, ...h } : b.header,
    style: s ? { ...b.style, ...s } : b.style,
    colours: (arr(stored.colours) as ColourRow[]) ?? b.colours,
    ffe: (arr(stored.ffe) as FfeSection[]) ?? b.ffe,
    lists: l ? { ...b.lists, ...l } : b.lists,
    attachments: a ? { ...b.attachments, ...a } : b.attachments,
  };
};
