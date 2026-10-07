/**
 * "Item type" — a DISPLAY / REPORTING grouping only ("show me all the wall art on this project").
 *
 * This must NEVER feed a buying band. Buying runs are owned solely by ws_ffe_band / ws_ffe_kind in the
 * database; this is a coarser lens at a different granularity and may disagree with them on purpose.
 * Do not import it from band logic (ffeQueries bandOf / PRIORITY_BANDS).
 *
 * Matching: lower-case, accents stripped, a trailing locator phrase removed ("wall art above sofa" → "wall art",
 * the same trick the database uses), then buckets are tried in order — first match wins; the order is what
 * keeps "bedroom rug" out of Beds, "coffee machine" out of Tables, etc.
 */
type Bucket = { label: string; terms: string[]; not?: RegExp };

const BUCKETS: Bucket[] = [
  { label: "Bulbs", terms: ["bulb"] },
  { label: "Wall design & panelling", terms: ["wall design", "bed head wall", "bedhead wall", "bed head", "bedhead", "fluted panel", "panelling", "paneling", "joinery", "built-in", "built in", "feature wall"] },
  { label: "Wallpaper", terms: ["wallpaper", "wall paper"] },
  // "bed frame" / "frame bed" is a bed, not a picture frame.
  { label: "Wall art", terms: ["wall art", "artwork", "art decor", "print", "poster", "frame"], not: /\bbed\b.*\bframe|\bframe\b.*\bbed\b/ },
  // "wardrobe with full length mirror" is a wardrobe; the mirror is a feature of it.
  { label: "Mirrors", terms: ["mirror"], not: /wardrobe|closet|cabinet|dresser|vanity|sideboard/ },
  { label: "Ceiling lights", terms: ["ceiling pendant", "ceiling light", "chandelier", "pendant"] },
  { label: "Wall lights", terms: ["wall lamp", "wall sconce", "sconce"] },
  { label: "Floor lamps", terms: ["floor lamp"] },
  { label: "Table & bedside lamps", terms: ["table lamp", "nightstand lamp", "bedside lamp", "desk lamp"] },
  { label: "Curtains", terms: ["curtain", "sheer", "blind", "drape"] },
  { label: "Rugs & carpets", terms: ["rug", "carpet"] },
  { label: "Bedding", terms: ["bedding", "comforter", "duvet", "pillow", "sheet set", "mattress protector", "throw"] },
  { label: "Cushions", terms: ["cushion"] },
  { label: "Linen & towels", terms: ["towel", "linen", "bath mat"] },
  { label: "Appliances", terms: ["fridge", "refrigerator", "freezer", "washing machine", "washer", "dryer", "hair dryer", "dishwasher", "microwave", "oven", "cooker", "hob", "stove", "kettle", "coffee machine", "coffee maker", "toaster", "blender", "air fryer", "iron", "vacuum", "water dispenser"], not: /\bironing board/ },
  // "tv unit" is furniture (Cabinetry below).
  { label: "TVs & electronics", terms: ["tv", "television"], not: /\btv (unit|stand|cabinet|console)/ },
  // "ash tray" is household.
  { label: "Kitchenware & tableware", terms: ["cookware", "cutlery", "dinner set", "mug", "plate", "bowl", "glass", "knife", "knives", "utensil", "chopping board", "colander", "peeler", "grater", "opener", "napkin", "placemat", "tray", "kitchenware", "tableware"], not: /\bash ?tray/ },
  { label: "Safety & compliance", terms: ["first aid", "safety box", "fire extinguisher", "fire blanket", "smoke"] },
  { label: "Household & laundry", terms: ["drying rack", "ironing board", "hanger", "bin", "trash", "waste", "scale", "soap", "dispenser", "amenities", "toilet brush", "ash tray", "ashtray"] },
  { label: "Plants & decorative", terms: ["plant", "flower", "vase", "decorative", "decor", "candle", "sculpture", "ornament"] },
  { label: "Switches & sockets", terms: ["switch", "switches", "socket"] },
  { label: "Beds & mattresses", terms: ["bed", "mattress", "bunk", "headboard"] },
  { label: "Nightstands", terms: ["nightstand", "bedside table"] },
  { label: "Wardrobes, dressers & cabinetry", terms: ["dresser", "wardrobe", "closet", "cabinet", "tv unit", "sideboard", "shelf", "shelves", "shlef", "console", "vanity", "shoe rack", "chest of drawers"] },
  { label: "Sofas & armchairs", terms: ["sofa", "sectional", "couch", "armchair", "accent chair", "ottoman", "lounger"] },
  // "desk chair" is a chair.
  { label: "Tables & desks", terms: ["coffee table", "dining table", "side table", "desk", "table"], not: /\b(chair|stool)s?\b/ },
  { label: "Chairs & stools", terms: ["chair", "stool", "bench", "benches"] },
  { label: "Outdoor & balcony", terms: ["balcony set", "patio set", "outdoor set"] },
];
export const OTHER_TYPE = "Other";
export const ITEM_TYPES = [...BUCKETS.map((b) => b.label), OTHER_TYPE];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const COMPILED = BUCKETS.map((b) => ({ ...b, re: new RegExp(`\\b(${b.terms.map(esc).join("|")})(e?s)?\\b`) }));

export const normaliseItem = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\s+(above|over|for|behind|beside)\s.*$/i, "").trim();

export const itemType = (name: string | null | undefined): string => {
  const n = normaliseItem(name ?? "");
  return COMPILED.find((b) => b.re.test(n) && !(b.not && b.not.test(n)))?.label ?? OTHER_TYPE;
};

/** Groups in ITEM_TYPES order, empty ones dropped; inside a bucket by room then sheet order (like byBand). */
export const byItemType = <R extends { item: string; room: string; sort_order: number }>(rows: R[]): [string, R[]][] =>
  ITEM_TYPES.map((t) => [t, rows.filter((r) => itemType(r.item) === t)
    .sort((a, z) => a.room.localeCompare(z.room) || a.sort_order - z.sort_order)] as [string, R[]]).filter(([, l]) => l.length);
