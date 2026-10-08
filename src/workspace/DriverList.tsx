import { useMemo, useState } from "react";
import { Copy, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "./projectQueries";
import { DONE_STAGES, PRIORITY_BANDS, bandOf, useSuppliers, type FfeRow, type Supplier } from "./ffeQueries";
import { shortDate, todayISO } from "./format";

/** Buying run 6 — every Dragon Mart shop, wall and building material included (ws_ffe_band). */
const PICKUP_BAND = PRIORITY_BANDS.indexOf("Dragon Mart pick-up") + 1;
const PRE_ORDER = ["Awaiting Quote", "Quote Received", "Negotiation", "Awaiting Approval", "Payment Required"];

const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ""));

type Line = { item: string; detail: string; qty: number; unit: string; notOrdered: boolean };
type Shop = { name: string; phones: string[]; lines: Line[] };

/**
 * Pick-up run for the driver: one block per shop with its phone number(s) and a tick-box per item.
 * Same item + size from one shop is merged into one line with the total quantity, so the driver counts
 * pieces once. No prices, rooms or client details — the message goes to an outside driver.
 */
export const buildDriverList = (project: Pick<Project, "code" | "property" | "unit" | "location">, rows: FfeRow[], suppliers: Supplier[], withUnordered: boolean): { text: string; shops: number; pieces: number } => {
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const shops = new Map<string, Shop>();
  for (const r of rows) {
    if (r.review || DONE_STAGES.includes(r.stage)) continue;
    const notOrdered = PRE_ORDER.includes(r.stage);
    if (notOrdered && !withUnordered) continue;
    const sup = r.supplier_id ? byId.get(r.supplier_id) : undefined;
    const name = sup?.name?.trim() || r.supplier_name?.trim() || "No shop yet";
    const shop = shops.get(name.toLowerCase()) ?? { name, phones: [], lines: [] };
    // The supplier book's number wins; the item's own contact only fills in when the book has none
    // (item contacts are often copied from another row and would send the driver to the wrong shop).
    const booked = [sup?.phone, sup?.contact].filter((p) => p?.trim());
    for (const p of booked.length ? booked : [r.supplier_contact]) {
      const v = p?.trim();
      if (v && /\d{6,}/.test(v.replace(/\D/g, "")) && !shop.phones.includes(v)) shop.phones.push(v);
    }
    const detail = [r.dims, r.spec].map((p) => p?.trim()).filter(Boolean).join(" · ");
    const qty = Number(r.qty) || 1;
    const same = shop.lines.find((l) => l.item.toLowerCase() === r.item.trim().toLowerCase() && l.detail === detail && l.unit === (r.unit ?? ""));
    if (same) { same.qty += qty; same.notOrdered ||= notOrdered; }
    else shop.lines.push({ item: r.item.trim(), detail, qty, unit: r.unit ?? "", notOrdered });
    shops.set(name.toLowerCase(), shop);
  }
  const list = [...shops.values()].sort((a, b) => a.name.localeCompare(b.name));
  const pieces = list.reduce((n, s) => n + s.lines.reduce((m, l) => m + l.qty, 0), 0);
  const dest = [project.property, project.unit, project.location].map((p) => p?.trim()).filter(Boolean).join(", ");
  const out: string[] = [
    `*Dragon Mart pick-up — ${project.code}*`,
    `${shortDate(todayISO())} · ${list.length} shop${list.length === 1 ? "" : "s"} · ${qtyText(pieces)} piece${pieces === 1 ? "" : "s"}`,
  ];
  if (dest) out.push(`Deliver to: ${dest}`);
  list.forEach((s, i) => {
    out.push("", `*${i + 1}. ${s.name}*${s.phones.length ? ` — 📞 ${s.phones.join(" / ")}` : " — no number saved"}`);
    for (const l of s.lines) {
      out.push(`☐ ${l.item} × ${qtyText(l.qty)}${l.unit ? ` ${l.unit}` : ""}${l.detail ? ` (${l.detail})` : ""}${l.notOrdered ? " — not ordered yet, call first" : ""}`);
    }
  });
  out.push("", "Check every piece and count before leaving each shop. Send a photo of the loaded items.");
  return { text: out.join("\n"), shops: list.length, pieces };
};

export const DriverListButton = ({ project, rows }: { project: Project; rows: FfeRow[] }) => {
  const [open, setOpen] = useState(false);
  const [withUnordered, setWithUnordered] = useState(true);
  const { data: suppliers = [] } = useSuppliers();
  const pickup = useMemo(() => rows.filter((r) => bandOf(r) === PICKUP_BAND), [rows]);
  const list = useMemo(() => buildDriverList(project, pickup, suppliers, withUnordered), [project, pickup, suppliers, withUnordered]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(list.text); toast.success("Driver list copied — paste it into WhatsApp"); }
    catch { toast.error("Could not copy — select the text and copy it by hand"); }
  };
  return (
    <>
      <Button size="sm" variant="outline" disabled={!pickup.length} title={pickup.length ? "Dragon Mart pick-up list for the driver" : "No Dragon Mart pick-up items"}
        onClick={() => setOpen(true)}>
        <Truck className="mr-1 h-3.5 w-3.5" />Driver list
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dragon Mart pick-up — driver list</DialogTitle>
            <DialogDescription>
              {list.shops} shop{list.shops === 1 ? "" : "s"}, {qtyText(list.pieces)} pieces, grouped by shop with phone numbers. No prices or client details. Delivered, closed and on-hold items are left out.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={withUnordered} onCheckedChange={(v) => setWithUnordered(v === true)} />
            Include items not ordered yet (marked "call first")
          </label>
          <Textarea readOnly value={list.text} className="h-80 font-mono text-xs" aria-label="Driver list" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(list.text)}`} target="_blank" rel="noreferrer">Open in WhatsApp</a>
            </Button>
            <Button size="sm" onClick={copy} disabled={!list.shops}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
