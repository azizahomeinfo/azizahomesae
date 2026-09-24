import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ACCENTS, CONTRACT_STATES, OUTPUTS, PROJECT_TYPES, STYLES, normaliseBrief,
  type BriefDoc, type FfeItem, type Included,
} from "./briefSchema";
import { editRights, type BriefStatus } from "./briefWorkflow";
import { useSaveBrief, type BriefDocColumns, type BriefRow, type Lead } from "./queries";
import { BriefActionBar, useActor } from "./useBriefActions";
import BriefStatusPill from "./BriefStatusPill";
import { aed } from "./format";

const SECTIONS = [
  "Project header", "Vision", "Style", "Colour direction", "FF&E requirements", "Bedrooms",
  "Existing items, issues, open queries", "Attachments",
];
const secId = (i: number) => `brief-sec-${i + 1}`;
const INCLUDED: { v: Included; label: string }[] = [
  { v: "inc", label: "Included" }, { v: "exc", label: "Excluded" }, { v: "pend", label: "Pending" },
];
const LIST_LABELS: Record<keyof BriefDoc["lists"], string> = {
  existing: "Existing items to keep", issues: "Issues", queries: "Open queries",
};

/* ---------- small read-only-aware field helpers ---------- */

const Ro = ({ v }: { v: ReactNode }) => (
  <p className="min-h-9 py-2 text-sm text-foreground whitespace-pre-wrap break-words">{v === "" || v == null ? "—" : v}</p>
);

const Field = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className={cn("space-y-1.5 min-w-0", className)}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const TextF = ({ label, value, onChange, ro, type = "text", className }: {
  label: string; value: string; onChange: (v: string) => void; ro: boolean; type?: string; className?: string;
}) => (
  <Field label={label} className={className}>
    {ro ? <Ro v={value} /> : <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />}
  </Field>
);

const AreaF = ({ label, value, onChange, ro }: { label: string; value: string; onChange: (v: string) => void; ro: boolean }) => (
  <Field label={label} className="sm:col-span-2">
    {ro ? <Ro v={value} /> : <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />}
  </Field>
);

const SelectF = ({ label, value, options, onChange, ro }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; ro: boolean;
}) => (
  <Field label={label}>
    {ro ? <Ro v={value} /> : (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    )}
  </Field>
);

const Chips = ({ label, value, options, onChange, ro }: {
  label: string; value: string[]; options: string[]; onChange: (v: string[]) => void; ro: boolean;
}) => (
  <Field label={label} className="sm:col-span-2">
    {ro ? <Ro v={value.join(", ")} /> : (
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                on ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted/20",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    )}
  </Field>
);

const Section = ({ i, children, note }: { i: number; children: ReactNode; note?: string }) => (
  <section id={secId(i)} className="scroll-mt-4 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 md:p-6">
    <div>
      <h3 className="font-heading uppercase text-lg tracking-wide">
        <span className="text-primary mr-2">{i + 1}.</span>{SECTIONS[i]}
      </h3>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
    {children}
  </section>
);

/* ---------- editor ---------- */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead: Lead;
  brief: BriefRow;
  /** Read-only: nothing editable and no workflow buttons. */
  viewOnly?: boolean;
}

const BriefEditor = ({ open, onOpenChange, lead, brief, viewOnly = false }: Props) => {
  const isMobile = useIsMobile();
  const status = brief.status as BriefStatus;
  const actor = useActor(lead.sales_id, brief.designer_id);
  const rights = actor && !viewOnly ? editRights(status, actor) : { full: false, ffeAndColours: false };
  const canSave = rights.full || rights.ffeAndColours;
  const save = useSaveBrief();

  const [doc, setDoc] = useState<BriefDoc>(() => normaliseBrief(brief, lead));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload from server when opened or when the brief changes status underneath us.
  useEffect(() => {
    if (open) {
      setDoc(normaliseBrief(brief, lead));
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brief.id, brief.status]);

  const persist = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!canSave) return;
    const d = docRef.current;
    const cols: BriefDocColumns = rights.full
      ? {
          header: d.header as never, style: d.style as never, colours: d.colours as never, ffe: d.ffe as never,
          bedrooms: d.bedrooms as never, lists: d.lists as never, attachments: d.attachments as never,
        }
      : { colours: d.colours as never, ffe: d.ffe as never };
    try {
      await save.mutateAsync({ id: brief.id, leadId: brief.lead_id, doc: cols });
      setDirty(false);
      setSavedAt(new Date());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the brief");
    }
  }, [canSave, rights.full, brief.id, brief.lead_id, save]);

  useEffect(() => {
    if (!dirty || !canSave) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { persist(); }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [doc, dirty, canSave, persist]);

  const flush = async () => { if (dirty) await persist(); };
  const close = async (o: boolean) => {
    if (!o) await flush();
    onOpenChange(o);
  };

  const upd = (fn: (d: BriefDoc) => BriefDoc) => { setDoc((d) => fn(structuredClone(d))); setDirty(true); };
  const roFull = !rights.full;
  const roFfe = !rights.ffeAndColours;
  const h = doc.header;
  const s = doc.style;
  const setH = (k: keyof BriefDoc["header"]) => (v: string | string[]) => upd((d) => ({ ...d, header: { ...d.header, [k]: v } }));
  const setS = (k: keyof BriefDoc["style"]) => (v: string | string[]) => upd((d) => ({ ...d, style: { ...d.style, [k]: v } }));
  const setItem = (si: number, ii: number, patch: Partial<FfeItem>) =>
    upd((d) => { Object.assign(d.ffe[si].items[ii], patch); return d; });

  const scrollTo = (i: number) => document.getElementById(secId(i))?.scrollIntoView({ behavior: "smooth", block: "start" });

  const body = (
    <div className="flex min-h-0 flex-1 flex-col font-body">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Requirement brief</p>
          <p className="font-heading uppercase text-xl tracking-wide truncate">{lead.name}</p>
        </div>
        <BriefStatusPill status={status} />
        <span className="text-xs text-muted-foreground min-w-[80px]">
          {save.isPending ? "Saving…" : dirty ? "Unsaved" : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : canSave ? "" : "Read only"}
        </span>
        {!viewOnly && <BriefActionBar
          size="sm"
          beforeAction={flush}
          brief={{ id: brief.id, leadId: lead.id, leadName: lead.name, status, designerId: brief.designer_id, salesId: lead.sales_id }}
        />}
        <Button variant="ghost" size="icon" aria-label="Close brief" onClick={() => close(false)}><X /></Button>
      </div>

      {status === "Revision Requested" && brief.revision_note && (
        <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-2 text-sm md:px-6">
          <span className="text-destructive">Revision requested:</span> {brief.revision_note}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <nav className="hidden lg:block w-60 shrink-0 border-r border-border p-4">
          <ol className="sticky top-0 space-y-1">
            {SECTIONS.map((t, i) => (
              <li key={t}>
                <button type="button" onClick={() => scrollTo(i)} className="w-full text-left rounded px-2 py-1.5 text-sm text-foreground hover:bg-muted/20">
                  <span className="text-primary mr-2">{i + 1}.</span>{t}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
          <Section i={0} note={rights.ffeAndColours && !rights.full ? "Set by sales — read only for design." : undefined}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextF label="Account" value={h.account} onChange={setH("account")} ro={roFull} />
              <TextF label="Primary contact" value={h.primary} onChange={setH("primary")} ro={roFull} />
              <TextF label="Property" value={h.property} onChange={setH("property")} ro={roFull} />
              <TextF label="Unit" value={h.unit} onChange={setH("unit")} ro={roFull} />
              <TextF label="Size" value={h.size} onChange={setH("size")} ro={roFull} />
              <TextF label="Rooms" value={h.rooms} onChange={setH("rooms")} ro={roFull} />
              <TextF label="Outdoor" value={h.outdoor} onChange={setH("outdoor")} ro={roFull} />
              <SelectF label="Project type" value={h.projectType} options={PROJECT_TYPES} onChange={setH("projectType")} ro={roFull} />
              {h.projectType === "Other" && (
                <TextF label="Project type (other)" value={h.projectTypeOther} onChange={setH("projectTypeOther")} ro={roFull} />
              )}
              <TextF label="Urgency" value={h.urgency} onChange={setH("urgency")} ro={roFull} />
              {roFull
                ? <Field label="Budget"><Ro v={h.budget ? aed(h.budget) : ""} /></Field>
                : <TextF label="Budget (AED)" type="number" value={h.budget} onChange={setH("budget")} ro={false} />}
              <Chips label="Contract" value={h.contract} options={CONTRACT_STATES} onChange={setH("contract")} ro={roFull} />
            </div>
          </Section>

          <Section i={1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AreaF label="Vision" value={s.vision} onChange={setS("vision")} ro={roFull} />
              <AreaF label="Special requirements" value={s.special} onChange={setS("special")} ro={roFull} />
            </div>
          </Section>

          <Section i={2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectF label="Primary style" value={s.primaryStyle} options={STYLES} onChange={setS("primaryStyle")} ro={roFull} />
              {s.primaryStyle === "Other" && (
                <TextF label="Primary style (other)" value={s.primaryOther} onChange={setS("primaryOther")} ro={roFull} />
              )}
              <Chips label="Accents" value={s.accents} options={ACCENTS} onChange={setS("accents")} ro={roFull} />
              <AreaF label="Accent notes" value={s.accentNotes} onChange={setS("accentNotes")} ro={roFull} />
              <AreaF label="References" value={s.refs} onChange={setS("refs")} ro={roFull} />
              <AreaF label="Dislikes" value={s.dislikes} onChange={setS("dislikes")} ro={roFull} />
              <Field label="Outputs" className="sm:col-span-2">
                {roFull ? <Ro v={s.outputs.join(", ")} /> : (
                  <div className="flex flex-wrap gap-4">
                    {OUTPUTS.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={s.outputs.includes(o)}
                          onCheckedChange={(c) => setS("outputs")(c ? [...s.outputs, o] : s.outputs.filter((x) => x !== o))}
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </Section>

          <Section i={3}>
            <div className="space-y-3">
              {doc.colours.map((c, ci) => (
                <div key={c.zone} className="rounded-[var(--radius)] border border-border p-3">
                  <p className="mb-2 text-sm text-foreground">{c.zone}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(["base", "accent", "saturation", "notes"] as const).map((k) => (
                      <TextF
                        key={k}
                        label={k === "base" ? "Base" : k === "accent" ? "Accent" : k === "saturation" ? "Saturation" : "Notes"}
                        value={c[k]}
                        ro={roFfe}
                        onChange={(v) => upd((d) => { d.colours[ci][k] = v; return d; })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section i={4}>
            <div className="space-y-3">
              {doc.ffe.map((sec, si) => {
                const inc = sec.items.filter((i) => i.included === "inc").length;
                return (
                  <Collapsible key={sec.code} defaultOpen={sec.code === "5.1" || sec.code === "5.2"} className="rounded-[var(--radius)] border border-border">
                    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-3 text-left">
                      <span className="min-w-0">
                        <span className="text-primary mr-2">{sec.code}</span>
                        <span className="text-foreground">{sec.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {inc} of {sec.items.length} included
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_auto_auto_90px_minmax(0,2fr)] gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                        <span>Item</span><span>Standard</span><span>Status</span><span>Required</span><span>{sec.notesLabel}</span>
                      </div>
                      <ul className="divide-y divide-border border-t border-border">
                        {sec.items.map((it, ii) => (
                          <li key={it.item} className="grid gap-2 p-3 md:grid-cols-[minmax(0,2fr)_auto_auto_90px_minmax(0,2fr)] md:items-center md:gap-3">
                            <div className="flex items-baseline justify-between gap-2 md:block">
                              <span className="text-sm text-foreground">{it.item}</span>
                              <span className="text-xs text-muted-foreground md:hidden">Std: {it.std}</span>
                            </div>
                            <span className="hidden md:block text-xs text-muted-foreground">{it.std}</span>
                            {roFfe ? (
                              <span className="text-xs">{INCLUDED.find((o) => o.v === it.included)?.label}</span>
                            ) : (
                              <div className="inline-flex w-full md:w-auto rounded-[var(--radius)] border border-border p-0.5" role="radiogroup" aria-label={`${it.item} status`}>
                                {INCLUDED.map((o) => (
                                  <button
                                    key={o.v}
                                    type="button"
                                    role="radio"
                                    aria-checked={it.included === o.v}
                                    onClick={() => setItem(si, ii, { included: o.v })}
                                    className={cn(
                                      "flex-1 rounded px-2 py-1 text-xs transition-colors",
                                      it.included === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/20",
                                    )}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 md:contents">
                              {roFfe ? <Ro v={it.required} /> : (
                                <Input aria-label={`${it.item} required quantity`} placeholder="Qty" value={it.required} onChange={(e) => setItem(si, ii, { required: e.target.value })} />
                              )}
                              {roFfe ? <Ro v={it.notes} /> : (
                                <Input aria-label={`${it.item} ${sec.notesLabel}`} placeholder={sec.notesLabel} value={it.notes} onChange={(e) => setItem(si, ii, { notes: e.target.value })} />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </Section>

          <Section i={5}>
            <div className="space-y-3">
              {doc.bedrooms.length === 0 && <p className="text-sm text-muted-foreground">No bedrooms listed.</p>}
              {doc.bedrooms.map((b, bi) => (
                <div key={bi} className="rounded-[var(--radius)] border border-border p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
                    {(["bedroom", "size", "headboard", "lighting", "notes"] as const).map((k) => (
                      <TextF
                        key={k}
                        label={k[0].toUpperCase() + k.slice(1)}
                        value={b[k]}
                        ro={roFull}
                        onChange={(v) => upd((d) => { d.bedrooms[bi][k] = v; return d; })}
                      />
                    ))}
                  </div>
                  {!roFull && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => upd((d) => { d.bedrooms.splice(bi, 1); return d; })}>
                      <X className="h-4 w-4 mr-1" />Remove
                    </Button>
                  )}
                </div>
              ))}
              {!roFull && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => upd((d) => { d.bedrooms.push({ bedroom: `Bedroom ${d.bedrooms.length + 1}`, size: "", headboard: "", lighting: "", notes: "" }); return d; })}
                >
                  <Plus className="h-4 w-4 mr-1" />Add bedroom
                </Button>
              )}
            </div>
          </Section>

          <Section i={6}>
            <div className="grid gap-6 lg:grid-cols-3">
              {(Object.keys(LIST_LABELS) as (keyof BriefDoc["lists"])[]).map((k) => (
                <div key={k} className="space-y-2">
                  <p className="text-xs text-muted-foreground">{LIST_LABELS[k]}</p>
                  {doc.lists[k].length === 0 && roFull && <Ro v="" />}
                  {doc.lists[k].map((v, li) => (
                    <div key={li} className="flex gap-2">
                      {roFull ? <Ro v={v} /> : (
                        <>
                          <Input value={v} onChange={(e) => upd((d) => { d.lists[k][li] = e.target.value; return d; })} />
                          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => upd((d) => { d.lists[k].splice(li, 1); return d; })}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  {!roFull && (
                    <Button variant="outline" size="sm" onClick={() => upd((d) => { d.lists[k].push(""); return d; })}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section i={7}>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
              {([["floorPlan", "Floor plan received"], ["siteVisit", "Site visit done"]] as const).map(([k, label]) =>
                roFull ? (
                  <p key={k} className="text-sm">{label}: {doc.attachments[k] ? "Yes" : "No"}</p>
                ) : (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={doc.attachments[k]}
                      onCheckedChange={(c) => upd((d) => { d.attachments[k] = !!c; return d; })}
                    />
                    {label}
                  </label>
                ),
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={close}>
        {/* Flex and overflow containment keep the inner form bounded and scrollable. */}
        <SheetContent side="bottom" className="h-[100dvh] p-0 bg-background [&>button]:hidden flex flex-col overflow-hidden">
          <SheetTitle className="sr-only">Requirement brief</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      {/* Flex and overflow containment override DialogContent's grid so the form can scroll. */}
      <DialogContent className="max-w-none w-screen h-[100dvh] p-0 gap-0 sm:rounded-none bg-background [&>button]:hidden flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Requirement brief</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default BriefEditor;
