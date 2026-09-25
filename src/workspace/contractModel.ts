import { sectionsForLayout } from "./briefSchema";
import { UNIT_TYPES } from "./constants";
import type { ItemGroup } from "./proposalModel";

/* ---------------- document shape (stored in contracts.doc) ---------------- */

export interface CItem { id: string; item: string; qty: string }
export interface CSection { id: string; title: string; items: CItem[] }
/** key marks the two structural clauses (2 Delivery, 3 Purchase Price) — they can't be deleted. */
export interface Clause { id: string; key?: "delivery" | "price"; title: string; body: string }

export interface ContractDocument {
  v: 1;
  client: string; unit: string; building: string; project: string;
  unitType: string; useType: string;
  date: string; deliveryDays: string;
  vatCharged: boolean; subtotal: number;
  deposit: number; delivery: number;
  optionLabel: string | null;
  sections: CSection[];
  clauses: Clause[];
}

export const CONTRACT_UNIT_TYPES = UNIT_TYPES;
export const USE_TYPES = ["End User", "Holiday Home"];
export const SELLER = "Aziza Home L.L.C-FZ";
export const DEFAULT_DELIVERY_DAYS = "8–12";
export const SIGNATURE_COPY = {
  sig: "The Parties agree to the terms and conditions set forth above as demonstrated by their signatures as follows:",
  buyer: "Buyer",
  seller: "Seller",
  signed: "Signed",
  name: "Name",
  date: "Date",
} as const;

const id = () => crypto.randomUUID();

export const STANDARD_CLAUSES: Omit<Clause, "id">[] = [
  { key: "delivery", title: "Delivery", body: "The Seller shall deliver the Goods & Service to the Buyer in {deliveryDays} business days, counted from the date the Seller receives the key of the designated apartment and the Move In Permit from the developer. The Goods shall be deemed delivered when the Buyer has accepted delivery at the above-referenced location." },
  { key: "price", title: "Purchase Price & Payments", body: "The price includes design, procurement, delivery, installation and styling, handed over move-in ready." },
  { title: "Risk of Loss", body: "Risk of loss will be on the Seller until the time when the Buyer accepts delivery. The Seller shall maintain any and all necessary insurance in order to insure the Goods against loss at the Seller's own expense." },
  { title: "Title", body: "Title to the Goods will remain with the Seller until the Buyer pays the remaining {balancePct}% of the purchase price." },
  { title: "Excuse for Delay or Failure to Perform", body: "The Seller will not be liable to the Buyer for any delay, non-delivery or default of this Agreement due to labor disputes, transportation shortage, delay or shortage of materials to produce the Goods, fires, accidents, Acts of God, or any other causes outside of the Seller's control. The Seller shall notify the Buyer immediately upon realization that it will not be able to deliver the Goods as promised. Either Party may terminate this Agreement upon such notice." },
  { title: "Limitation of Liability", body: "UNDER NO CIRCUMSTANCES SHALL EITHER PARTY BE LIABLE TO THE OTHER PARTY OR ANY THIRD PARTY FOR ANY DAMAGES RESULTING FROM ANY PART OF THIS AGREEMENT SUCH AS, BUT NOT LIMITED TO, LOSS OF REVENUE OR ANTICIPATED PROFIT OR LOST BUSINESS, COSTS OF DELAY OR FAILURE OF DELIVERY, WHICH ARE NOT RELATED TO OR THE DIRECT RESULT OF A PARTY'S NEGLIGENCE OR BREACH." },
  { title: "Legal and Binding Agreement", body: "This Agreement is legal and binding between the Parties as stated above. This Agreement may be entered into and is legal and binding in the UAE. The Parties each represent that they have the authority to enter into this Agreement." },
  { title: "Governing Law and Jurisdiction", body: "The Parties agree that this Agreement shall be governed by the State and/or Country in which both Parties do business. In the event that the Parties do business in different States and/or Countries, this Agreement shall be governed by UAE law." },
  { title: "Entire Agreement", body: "The Parties acknowledge and agree that this Agreement represents the entire agreement between the Parties. In the event that the Parties desire to change, add, or otherwise modify any terms, they shall do so in writing to be signed by both Parties." },
];
export const standardClauses = (): Clause[] => STANDARD_CLAUSES.map((c) => ({ ...c, id: id() }));

/* ---------------- item templates ---------------- */

const fromBrief = (unitType: string) =>
  sectionsForLayout(unitType).map((s) => ({
    title: s.title,
    items: s.items.filter((i) => i.included === "inc").map((i) => ({ item: i.item, qty: i.std })),
  }));
const briefSection = (title: string) => fromBrief("2 Bedroom").find((s) => s.title === title)?.items ?? [];

/** The "+ Add category…" picker. Wall Design and Balcony item lists are placeholders until Veronica sends the generator's own. */
export const CATEGORIES: { title: string; items: () => { item: string; qty: string }[] }[] = [
  { title: "Living Essentials", items: () => briefSection("Living & Dining") },
  { title: "DTCM Holiday Home Requirements", items: () => fromBrief("2 Bedroom").slice(-1)[0].items.concat(
    [{ item: "Prayer Mat", qty: "1" }, { item: "Smart Lock", qty: "1" }]) },
  { title: "Wall Design", items: () => [{ item: "Feature Wall", qty: "1" }, { item: "Wall Art Décor", qty: "1" }] },
  { title: "Appliances", items: () => briefSection("Appliances") },
  { title: "Kitchen", items: () => briefSection("Kitchenware & Tabletop") },
  { title: "Balcony", items: () => [{ item: "Balcony Set – 2-Seater", qty: "1" }] },
  { title: "Custom Section", items: () => [{ item: "", qty: "1" }] },
];
export const makeSection = (title: string, items: { item: string; qty: string }[]): CSection =>
  ({ id: id(), title, items: items.map((i) => ({ id: id(), item: i.item, qty: String(i.qty) })) });
export const templateFor = (unitType: string): CSection[] => fromBrief(unitType || "2 Bedroom").map((s) => makeSection(s.title, s.items));
export const newItem = (): CItem => ({ id: id(), item: "", qty: "1" });
export const newClause = (): Clause => ({ id: id(), title: "New clause", body: "" });

/* ---------------- prefill ---------------- */

const mapUnitType = (t: string | null) => {
  const s = (t ?? "").trim().toLowerCase();
  return CONTRACT_UNIT_TYPES.find((u) => u.toLowerCase() === s) ?? (t?.trim() || "");
};
const mapUse = (u: string | null) => (/holiday|short/i.test(u ?? "") ? "Holiday Home" : "End User");

export const buildContract = (v: {
  lead: { name: string; unit_type: string | null; building: string | null; property: string | null; use_type: string | null };
  unit: string | null;
  option: { label: string; amount: number } | null;
  vat: number; down: number;
  groups: ItemGroup[];
}): ContractDocument => ({
  v: 1,
  client: v.lead.name,
  unit: v.unit ?? "",
  building: v.lead.building ?? "",
  project: v.lead.property ?? "",
  unitType: mapUnitType(v.lead.unit_type),
  useType: mapUse(v.lead.use_type),
  date: new Date().toISOString().slice(0, 10),
  deliveryDays: DEFAULT_DELIVERY_DAYS,
  vatCharged: v.vat > 0,
  subtotal: Number(v.option?.amount) || 0,
  deposit: Number.isFinite(v.down) ? v.down : 80,
  delivery: 0,
  optionLabel: v.option?.label ?? null,
  sections: v.groups.filter((g) => g.items.length).map((g) => makeSection(g.room, g.items.map((i) => ({ item: i.item, qty: String(i.qty) })))),
  clauses: standardClauses(),
});

/* ---------------- maths & sentences ---------------- */

export const aedWhole = (n: number) => `AED ${Math.round(n).toLocaleString("en-US")}`;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export const contractMoney = (d: ContractDocument) => {
  const subtotal = Math.max(0, Number(d.subtotal) || 0);
  const vat = d.vatCharged ? subtotal * 0.05 : 0;
  const total = subtotal + vat;
  const dep = clamp(Number(d.deposit), 0, 100);
  const del = clamp(Number(d.delivery), 0, 100 - dep);
  const bal = 100 - dep - del;
  // Amounts are whole dirhams; handover takes the rounding remainder so the three always sum to the total.
  const T = Math.round(total);
  const depA = Math.round(total * dep / 100);
  const delA = Math.round(total * del / 100);
  return { subtotal, vat, total, dep, del, bal, depA, delA, balA: T - depA - delA };
};

export const priceSentence = (d: ContractDocument) => {
  const m = contractMoney(d);
  return d.vatCharged
    ? `The Seller agrees to sell the Goods to the Buyer for a total amount of ${aedWhole(m.subtotal)} + 5% VAT (${aedWhole(m.vat)}) = ${aedWhole(m.total)}.`
    : `The Seller agrees to sell the Goods to the Buyer for a total amount of ${aedWhole(m.total)}; the 5% VAT is waived by the Seller.`;
};
export const paymentSentence = (d: ContractDocument) => {
  const m = contractMoney(d);
  return m.del > 0
    ? `${m.dep}% of that amount, ${aedWhole(m.depA)}, shall be paid as downpayment on signing; ${m.del}%, ${aedWhole(m.delA)}, on delivery; and the remaining ${m.bal}%, ${aedWhole(m.balA)}, on handover.`
    : `${m.dep}% of that amount, ${aedWhole(m.depA)}, shall be paid as downpayment on signing; the Buyer shall pay the remaining ${m.bal}%, ${aedWhole(m.balA)}, on handover.`;
};
export const fillClause = (body: string, d: ContractDocument) =>
  body.replace(/\{deliveryDays\}/g, d.deliveryDays || DEFAULT_DELIVERY_DAYS).replace(/\{balancePct\}/g, String(contractMoney(d).bal));

export const projectLabel = (d: ContractDocument) =>
  [d.building, d.project].map((s) => s.trim()).filter((s, i, a) => s && a.indexOf(s) === i).join(", ");

/** Generator pre-flight: what's missing before printing. */
export const preflight = (d: ContractDocument) => {
  const out: string[] = [];
  if (!d.client.trim()) out.push("client name");
  if (!d.unit.trim()) out.push("unit number");
  if (!projectLabel(d)) out.push("building / project");
  if (!(contractMoney(d).total > 0)) out.push("total");
  const blanks = d.sections.reduce((n, s) => n + s.items.filter((i) => !i.item.trim()).length, 0);
  if (blanks) out.push(`${blanks} blank item description${blanks > 1 ? "s" : ""}`);
  return out;
};
