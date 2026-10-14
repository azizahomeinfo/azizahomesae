import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-ssr";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDecideDiscount, type DiscountRequest } from "./proposalQueries";

/**
 * The GM's cost check of a package proposal: the item list sales sent with their price request, each line
 * pre-costed from the price book, editable. The GM sees total cost and margin at the list price and at the
 * price sales asked for, and sends back one final price. Costs never leave this screen: package_costings
 * is GM-only, and sales only receive the approved price (discount_requests).
 */
type Line = { room: string; item: string; qty: number; unit_cost: number | null };
const MIN_MARGIN = 0.2;
const roundUp500 = (n: number) => Math.ceil(n / 500) * 500;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const marginOf = (price: number, cost: number) => (price > 0 ? (price - cost) / price : 0);

export const PackageCostCheck = ({ proposalId, leadId, request, listPrice }: {
  proposalId: string; leadId: string; request: DiscountRequest; listPrice: number;
}) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ws", "package-costing", proposalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("package_costings").select("items, updated_at").eq("proposal_id", proposalId).maybeSingle();
      if (error) throw new Error(error.message);
      return data as unknown as { items: Line[]; updated_at: string } | null;
    },
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (data && !dirty) setLines(data.items ?? []); }, [data, dirty]);
  const save = useMutation({
    mutationFn: async (items: Line[]) => {
      const { error } = await supabase.rpc("ws_package_save_costs", { _proposal: proposalId, _items: items as unknown as Json });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ["ws", "package-costing", proposalId] }); },
  });
  const decide = useDecideDiscount();

  const cost = useMemo(() => lines.reduce((s, l) => s + (Number(l.unit_cost) || 0) * (Number(l.qty) || 0), 0), [lines]);
  const missing = lines.filter((l) => l.unit_cost == null || l.unit_cost === ("" as never)).length;
  const asked = listPrice - Number(request.requested_discount);
  const suggested = Math.min(listPrice, roundUp500(Math.max(asked, cost / (1 - MIN_MARGIN))));
  const [finalPrice, setFinalPrice] = useState("");
  const final = finalPrice.trim() ? Number(finalPrice) : suggested;
  const rooms = [...new Set(lines.map((l) => l.room))];

  const send = async (approve: boolean) => {
    try {
      if (dirty) await save.mutateAsync(lines);
      if (approve && !(final > 0 && final < listPrice)) { toast.error(`Enter a final price below the list price ${aed(listPrice)} — or keep the list price.`); return; }
      await decide.mutateAsync({ id: request.id, leadId, approve, amount: approve ? listPrice - final : null,
        note: approve ? `Final price ${aed(final)} excl. VAT` : `Keep the list price ${aed(listPrice)}` });
      toast.success(approve ? `Final price ${aed(final)} sent to sales` : "Sales told to keep the list price");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send the decision"); }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading the item list…</p>;
  if (!data) return <p className="text-xs text-muted-foreground">No item list came with this request — ask sales to send it again.</p>;

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">Cost check · {request.option_label}</p>
        <p className="text-xs text-muted-foreground">Unit costs are pre-filled from the price book — correct any, fill the blanks. Sales never see these.</p>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-[var(--radius)] border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60 text-left"><tr><th className="p-1.5">Item</th><th className="p-1.5 text-right">Qty</th><th className="p-1.5 text-right">Unit cost</th><th className="p-1.5 text-right">Line</th></tr></thead>
          <tbody>
            {rooms.map((room) => [
              <tr key={`r-${room}`}><td colSpan={4} className="bg-muted/30 p-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">{room}</td></tr>,
              ...lines.map((l, i) => l.room !== room ? null : (
                <tr key={i} className="border-t border-border">
                  <td className="p-1.5">{l.item}</td>
                  <td className="p-1.5 text-right tabular-nums">{l.qty}</td>
                  <td className="p-1 text-right">
                    <Input inputMode="decimal" className={cn("ml-auto h-7 w-24 text-right tabular-nums", l.unit_cost == null && "border-warning")}
                      value={l.unit_cost ?? ""} aria-label={`Unit cost of ${l.item}`}
                      onChange={(e) => { const v = e.target.value.trim(); setDirty(true); setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unit_cost: v === "" ? null : Number(v) || 0 } : x))); }} />
                  </td>
                  <td className="p-1.5 text-right tabular-nums">{l.unit_cost != null ? Math.round(l.unit_cost * l.qty).toLocaleString() : "—"}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>Total cost <b className="tabular-nums">{aed(cost)}</b>{missing > 0 && <span className="text-warning"> · {missing} item{missing === 1 ? "" : "s"} without a cost</span>}</p>
        <p>List price <b className="tabular-nums">{aed(listPrice)}</b> · margin <span className="tabular-nums">{Math.round(marginOf(listPrice, cost) * 100)}%</span></p>
        <p>Sales asked <b className="tabular-nums">{aed(asked)}</b> · margin <span className={cn("tabular-nums", marginOf(asked, cost) < MIN_MARGIN && "text-destructive")}>{Math.round(marginOf(asked, cost) * 100)}%</span></p>
        {request.client_note && <p className="text-muted-foreground">Client: {request.client_note}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Final price to send (excl. VAT) — suggested {aed(suggested)}</span>
          <Input inputMode="decimal" className="h-8 w-40 tabular-nums" placeholder={String(suggested)} value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
        </label>
        <span className={cn("pb-1.5 text-xs tabular-nums", marginOf(final, cost) < MIN_MARGIN ? "text-destructive" : "text-muted-foreground")}>
          margin {Math.round(marginOf(final, cost) * 100)}%{marginOf(final, cost) < MIN_MARGIN ? " — under 20%" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {dirty && <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate(lines, { onError: (e) => toast.error(e.message) })}>Save costs</Button>}
        <Button size="sm" disabled={decide.isPending || save.isPending} onClick={() => void send(true)}>Send final price {aed(final)}</Button>
        <Button size="sm" variant="outline" disabled={decide.isPending || save.isPending} onClick={() => void send(false)}>Keep the list price</Button>
      </div>
    </div>
  );
};
