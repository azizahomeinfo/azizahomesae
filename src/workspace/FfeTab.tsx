import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useBrief, useMembers } from "./queries";
import type { Project } from "./projectQueries";
import type { WorkspaceRole } from "./access";
import type { FfeSection } from "./briefSchema";
import { useWorkspace } from "./WorkspaceProvider";
import { aed, shortDate, todayISO } from "./format";
import {
  DONE_STAGES, useAddFfeItem, useCosting, useCostingTransition, useDeleteFfeItem, useFfeItems, useSaveSupplier,
  projectOwner, useSeedFfe, useSuppliers, useUpdateFfeItems,
  type CostingStatus, type FfeOwner, type FfeRow, type ProcStage, type QuoteOption,
} from "./ffeQueries";

/** What the sheet belongs to: a lead (inside the design package) or a project (inherited on conversion). */
export interface FfeContext {
  owner: FfeOwner;
  /** Lead whose brief seeds the list, and which notifications link to. */
  leadId: string | null;
  projectId: string | null;
  name: string;
  designerId: string | null;
  salesId: string | null;
}

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);
const lineTotal = (r: FfeRow) => Number(r.qty ?? 0) * Number(r.unit_cost ?? 0);

export const COSTING_LABEL: Record<CostingStatus, string> = {
  Draft: "Draft", Submitted: "With GM for quotation", Returned: "Returned by GM", Quoted: "Quotation set",
};

/** "AED 48,000", or "AED 48,000 – 62,000 (3 options)" when the GM priced several. */
const quoteSummary = (options: QuoteOption[]) => {
  const amts = options.map((o) => Number(o.amount) || 0);
  if (amts.length <= 1) return aed(amts[0] ?? 0);
  const lo = Math.min(...amts), hi = Math.max(...amts);
  return lo === hi ? aed(lo) : `${aed(lo)} – ${aed(hi).replace(/^AED\s*/, "")} (${amts.length} options)`;
};

const byRoom = (rows: FfeRow[]) => {
  const m = new Map<string, FfeRow[]>();
  for (const r of rows) m.set(r.room, [...(m.get(r.room) ?? []), r]);
  return [...m.entries()];
};

/** Text/number cell that saves 800ms after typing stops. */
const EditCell = ({
  value, onSave, disabled, type = "text", className, label,
}: { value: string | number | null; onSave: (v: string) => void; disabled?: boolean; type?: string; className?: string; label: string }) => {
  const [v, setV] = useState(value == null ? "" : String(value));
  const timer = useRef<number>();
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setV(value == null ? "" : String(value)); }, [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (disabled) return <span className={cn("text-sm break-words", className)}>{v || "—"}</span>;
  return (
    <Input aria-label={label} type={type} value={v} className={cn("h-8 text-sm", className)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; }}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => onSave(next), 800);
      }} />
  );
};

const SupplierPicker = ({ value, onChange, disabled, canAdd }: { value: string | null; onChange: (id: string | null) => void; disabled?: boolean; canAdd: boolean }) => {
  const { data: suppliers = [] } = useSuppliers();
  const save = useSaveSupplier();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = suppliers.find((s) => s.id === value);
  if (disabled) return <span className="text-sm">{current?.name ?? "—"}</span>;
  const add = async () => {
    const name = q.trim();
    if (!name) return;
    try {
      const id = await save.mutateAsync({ values: { name } });
      onChange(id);
      setOpen(false);
      setQ("");
    } catch (e) { toast.error(errMsg(e, "Could not add supplier")); }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" role="combobox" aria-label="Supplier" className="h-8 w-full justify-between font-normal">
          <span className="truncate">{current?.name ?? "Choose…"}</span><ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search suppliers" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {value && <CommandItem value="__clear" onSelect={() => { onChange(null); setOpen(false); }}>No supplier</CommandItem>}
              {suppliers.map((s) => (
                <CommandItem key={s.id} value={s.name} onSelect={() => { onChange(s.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", s.id === value ? "opacity-100" : "opacity-0")} />{s.name}
                  {s.status === "Blocked" && <span className="ml-auto text-xs text-destructive">Blocked</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {canAdd && q.trim() && !suppliers.some((s) => s.name.toLowerCase() === q.trim().toLowerCase()) && (
            <button type="button" onClick={add} disabled={save.isPending}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm hover:bg-muted/20">
              <Plus className="h-4 w-4" /> Add new supplier "{q.trim()}"
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</h3>{right}
    </div>
    {children}
  </section>
);

/* ---------------- empty state: seed from the brief ---------------- */

const SeedSheet = ({ ctx, canEdit }: { ctx: FfeContext; canEdit: boolean }) => {
  const { data: brief, isLoading } = useBrief(ctx.leadId ?? undefined);
  const seed = useSeedFfe();
  const add = useAddFfeItem();
  const ffe = (brief?.ffe as unknown as FfeSection[] | null) ?? [];
  const included = ffe.reduce((n, s) => n + (s.items ?? []).filter((i) => i.included === "inc" && i.item?.trim()).length, 0);
  if (isLoading && ctx.leadId) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!canEdit) return <p className="text-sm text-muted-foreground">No FF&E items yet.</p>;
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border p-8 text-center space-y-3">
      <p className="text-sm text-muted-foreground">No FF&E items yet.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {brief && included > 0 && (
          <Button disabled={seed.isPending}
            onClick={() => seed.mutate({ owner: ctx.owner, ffe }, {
              onSuccess: (n) => toast.success(`${n} items added from the brief`), onError: (e) => toast.error(errMsg(e, "Failed")),
            })}>
            {seed.isPending ? "Building…" : "Build from the client brief"}
          </Button>
        )}
        <Button variant="outline" disabled={add.isPending}
          onClick={() => add.mutate({ owner: ctx.owner, room: "Living Room", existing: [] }, { onError: (e) => toast.error(errMsg(e, "Failed")) })}>
          Start an empty list
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {brief && included > 0 ? `${included} included items in the brief.` : ctx.leadId ? "No brief with included items that you can see." : "This project has no brief."}
      </p>
    </div>
  );
};

/* ---------------- quotation dialog (GM) ---------------- */

const QuoteDialog = ({ open, onOpenChange, cost, initial, onSave, pending }: {
  open: boolean; onOpenChange: (o: boolean) => void; cost: number;
  initial: { markup: number; options: QuoteOption[]; notes: string };
  onSave: (v: { markup: number; options: QuoteOption[]; notes: string }) => void; pending: boolean;
}) => {
  const [markup, setMarkup] = useState(initial.markup);
  const [options, setOptions] = useState<QuoteOption[]>(initial.options);
  const [notes, setNotes] = useState(initial.notes);
  const sell = Math.round(cost * (1 + markup / 100));
  useEffect(() => {
    if (!open) return;
    setMarkup(initial.markup);
    setNotes(initial.notes);
    setOptions(initial.options.length ? initial.options : [{ label: "Option A", desc: "Full furnishing, appliances & styling", amount: Math.round(cost * (1 + initial.markup / 100)) }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const setOpt = (i: number, patch: Partial<QuoteOption>) => setOptions(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Set quotation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="markup">Markup %</Label>
            <Input id="markup" type="number" min={0} value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-[var(--radius)] border border-border p-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Total cost</p><p>{aed(cost)}</p></div>
            <div><p className="text-xs text-muted-foreground">Markup</p><p>{aed(sell - cost)}</p></div>
            <div><p className="text-xs text-muted-foreground">Sell price</p><p className="text-primary">{aed(sell)}</p></div>
          </div>
          <div className="space-y-2">
            <Label>Client options</Label>
            {options.map((o, i) => (
              <div key={i} className="space-y-2 rounded-[var(--radius)] border border-border p-3">
                <div className="flex gap-2">
                  <Input aria-label="Option label" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} />
                  <Input aria-label="Amount" type="number" className="w-32" value={o.amount} onChange={(e) => setOpt(i, { amount: Number(e.target.value) || 0 })} />
                  <Button variant="ghost" size="icon" aria-label="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Input aria-label="Description" value={o.desc} onChange={(e) => setOpt(i, { desc: e.target.value })} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setOptions([...options, { label: `Option ${String.fromCharCode(65 + options.length)}`, desc: "", amount: sell }])}>
              <Plus className="h-4 w-4" /> Add option
            </Button>
          </div>
          <div className="space-y-1"><Label htmlFor="gm-notes">GM notes</Label><Textarea id="gm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button disabled={pending || !options.length || options.some((o) => !o.label.trim())} onClick={() => onSave({ markup, options, notes })}>
            {pending ? "Saving…" : "Set quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- FF&E costing sheet ---------------- */

export const FfeTab = ({ project }: { project: Project }) => (
  <FfeSheet ctx={{
    owner: projectOwner(project.id), leadId: project.lead_id, projectId: project.id, name: project.name,
    designerId: project.designer_id, salesId: project.sales_id,
  }} />
);

/** The FF&E list + costing workflow, shared by the lead's design package and the project tab. */
export const FfeSheet = ({ ctx, readOnly = false }: { ctx: FfeContext; readOnly?: boolean }) => {
  const { member } = useWorkspace();
  const role = member?.role as WorkspaceRole;
  const withCost = role !== "sales";
  const { data: rows = [], isLoading } = useFfeItems(ctx.owner, withCost);
  const { data: costing } = useCosting(ctx.owner, withCost);
  const { data: members = [] } = useMembers();
  const update = useUpdateFfeItems();
  const add = useAddFfeItem();
  const del = useDeleteFfeItem();
  const transition = useCostingTransition();
  const [newRoom, setNewRoom] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);

  const status: CostingStatus = costing?.status ?? "Draft";
  const isGm = role === "gm";
  const canEdit = !readOnly && role !== "sales" && (status === "Draft" || status === "Returned");
  const canSubmit = (isGm || role === "designer") && canEdit && rows.length > 0;
  const grand = rows.reduce((s, r) => s + lineTotal(r), 0);
  const groups = useMemo(() => byRoom(rows), [rows]);

  const save = (id: string, values: Partial<FfeRow>) =>
    update.mutate({ owner: ctx.owner, ids: [id], values, existing: rows }, { onError: (e) => toast.error(errMsg(e, "Could not save")) });
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const name = member?.full_name ?? "Someone";
  const gms = members.filter((m) => m.role === "gm" && m.active).map((m) => m.user_id);
  const notifyTo = (ids: (string | null)[], title: string) =>
    [...new Set(ids.filter(Boolean) as string[])].filter((u) => u !== member?.user_id)
      .map((user_id) => ({ user_id, kind: "costing", lead_id: ctx.leadId, project_id: ctx.projectId, title }));

  const run = (values: Parameters<typeof transition.mutate>[0]["values"], notify: ReturnType<typeof notifyTo>, ok: string, done?: () => void) =>
    transition.mutate({ owner: ctx.owner, exists: !!costing, values, notify }, {
      onSuccess: () => { toast.success(ok); done?.(); }, onError: (e) => toast.error(errMsg(e, "Failed")),
    });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rows.length) return <SeedSheet ctx={ctx} canEdit={!readOnly && role !== "sales"} />;

  const cells = (r: FfeRow) => ({
    item: <EditCell label="Item" value={r.item} disabled={!canEdit} onSave={(v) => v.trim() && save(r.id, { item: v.trim() })} />,
    sku: <EditCell label="SKU" value={r.sku} disabled={!canEdit} onSave={(v) => save(r.id, { sku: v || null })} />,
    supplier: <SupplierPicker value={r.supplier_id} disabled={!canEdit} canAdd={isGm || role === "coordinator"} onChange={(id) => save(r.id, { supplier_id: id })} />,
    qty: <EditCell label="Qty" type="number" value={r.qty} disabled={!canEdit} className="w-20" onSave={(v) => save(r.id, { qty: num(v) ?? 1 })} />,
    dims: <EditCell label="Dims" value={r.dims} disabled={!canEdit} onSave={(v) => save(r.id, { dims: v || null })} />,
    finish: <EditCell label="Finish" value={r.finish} disabled={!canEdit} onSave={(v) => save(r.id, { finish: v || null })} />,
    cost: <EditCell label="Unit cost" type="number" value={r.unit_cost ?? null} disabled={!canEdit} className="w-28" onSave={(v) => save(r.id, { unit_cost: num(v) })} />,
    room: canEdit ? (
      <Select value={r.room} onValueChange={(room) => room !== r.room && save(r.id, { room })}>
        <SelectTrigger className="h-8 w-36" aria-label="Room"><SelectValue /></SelectTrigger>
        <SelectContent>{groups.map(([g]) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
      </Select>
    ) : null,
    del: canEdit ? (
      <Button variant="ghost" size="icon" aria-label={`Delete ${r.item}`}
        onClick={() => del.mutate({ owner: ctx.owner, id: r.id }, { onError: (e) => toast.error(errMsg(e, "Failed")) })}>
        <Trash2 className="h-4 w-4" />
      </Button>
    ) : null,
  });

  return (
    <div className="space-y-4">
      <Section title={`Costing · ${COSTING_LABEL[status]}`} right={
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button size="sm" disabled={transition.isPending}
              onClick={() => run({ status: "Submitted", submitted_at: new Date().toISOString() },
                notifyTo(gms, `${name} submitted the FF&E list for ${ctx.name} — quotation needed`), "Sent to GM for quotation")}>
              Submit for quotation
            </Button>
          )}
          {isGm && !readOnly && status === "Submitted" && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setReturnNote(""); setReturnOpen(true); }}>Return to designer</Button>
              <Button size="sm" onClick={() => setQuoteOpen(true)}>Set quotation</Button>
            </>
          )}
        </div>
      }>
        {status === "Returned" && costing?.return_note && (
          <p className="rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-3 text-sm"><span className="font-medium">Returned by GM:</span> {costing.return_note}</p>
        )}
        {withCost && <p className="text-sm">Grand total (cost): <span className="font-medium">{aed(grand)}</span> · {rows.length} items</p>}
        {!withCost && <p className="text-sm">{rows.length} items</p>}
        {status === "Quoted" && costing && (
          <div className="grid gap-2 sm:grid-cols-2">
            {costing.options.map((o, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-border p-3">
                <p className="text-sm font-medium">{o.label} · <span className="text-primary">{aed(o.amount)}</span></p>
                {o.desc && <p className="text-xs text-muted-foreground">{o.desc}</p>}
              </div>
            ))}
            {costing.quoted_at && <p className="text-xs text-muted-foreground sm:col-span-2">Quotation set {shortDate(costing.quoted_at)}{withCost && costing.markup_pct != null ? ` · ${costing.markup_pct}% markup` : ""}</p>}
            {isGm && costing.gm_notes && <p className="text-xs text-muted-foreground sm:col-span-2">GM notes: {costing.gm_notes}</p>}
          </div>
        )}
      </Section>

      {groups.map(([room, items]) => {
        const sub = items.reduce((s, r) => s + lineTotal(r), 0);
        return (
          <Section key={room} title={room} right={
            <div className="flex items-center gap-2">
              {withCost && <span className="text-sm">{aed(sub)}</span>}
              {canEdit && (
                <Button size="sm" variant="outline" disabled={add.isPending}
                  onClick={() => add.mutate({ owner: ctx.owner, room, existing: rows }, { onError: (e) => toast.error(errMsg(e, "Failed")) })}>
                  <Plus className="h-4 w-4" /> Row
                </Button>
              )}
            </div>
          }>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-1">Item</th><th className="p-1">SKU</th><th className="p-1">Supplier</th><th className="p-1">Qty</th>
                    <th className="p-1">Dims</th><th className="p-1">Finish</th>
                    {withCost && <><th className="p-1">Unit cost</th><th className="p-1 text-right">Line total</th></>}
                    {canEdit && <><th className="p-1">Room</th><th /></>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const c = cells(r);
                    return (
                      <tr key={r.id} className="border-t border-border align-top">
                        <td className="p-1 min-w-40"><span className="block text-[10px] text-muted-foreground">{r.ref}</span>{c.item}</td>
                        <td className="p-1 min-w-24">{c.sku}</td><td className="p-1 min-w-36">{c.supplier}</td><td className="p-1">{c.qty}</td>
                        <td className="p-1 min-w-24">{c.dims}</td><td className="p-1 min-w-28">{c.finish}</td>
                        {withCost && <><td className="p-1">{c.cost}</td><td className="p-1 text-right whitespace-nowrap">{aed(lineTotal(r))}</td></>}
                        {canEdit && <><td className="p-1">{c.room}</td><td className="p-1">{c.del}</td></>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
              {items.map((r) => {
                const c = cells(r);
                return (
                  <li key={r.id} className="space-y-2 rounded-[var(--radius)] border border-border p-3">
                    <div className="flex items-start gap-2"><div className="flex-1"><span className="text-[10px] text-muted-foreground">{r.ref}</span>{c.item}</div>{c.del}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="space-y-1"><span className="text-muted-foreground">SKU</span>{c.sku}</label>
                      <label className="space-y-1"><span className="text-muted-foreground">Qty</span>{c.qty}</label>
                      <label className="col-span-2 space-y-1"><span className="text-muted-foreground">Supplier</span>{c.supplier}</label>
                      <label className="space-y-1"><span className="text-muted-foreground">Dims</span>{c.dims}</label>
                      <label className="space-y-1"><span className="text-muted-foreground">Finish</span>{c.finish}</label>
                      {withCost && <label className="space-y-1"><span className="text-muted-foreground">Unit cost</span>{c.cost}</label>}
                      {withCost && <div className="space-y-1"><span className="text-muted-foreground">Line total</span><p className="text-sm">{aed(lineTotal(r))}</p></div>}
                      {canEdit && <label className="col-span-2 space-y-1"><span className="text-muted-foreground">Room</span>{c.room}</label>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}

      {canEdit && (
        <div className="flex gap-2">
          <Input placeholder="New room, e.g. Balcony" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} className="sm:w-64" aria-label="New room" />
          <Button variant="outline" disabled={!newRoom.trim() || add.isPending}
            onClick={() => add.mutate({ owner: ctx.owner, room: newRoom.trim(), existing: rows }, { onSuccess: () => setNewRoom(""), onError: (e) => toast.error(errMsg(e, "Failed")) })}>
            Add room
          </Button>
        </div>
      )}

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return to designer</DialogTitle></DialogHeader>
          <Label htmlFor="ret-note">What needs changing?</Label>
          <Textarea id="ret-note" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} />
          <DialogFooter>
            <Button disabled={!returnNote.trim() || transition.isPending}
              onClick={() => run({ status: "Returned", return_note: returnNote.trim() },
                notifyTo([ctx.designerId], `${name} returned the FF&E list for ${ctx.name}`), "Returned to designer", () => setReturnOpen(false))}>
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isGm && (
        <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} cost={grand} pending={transition.isPending}
          initial={{ markup: Number(costing?.markup_pct ?? 35), options: costing?.options ?? [], notes: costing?.gm_notes ?? "" }}
          onSave={(v) => run(
            { status: "Quoted", quoted_at: new Date().toISOString(), markup_pct: v.markup, options: v.options as unknown as never, gm_notes: v.notes || null },
            [
              // The hand-back: sales builds the proposal from this quote.
              ...notifyTo([ctx.salesId], `Quotation ready for ${ctx.name} — ${quoteSummary(v.options)}`),
              ...notifyTo([ctx.designerId].filter((d) => d !== ctx.salesId), `Quotation set for ${ctx.name}`),
            ], "Quotation set", () => setQuoteOpen(false),
          )} />
      )}
    </div>
  );
};

/* ---------------- procurement tracker ---------------- */

export const PHASES: { name: string; stages: ProcStage[] }[] = [
  { name: "Sourcing", stages: ["Awaiting Quote", "Quote Received", "Negotiation"] },
  { name: "Approval & Payment", stages: ["Awaiting Approval", "Payment Required"] },
  { name: "Ordered", stages: ["Ordered", "Supplier Confirmed", "In Production"] },
  { name: "Delivery", stages: ["Ready for Delivery", "Delivery Scheduled", "Delivered"] },
  { name: "Install & Close", stages: ["Installation Pending", "Installed", "Issue / Replacement", "Closed"] },
];
const ALL_STAGES = PHASES.flatMap((p) => p.stages);
const phaseOf = (s: ProcStage) => PHASES.find((p) => p.stages.includes(s))?.name ?? "Sourcing";
const etaLate = (r: FfeRow) => !!r.eta && r.eta < todayISO() && !["Delivered", "Installed", "Closed"].includes(r.stage);

const useIsLg = () => {
  const [lg, setLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setLg(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return lg;
};

const StageSelect = ({ value, onChange, disabled }: { value: ProcStage; onChange: (s: ProcStage) => void; disabled?: boolean }) =>
  disabled ? <span className="text-sm whitespace-nowrap">{value}</span> : (
    <Select value={value} onValueChange={(v) => v !== value && onChange(v as ProcStage)}>
      <SelectTrigger className="h-8 w-44" aria-label="Stage"><SelectValue /></SelectTrigger>
      <SelectContent>{ALL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
    </Select>
  );

const PhaseBoard = ({ rows, canEdit, onMove }: { rows: FfeRow[]; canEdit: boolean; onMove: (id: string, s: ProcStage) => void }) => {
  const lg = useIsLg();
  const drag = canEdit && lg;
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PHASES.map((p) => {
        const items = rows.filter((r) => p.stages.includes(r.stage));
        return (
          <div key={p.name}
            onDragOver={drag ? (e) => { e.preventDefault(); setOver(p.name); } : undefined}
            onDragLeave={drag ? () => setOver(null) : undefined}
            onDrop={drag ? (e) => {
              e.preventDefault(); setOver(null);
              const id = e.dataTransfer.getData("text/plain");
              const r = rows.find((x) => x.id === id);
              if (r && !p.stages.includes(r.stage)) onMove(id, p.stages[0]);
            } : undefined}
            className={cn("rounded-[var(--radius)] border border-border bg-card p-3 space-y-2", over === p.name && "border-primary")}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{p.name} · {items.length}</p>
            {lg && items.map((r) => (
              <div key={r.id} draggable={drag} onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                className={cn("rounded-[var(--radius)] border border-border p-2 text-xs", drag && "cursor-grab")}>
                <p className="font-medium">{r.item}</p>
                <p className="text-muted-foreground">{r.ref} · {r.room} · {r.stage}</p>
                {r.eta && <p className={cn(etaLate(r) && "text-destructive")}>ETA {shortDate(r.eta)}</p>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export const ProcurementTab = ({ project }: { project: Project }) => {
  const { member } = useWorkspace();
  const role = member?.role as WorkspaceRole;
  const canEdit = role === "gm" || role === "coordinator";
  const { data: rows = [], isLoading } = useFfeItems(projectOwner(project.id), false);
  const update = useUpdateFfeItems();
  const [view, setView] = useState<"table" | "board">("table");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<ProcStage | "">("");
  const [bulkPo, setBulkPo] = useState("");
  const groups = useMemo(() => byRoom(rows), [rows]);
  const done = rows.filter((r) => DONE_STAGES.includes(r.stage)).length;

  const apply = (ids: string[], values: Partial<FfeRow>, ok?: string) =>
    update.mutate({ owner: projectOwner(project.id), ids, values }, {
      onSuccess: () => ok && toast.success(ok), onError: (e) => toast.error(errMsg(e, "Could not save")),
    });
  const toggle = (id: string, on: boolean) => { const n = new Set(sel); if (on) n.add(id); else n.delete(id); setSel(n); };

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rows.length) return <div className="rounded-[var(--radius)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No FF&E items yet. Build the costing sheet on the FF&E tab first.</div>;

  const dateCell = (r: FfeRow, k: "ordered_on" | "eta" | "delivered_on" | "installed_on", label: string) =>
    canEdit ? (
      <Input type="date" aria-label={label} value={r[k] ?? ""} className={cn("h-8 w-36 text-sm", k === "eta" && etaLate(r) && "text-destructive")}
        onChange={(e) => apply([r.id], { [k]: e.target.value || null })} />
    ) : <span className={cn("text-sm whitespace-nowrap", k === "eta" && etaLate(r) && "text-destructive")}>{shortDate(r[k]) || "—"}</span>;

  return (
    <div className="space-y-4">
      <Section title={`Procurement · ${done} of ${rows.length} delivered · ${project.proc_pct}%`} right={
        <div className="flex gap-1">
          <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>Table</Button>
          <Button size="sm" variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>Phase board</Button>
        </div>
      }>
        <div className="flex flex-wrap gap-2 text-xs">
          {PHASES.map((p) => <span key={p.name} className="rounded-full border border-border px-2.5 py-0.5">{p.name} · {rows.filter((r) => phaseOf(r.stage) === p.name).length}</span>)}
        </div>
        {canEdit && sel.size > 0 && view === "table" && (
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-primary/40 p-3 sm:flex-row sm:items-center">
            <span className="text-sm">{sel.size} selected</span>
            <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as ProcStage)}>
              <SelectTrigger className="h-8 sm:w-48" aria-label="Bulk stage"><SelectValue placeholder="Set stage…" /></SelectTrigger>
              <SelectContent>{ALL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" disabled={!bulkStage || update.isPending} onClick={() => bulkStage && apply([...sel], { stage: bulkStage }, `${sel.size} items moved to ${bulkStage}`)}>Apply stage</Button>
            <Input className="h-8 sm:w-36" placeholder="PO ref" value={bulkPo} onChange={(e) => setBulkPo(e.target.value)} aria-label="Bulk PO ref" />
            <Button size="sm" disabled={!bulkPo.trim() || update.isPending} onClick={() => apply([...sel], { po_ref: bulkPo.trim() }, `PO set on ${sel.size} items`)}>Apply PO</Button>
            <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
          </div>
        )}
      </Section>

      {view === "board" ? (
        <PhaseBoard rows={rows} canEdit={canEdit} onMove={(id, stage) => apply([id], { stage })} />
      ) : groups.map(([room, items]) => (
        <Section key={room} title={`${room} · ${items.length}`} right={canEdit ? (
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={items.every((r) => sel.has(r.id))}
              onCheckedChange={(c) => { const n = new Set(sel); items.forEach((r) => (c === true ? n.add(r.id) : n.delete(r.id))); setSel(n); }} />
            Select room
          </label>
        ) : undefined}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>{canEdit && <th />}<th className="p-1">Item</th><th className="p-1">Stage</th><th className="p-1">PO ref</th><th className="p-1">Ordered</th><th className="p-1">ETA</th><th className="p-1">Delivered</th><th className="p-1">Installed</th><th className="p-1">Notes</th></tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    {canEdit && <td className="p-1"><Checkbox aria-label={`Select ${r.item}`} checked={sel.has(r.id)} onCheckedChange={(c) => toggle(r.id, c === true)} /></td>}
                    <td className="p-1 min-w-36"><span className="block text-[10px] text-muted-foreground">{r.ref}</span>{r.item} <span className="text-muted-foreground">×{Number(r.qty)}</span></td>
                    <td className="p-1"><StageSelect value={r.stage} disabled={!canEdit} onChange={(stage) => apply([r.id], { stage })} /></td>
                    <td className="p-1"><EditCell label="PO ref" value={r.po_ref} disabled={!canEdit} className="w-28" onSave={(v) => apply([r.id], { po_ref: v || null })} /></td>
                    <td className="p-1">{dateCell(r, "ordered_on", "Ordered on")}</td>
                    <td className="p-1">{dateCell(r, "eta", "ETA")}</td>
                    <td className="p-1">{dateCell(r, "delivered_on", "Delivered on")}</td>
                    <td className="p-1">{dateCell(r, "installed_on", "Installed on")}</td>
                    <td className="p-1 min-w-40"><EditCell label="Notes" value={r.notes} disabled={!canEdit} onSave={(v) => apply([r.id], { notes: v || null })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {items.map((r) => (
              <li key={r.id} className="space-y-2 rounded-[var(--radius)] border border-border p-3">
                <div className="flex items-start gap-2">
                  {canEdit && <Checkbox className="mt-1" aria-label={`Select ${r.item}`} checked={sel.has(r.id)} onCheckedChange={(c) => toggle(r.id, c === true)} />}
                  <div className="flex-1"><p className="text-[10px] text-muted-foreground">{r.ref}</p><p className="text-sm">{r.item} <span className="text-muted-foreground">×{Number(r.qty)}</span></p></div>
                </div>
                <StageSelect value={r.stage} disabled={!canEdit} onChange={(stage) => apply([r.id], { stage })} />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="space-y-1"><span className="text-muted-foreground">PO ref</span><EditCell label="PO ref" value={r.po_ref} disabled={!canEdit} onSave={(v) => apply([r.id], { po_ref: v || null })} /></label>
                  <label className="space-y-1"><span className="text-muted-foreground">ETA</span>{dateCell(r, "eta", "ETA")}</label>
                  <label className="space-y-1"><span className="text-muted-foreground">Ordered</span>{dateCell(r, "ordered_on", "Ordered on")}</label>
                  <label className="space-y-1"><span className="text-muted-foreground">Delivered</span>{dateCell(r, "delivered_on", "Delivered on")}</label>
                  <label className="space-y-1"><span className="text-muted-foreground">Installed</span>{dateCell(r, "installed_on", "Installed on")}</label>
                  <label className="col-span-2 space-y-1"><span className="text-muted-foreground">Notes</span><EditCell label="Notes" value={r.notes} disabled={!canEdit} onSave={(v) => apply([r.id], { notes: v || null })} /></label>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
};
