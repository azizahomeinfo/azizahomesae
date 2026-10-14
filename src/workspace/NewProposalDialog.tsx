import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Palette, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { aedWhole } from "./contractModel";
import {
  STYLES, TIERS, TIER_TEXT, catalogImage, packageLayoutFor, packagePrice, tierLabel,
  type PackageChoice, type StyleSlug, type Tier,
} from "./packageCatalog";

/**
 * Two ways to make a proposal:
 *  1. Involve a designer — the serious, on-budget client: renders and FF&E from the designer, price from the GM.
 *  2. From a package — sales alone, in minutes: a catalog style, the tiers to offer, the price list. Good for
 *     checking the client is aligned before any design work; lower prices go to the GM for approval.
 */
export const NewProposalDialog = ({ open, onOpenChange, lead, design, pending, onDesigner, onPackage }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  lead: { id: string; unit_type: string | null };
  design: { version: number; status: string } | null;
  pending: boolean;
  onDesigner: () => void;
  onPackage: (c: PackageChoice) => void;
}) => {
  const [mode, setMode] = useState<"pick" | "package">("pick");
  const [style, setStyle] = useState<StyleSlug>("japandi");
  const [tiers, setTiers] = useState<Tier[]>(["Premium"]);
  const [units, setUnits] = useState(1);
  const { layout, approximate } = packageLayoutFor(lead.unit_type);
  const toggleTier = (t: Tier) => setTiers((s) => (s.includes(t) ? s.filter((x) => x !== t) : TIERS.filter((x) => s.includes(x) || x === t)));
  const close = (o: boolean) => { onOpenChange(o); if (!o) setMode("pick"); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "pick" ? "New proposal" : "Proposal from a package"}</DialogTitle>
          <DialogDescription>
            {mode === "pick"
              ? "How should this proposal be made?"
              : `Pick the style and the packages to offer. Prices are the ${layout} price list, excl. VAT and appliances; you can edit the item list after.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "pick" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setMode("package")}
              className="space-y-2 rounded-[var(--radius)] border border-border p-4 text-left hover:border-primary hover:bg-primary/5">
              <Palette className="h-5 w-5 text-primary" />
              <p className="font-medium">From a package</p>
              <p className="text-sm text-muted-foreground">You make it now: a catalog style, Essential / Premium / Luxury, the standard item list and the price list. Share the basic price and check the client is aligned.</p>
            </button>
            <div className={cn("space-y-2 rounded-[var(--radius)] border p-4", design ? "border-border" : "border-dashed border-border")}>
              <PencilRuler className="h-5 w-5 text-primary" />
              <p className="font-medium">Involve a designer</p>
              <p className="text-sm text-muted-foreground">For a serious client within budget: a design made for their brief and floor plan, an FF&amp;E list and the GM's quotation.</p>
              {design ? (
                <Button size="sm" onClick={onDesigner} disabled={pending}>{pending ? "Generating…" : `Generate from design V${design.version}`}</Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No design yet. Fill in and submit the <Link to={`/workspace/leads/${lead.id}`} className="text-primary underline">requirement brief</Link> with
                  the floor plan — the GM assigns a designer, and the proposal is generated here once the design is shared.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-primary">1 · Design direction</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STYLES.map((s) => (
                  <button key={s.slug} type="button" onClick={() => setStyle(s.slug)} aria-pressed={style === s.slug}
                    className={cn("overflow-hidden rounded-[var(--radius)] border text-left", style === s.slug ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/60")}>
                    <img src={catalogImage(s.slug, "hero")} alt={s.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <span className="block px-2 py-1.5 text-xs font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{STYLES.find((s) => s.slug === style)?.tagline}</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-primary">2 · Number of units</h3>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setUnits((u) => Math.max(1, u - 1))} aria-label="Fewer units">−</Button>
                <input type="number" min={1} max={50} value={units} aria-label="Number of units"
                  onChange={(e) => setUnits(Math.min(50, Math.max(1, Math.round(Number(e.target.value) || 1))))}
                  className="h-9 w-16 rounded-[var(--radius)] border border-input bg-background text-center text-sm tabular-nums" />
                <Button type="button" size="sm" variant="outline" onClick={() => setUnits((u) => Math.min(50, u + 1))} aria-label="More units">+</Button>
                <span className="text-xs text-muted-foreground">{units > 1 ? `${units} identical ${layout} apartments — each price is the unit price × ${units}; the item list is per apartment.` : "One apartment. For an investor buying several identical units, increase this."}</span>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-primary">3 · Packages to offer — one, two or three</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {TIERS.map((t) => {
                  const on = tiers.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleTier(t)} aria-pressed={on}
                      className={cn("overflow-hidden rounded-[var(--radius)] border text-left", on ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/60")}>
                      <img src={catalogImage(style, t.toLowerCase() as Lowercase<Tier>)} alt={`${t} — ${style}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                      <span className="flex items-center justify-between gap-2 px-2 pt-1.5 text-sm font-medium">
                        {tierLabel(t)}{on && <Check className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="block px-2 text-xs text-muted-foreground">{TIER_TEXT[t].line}</span>
                      <span className="block px-2 pb-2 pt-1 text-sm tabular-nums">
                        {aedWhole(packagePrice(t, layout) * units)}{units > 1 && <span className="text-xs text-muted-foreground"> · {aedWhole(packagePrice(t, layout))} × {units}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Priced as <b>{layout}</b> from the lead's unit type{approximate ? ` (${lead.unit_type || "not set"} — larger units use the 3-bedroom price; ask the GM if it should be higher)` : ""}.
                To change the layout, edit the lead's unit type.
              </p>
            </section>
          </div>
        )}

        {mode === "package" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode("pick")} disabled={pending}>Back</Button>
            <Button onClick={() => onPackage({ style, tiers, layout, units })} disabled={pending || !tiers.length}>
              {pending ? "Creating…" : `Create proposal · ${tiers.length} price${tiers.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
