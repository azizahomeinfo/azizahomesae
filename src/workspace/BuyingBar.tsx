import { useEffect, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FfeRow } from "./ffeQueries";
import { markReturnItem } from "./scrollMemory";
import { aed } from "./format";

export const scrollToRow = (id: string) =>
  requestAnimationFrame(() => [...document.querySelectorAll<HTMLElement>(`[data-ffe-row="${CSS.escape(id)}"]`)]
    .find((e) => e.offsetParent !== null)?.scrollIntoView({ block: "center", behavior: "smooth" }));

/** Highlight classes for the row the buying bar points at. */
export const BAR_ROW_HI = "ring-2 ring-primary bg-primary/10";

/**
 * Sticky bar for the row being bought. `rows` is the on-screen order (Previous/Next walk it, ends disabled).
 * If `itemId` isn't on screen (filtered out or deleted) it renders nothing and drops the id quietly.
 * Editing controls come from the caller via `controls`, so each view decides what (if anything) is editable.
 * `showCost` gates the AED prefix + line total (cost stays invisible to sales) — set it exactly when `controls` shows a cost field.
 */
export const BuyingBar = ({ rows, itemId, ready, supplierLabel, onSelect, controls, showCost }: {
  rows: FfeRow[]; itemId: string | null; ready: boolean; supplierLabel: (r: FfeRow) => string;
  onSelect: (id: string | null) => void; controls?: (r: FfeRow) => ReactNode; showCost?: boolean;
}) => {
  const ids = rows.map((r) => r.id).join(",");
  const idx = itemId ? rows.findIndex((r) => r.id === itemId) : -1;
  useEffect(() => {
    if (ready && itemId && idx < 0) onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, itemId, ids]);
  if (idx < 0) return null;
  const row = rows[idx];
  const go = (id: string) => { onSelect(id); scrollToRow(id); };
  const qty = Number(row.qty);
  return (
    <div className="sticky top-0 z-20 space-y-1.5 rounded-[var(--radius)] border border-primary bg-card p-2 shadow-lg sm:space-y-2 sm:p-3 md:flex md:items-center md:gap-3" aria-label="Buying bar">
      <div className="min-w-0 flex-1 text-sm">
        <span className="text-[10px] text-muted-foreground">{row.ref}</span>{" "}
        <span className="font-medium">{row.item}</span> <span className="text-muted-foreground">×{Number(row.qty)}</span>
        <span className="block truncate text-xs text-muted-foreground">{row.room} · {supplierLabel(row)}</span>
        {/* Spec wraps rather than truncating: a cut-off model number is worse than a taller bar. */}
        {(() => { const line = specLine(row); return line ? <span className="block text-xs text-muted-foreground">{line}</span> : null; })()}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {row.product_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.product_url} target="_blank" rel="noopener noreferrer" onClick={() => markReturnItem(row.id)}>
              <ExternalLink className="h-3.5 w-3.5" /> Open product page
            </a>
          </Button>
        ) : null}
        {showCost && <span className="text-xs text-muted-foreground" aria-hidden>AED</span>}
        {controls?.(row)}
        {showCost && qty > 1 && row.unit_cost != null && (
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">× {qty} = {aed(Number(row.unit_cost) * qty)}</span>
        )}
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" disabled={idx <= 0} onClick={() => go(rows[idx - 1].id)}>‹ Previous</Button>
        <Button size="sm" variant="ghost" disabled={idx >= rows.length - 1} onClick={() => go(rows[idx + 1].id)}>Next ›</Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Close buying bar" onClick={() => onSelect(null)}>✕</Button>
      </div>
    </div>
  );
};
