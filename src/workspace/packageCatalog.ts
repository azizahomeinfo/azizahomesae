import { sectionsForLayout } from "./briefSchema";
import { DEFAULT_IMAGES_NOTE, DEFAULT_TERMS, newId, type ItemGroup, type ProposalDocument } from "./proposalModel";

/**
 * The 2026 Design Style Catalog & Price List as data, for proposals sales make without a designer.
 * Photos are served with the site (public/catalog/<slug>/{hero,essential,premium,luxury}.jpeg), not from
 * storage, so they cost nothing on Lovable Cloud. Prices must match package_prices in the database
 * (ws_package_price), which is what the GM's price floor is checked against.
 */

export const TIERS = ["Essential", "Premium", "Luxury"] as const;
export type Tier = (typeof TIERS)[number];
export const PACKAGE_LAYOUTS = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"] as const;
export type PackageLayout = (typeof PACKAGE_LAYOUTS)[number];

export const TIER_TEXT: Record<Tier, { line: string; includes: string }> = {
  Essential: { line: "Same aesthetic without wall design",
    includes: "All furniture, decorative wall frames, rugs, lighting and table décor — everything for a complete, stylish home." },
  Premium: { line: "Includes feature wall / wall enhancement",
    includes: "Everything in Essential plus 1 focal feature-wall design and 1–4 wallpaper / paint applications, depending on apartment size." },
  Luxury: { line: "Upgraded wall design and elevated styling",
    includes: "Everything in Essential plus feature-wall design throughout the apartment — the complete luxury transformation." },
};

/** AED, excl. VAT and appliances. Mirror of public.package_prices. */
export const PACKAGE_PRICES: Record<Tier, Record<PackageLayout, number>> = {
  Essential: { Studio: 26000, "1 Bedroom": 34500, "2 Bedroom": 46000, "3 Bedroom": 60500 },
  Premium: { Studio: 30500, "1 Bedroom": 42000, "2 Bedroom": 63500, "3 Bedroom": 84000 },
  Luxury: { Studio: 52500, "1 Bedroom": 76000, "2 Bedroom": 98500, "3 Bedroom": 115000 },
};

export const STYLES = [
  { slug: "japandi", name: "Japandi", tagline: "Warm neutral — minimal styling — timeless comfort" },
  { slug: "aura", name: "Aura", tagline: "Soft curves — natural warmth — elegance" },
  { slug: "terra", name: "Terra", tagline: "Earthy — layered — harmonious" },
  { slug: "modern-elite", name: "Modern Elite", tagline: "Sleek — refined — sophisticated" },
  { slug: "prestige", name: "Prestige", tagline: "Bold — elevated — luxurious" },
  { slug: "regal", name: "Regal", tagline: "Tailored — polished — modern" },
  { slug: "minimalistic", name: "Minimalistic", tagline: "Serene — balanced — effortless" },
  { slug: "halo", name: "Halo", tagline: "Airy — soft — inviting" },
] as const;
export type StyleSlug = (typeof STYLES)[number]["slug"];

export const catalogImage = (slug: string, which: "hero" | Lowercase<Tier>) => `/catalog/${slug}/${which}.jpeg`;
/** Catalog photos are site files, not storage objects: use them as they are. */
export const isCatalogPath = (p: string | null | undefined) => !!p && p.startsWith("/catalog/");

export const tierLabel = (t: Tier) => `Aziza ${t}`;
export const tierOfLabel = (label: string): Tier | null => TIERS.find((t) => label.trim().toLowerCase() === tierLabel(t).toLowerCase()) ?? null;

/** Price-list layout for a lead's unit type. Larger units price from the 3-bedroom row (flagged in the UI). */
export const packageLayoutFor = (unitType: string | null | undefined): { layout: PackageLayout; approximate: boolean } => {
  const t = (unitType ?? "").toLowerCase();
  if (t.startsWith("studio")) return { layout: "Studio", approximate: false };
  const n = Number(t.match(/^(\d)/)?.[1] ?? 0);
  if (n === 1) return { layout: "1 Bedroom", approximate: false };
  if (n === 2) return { layout: "2 Bedroom", approximate: false };
  if (n === 3 && !/maid/.test(t)) return { layout: "3 Bedroom", approximate: false };
  if (n >= 3) return { layout: "3 Bedroom", approximate: true };
  return { layout: "2 Bedroom", approximate: true };
};

export const packagePrice = (tier: Tier, layout: PackageLayout) => PACKAGE_PRICES[tier][layout];

/** The standard item list for the unit, as proposal item groups (sales edits it freely). */
const standardItems = (unitType: string | null): ItemGroup[] =>
  sectionsForLayout(unitType).map((s) => ({
    room: s.title.replace(/\s*\([^)]*\)\s*$/, ""),
    items: s.items.filter((i) => i.included === "inc").map((i) => ({ item: i.item, qty: parseInt(i.std, 10) || 1 })),
  })).filter((g) => g.items.length);

/** units: identical apartments priced together — each price is the unit price × units; the item list stays per unit. */
export interface PackageChoice { style: StyleSlug; tiers: Tier[]; layout: PackageLayout; units: number }

/** A complete proposal from the catalog: style photos, one page per tier offered, standard items, list prices. */
export const buildPackageDocument = (v: {
  lead: { name: string; property: string | null; building: string | null; location: string | null; unit_type: string | null };
  choice: PackageChoice;
}): ProposalDocument => {
  const style = STYLES.find((s) => s.slug === v.choice.style) ?? STYLES[0];
  const tiers = TIERS.filter((t) => v.choice.tiers.includes(t));
  const unit = v.lead.unit_type?.trim() || v.choice.layout;
  const units = Math.max(1, Math.round(v.choice.units || 1));
  const many = units > 1 ? ` × ${units} units` : "";
  return {
    v: 2,
    source: "package",
    pkg: { style: style.slug, layout: v.choice.layout, tiers, units },
    designId: null, designVersion: null, quoteVersion: null,
    cover: {
      client: v.lead.name,
      scope: (tiers.length === 1 ? `${tierLabel(tiers[0])} · ${style.name}` : `${style.name} · ${tiers.map((t) => t).join(" / ")}`) + (units > 1 ? ` · ${units} units` : ""),
      location: [v.lead.property ?? v.lead.building, v.lead.location].filter(Boolean).join(", "),
      date: new Date().toISOString().slice(0, 10),
      validity: "14 days",
      intro: units > 1
        ? `A turnkey ${style.name} furnishing package for your ${units} × ${unit} apartments${v.lead.property ? ` at ${v.lead.property}` : ""} — furniture, décor, delivery, installation and styling, each handed over ready to live in. The item list is per apartment.`
        : `A turnkey ${style.name} furnishing package for your ${unit}${v.lead.property ? ` at ${v.lead.property}` : ""} — furniture, décor, delivery, installation and styling, handed over ready to live in.`,
      hero: catalogImage(style.slug, "hero"),
    },
    floorPlan: { path: null, name: null, text: "" },
    pages: [
      { id: newId(), area: null, title: `${style.name} — your design direction`,
        desc: `${style.tagline.charAt(0).toUpperCase()}${style.tagline.slice(1)}. Every piece — furniture, lighting, art and styling — is curated to this aesthetic and installed ready to live in.`,
        images: [{ path: catalogImage(style.slug, "hero"), caption: null }] },
      ...tiers.map((t) => ({
        id: newId(), area: null, title: tierLabel(t),
        desc: `${TIER_TEXT[t].line}. ${TIER_TEXT[t].includes}`,
        images: [{ path: catalogImage(style.slug, t.toLowerCase() as Lowercase<Tier>), caption: null }],
      })),
    ],
    moodBoard: [],
    itemList: standardItems(v.lead.unit_type),
    investment: {
      options: tiers.map((t) => ({ label: tierLabel(t),
        desc: `${style.name} · ${v.choice.layout}${many} · ${TIER_TEXT[t].line.toLowerCase()}`,
        amount: packagePrice(t, v.choice.layout) * units })),
      vat: 5, down: 80, terms: DEFAULT_TERMS,
    },
    toggles: { floorPlan: false, moodBoard: false, itemList: true, investment: true, combine: null },
    imagesNote: DEFAULT_IMAGES_NOTE,
    finalAt: null,
  };
};
