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

export const FFE_CHECKLIST: ChecklistSection[] = [
  {
    code: "5.1", title: "Living / Dining Room", notesLabel: ALT,
    items: mk([
      ["Sofa", 1], ["Wall Art Above Sofa", 1], ["Floor Lamp", 1], ["TV Unit", 1], ["Coffee Table", 1],
      ["Dining Table", 1], ["Dining Chairs", 4], ["Ceiling Pendant Above Sofa", 1], ["Rug (Living)", 1],
      ["Faux Plant w/ Pot", 1], ["Full Length Mirror", 1], ["Curtain w/ Sheer (Living)", "1 set"],
      ["Balcony Set – 2-Seater", 1],
    ]),
  },
  {
    code: "5.2", title: "Bedrooms (aggregate for all bedrooms)", notesLabel: ALT,
    items: mk([
      ["King Bed + Mattress 1.8m", 1], ["Double Bed + Mattress", 1], ["Nightstands", 3], ["Ceiling Pendants", 2],
      ["Wall Lamps", 2], ["Desk Lamp", 1], ["Dresser + Ottoman + Mirror", 2], ["Bedroom Rugs", 2],
      ["Curtains w/ Sheer (Bedrooms)", "2 sets"], ["Wall Art Décor (Bedrooms)", 3], ["Pillows (Sleeping)", 12],
      ["Comforters", 3], ["Decorative Cushions on Beds", 4], ["Throws", 3], ["Bedding Sets (sheet + cases)", 6],
    ]),
  },
  {
    code: "5.3", title: "Bathrooms", notesLabel: ALT,
    items: mk([["Soap Dispenser Set", 2], ["Trash Can", 2]]),
  },
  {
    code: "5.4", title: "Kitchenware & Tabletop", notesLabel: ALT,
    items: mk([
      ["Cookware Set (10 pcs)", 1], ["Utensil Set", 1], ["Dinner Set for 6", 1], ["Knife Set", 1],
      ["Cutlery Set (24 pcs)", 1], ["Highball Glass", 6], ["Wine Glass", 6], ["Placemat", 4], ["Cutlery Tray", 1],
      ["Colander", 1], ["Peeler", 1], ["Can Opener", 1], ["Steel Grater", 1], ["Wine Bottle Opener", 1],
      ["Ironing Board", 1], ["Drying Rack", 1], ["Hanger Set", 2], ["Chopping Board", 1], ["Kitchen Towels", 2],
      ["Napkin Rings", 4], ["Table Napkins", 4], ["Mugs", 4],
    ]),
  },
  {
    code: "5.5", title: "Appliances", notesLabel: ALT,
    items: mk([
      ["Microwave", 1], ["TV 65”", 1], ["Electric Kettle", 1], ["Fridge", 1], ["Washing Machine", 1],
      ["Iron", 1], ["Hair Dryer", 1], ["Coffee Machine", 1],
    ]),
  },
  {
    code: "5.6", title: "Safety, Access & Compliance (DTCM & Other)", notesLabel: "Location / Spec Notes",
    items: mk([
      ["Safety Box", 1], ["Prayer Mat", 1, "pend"], ["Smart Lock (Supply & Install – Oji EVO or other)", 1, "pend"],
      ["First Aid Kit", 1], ["Ash Tray", 1], ["Weighing Scale", 1],
    ]),
  },
];

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

/** Re-add any standard checklist item missing from the document. Never touches existing or custom items. */
export const restoreStandardFfe = (ffe: FfeSection[]): FfeSection[] => {
  const out = ffe.map((s) => ({ ...s, items: [...s.items] }));
  for (const std of FFE_CHECKLIST) {
    let sec = out.find((s) => !s.custom && s.code === std.code);
    if (!sec) {
      sec = { code: std.code, title: std.title, notesLabel: std.notesLabel, items: [] };
      const at = out.findIndex((s) => s.custom || s.code > std.code);
      out.splice(at === -1 ? out.length : at, 0, sec);
    }
    const present = new Set(sec.items.filter((i) => !i.custom).flatMap((i) => [norm(i.item), norm(i.origin ?? "")]));
    for (const i of std.items) {
      if (!present.has(norm(i.item))) sec.items.push({ ...i, required: "", notes: "" });
    }
  }
  return out;
};
export interface BedroomRow { bedroom: string; size: string; headboard: string; lighting: string; notes: string }
export interface BriefLists { existing: string[]; issues: string[]; queries: string[] }
export interface BriefAttachments { floorPlan: boolean; siteVisit: boolean }

export interface BriefDoc {
  header: BriefHeader; style: BriefStyle; colours: ColourRow[]; ffe: FfeSection[];
  bedrooms: BedroomRow[]; lists: BriefLists; attachments: BriefAttachments;
}

interface LeadLike {
  name?: string | null; property?: string | null; building?: string | null; unit_type?: string | null;
  size?: string | null; budget?: number | string | null;
}

const bedroom = (name: string): BedroomRow => ({ bedroom: name, size: "", headboard: "", lighting: "", notes: "" });

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
  ffe: FFE_CHECKLIST.map((s) => ({
    code: s.code, title: s.title, notesLabel: s.notesLabel,
    items: s.items.map((i) => ({ ...i, required: "", notes: "" })),
  })),
  bedrooms: [bedroom("Master Bed"), bedroom("Guest Bed")],
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
    bedrooms: Array.isArray(stored.bedrooms) && h && Object.keys(h).length ? (stored.bedrooms as BedroomRow[]) : b.bedrooms,
    lists: l ? { ...b.lists, ...l } : b.lists,
    attachments: a ? { ...b.attachments, ...a } : b.attachments,
  };
};
