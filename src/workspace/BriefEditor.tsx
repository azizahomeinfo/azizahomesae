import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ACCENTS, CONTRACT_STATES, OUTPUTS, PROJECT_TYPES, STYLES, normaliseBrief, blankFfeItem, blankFfeSection, restoreStandardFfe,
  type BriefDoc, type FfeItem, type Included,
} from "./briefSchema";
import { editRights, type BriefStatus } from "./briefWorkflow";
import { checkDriveUrl, DriveLink } from "./DriveLink";
import { useSaveBrief, useUpdateLead, type BriefDocColumns, type BriefRow, type Lead } from "./queries";
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
  const updateLead = useUpdateLead();
  // The Drive link lives on the lead (needed before the brief exists and carried into the project),
  // so it saves straight to the lead on blur rather than through the brief autosave.
  const [driveDraft, setDriveDraft] = useState(lead.drive_url ?? "");
  useEffect(() => { setDriveDraft(lead.drive_url ?? ""); }, [lead.drive_url]);
  const driveCheck = checkDriveUrl(driveDraft);
  const saveDrive = () => {
    if (driveCheck.error || driveCheck.value === (lead.drive_url ?? null)) return;
    setDriveDraft(driveCheck.value ?? "");
    updateLead.mutate(
      { id: lead.id, values: { drive_url: driveCheck.value } },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the Drive link") },
    );
  };

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

  const focusRef = useRef<string | null>(null);
  const [newSection, setNewSection] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  useEffect(() => {
    if (!focusRef.current) return;
    document.getElementById(focusRef.current)?.focus();
    focusRef.current = null;
  });
  const upd = (fn: (d: BriefDoc) => BriefDoc) => { setDoc((d) => fn(structuredClone(d))); setDirty(true); };
  const roFull = !rights.full;
  const roFfe = !rights.ffeAndColours;
  const h = doc.header;
  const s = doc.style;
  const setH = (k: keyof BriefDoc["header"]) => (v: string | string[]) => upd((d) => ({ ...d, header: { ...d.header, [k]: v } }));
  const setS = (k: keyof BriefDoc["style"]) => (v: string | string[]) => upd((d) => ({ ...d, style: { ...d.style, [k]: v } }));
  const setItem = (si: number, ii: number, patch: Partial<FfeItem>) =>
    upd((d) => { Object.assign(d.ffe[si].items[ii], patch); return d; });
  const renameItem = (si: number, ii: number, name: string) =>
    upd((d) => {
      const it = d.ffe[si].items[ii];
      if (!it.custom && it.origin === undefined) it.origin = it.item; // remember checklist name for Restore
      it.item = name;
      return d;
    });
  const removeItem = (si: number, ii: number) => upd((d) => { d.ffe[si].items.splice(ii, 1); return d; });
  const addItem = (si: number) => {
    upd((d) => { d.ffe[si].items.push(blankFfeItem()); return d; });
    focusRef.current = `ffe-name-${si}-${doc.ffe[si].items.length}`;
  };
  const addSection = () => {
    const t = newSection.trim();
    if (!t) return;
    upd((d) => { d.ffe.push(blankFfeSection(t)); return d; });
    focusRef.current = `ffe-name-${doc.ffe.length}-0`;
    setNewSection(""); setAddingSection(false);
  };
  const removeSection = (si: number) => upd((d) => { d.ffe.splice(si, 1); return d; });

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
          brief={{ id: brief.id, leadId: lead.id, leadName: lead.name, status, designerId: brief.designer_id, salesId: lead.sales_id, driveUrl: lead.drive_url }}
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
          <section className="space-y-2 rounded-[var(--radius)] border border-primary/40 bg-card p-4 md:p-6">
            <Label htmlFor="brief-drive-url" className="font-heading uppercase text-lg tracking-wide">Google Drive folder</Label>
            <p className="text-xs text-muted-foreground">Floor plan, site photos and client references live here. The designer needs it.</p>
            {rights.full ? (
              <>
                <Input
                  id="brief-drive-url" type="url" inputMode="url" placeholder="https://drive.google.com/…"
                  value={driveDraft} aria-invalid={!!driveCheck.error}
                  onChange={(e) => setDriveDraft(e.target.value)}
                  onBlur={saveDrive}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveDrive(); } }}
                />
                {driveCheck.error ? (
                  <p className="text-xs text-destructive">{driveCheck.error}</p>
                ) : driveCheck.hint ? (
                  <p className="text-xs text-muted-foreground">{driveCheck.hint}</p>
                ) : null}
                {updateLead.isPending && <p className="text-xs text-muted-foreground">Saving…</p>}
              </>
            ) : lead.drive_url ? (
              <DriveLink url={lead.drive_url} />
            ) : (
              <p className="text-sm text-muted-foreground">Not added yet.</p>
            )}
          </section>
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
              {!roFull && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setRestoreOpen(true)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Restore standard checklist
                  </button>
                </div>
              )}
              {doc.ffe.map((sec, si) => {
                const inc = sec.items.filter((i) => i.included === "inc").length;
                return (
                  <Collapsible key={si} defaultOpen={sec.code === "5.1" || sec.code === "5.2" || !!sec.custom} className="rounded-[var(--radius)] border border-border">
                    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-3 text-left">
                      <span className="min-w-0">
                        {sec.code && <span className="text-primary mr-2">{sec.code}</span>}
                        <span className="text-foreground">{sec.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {inc} of {sec.items.length} included
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_auto_auto_90px_minmax(0,2fr)_auto] gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                        <span>Item</span><span>Standard</span><span>Status</span><span>Required</span><span>{sec.notesLabel}</span><span className="sr-only">Remove</span>
                      </div>
                      <ul className="divide-y divide-border border-t border-border">
                        {sec.items.map((it, ii) => (
                          <li key={ii} className="grid gap-2 p-3 md:grid-cols-[minmax(0,2fr)_auto_auto_90px_minmax(0,2fr)_auto] md:items-center md:gap-3">
                            {roFull ? (
                              <>
                                <div className="flex items-baseline justify-between gap-2 md:block">
                                  <span className="text-sm text-foreground">{it.item}</span>
                                  <span className="text-xs text-muted-foreground md:hidden">Std: {it.std}</span>
                                </div>
                                <span className="hidden md:block text-xs text-muted-foreground">{it.std}</span>
                              </>
                            ) : (
                              <div className="grid grid-cols-[minmax(0,1fr)_64px_auto] gap-2 md:contents">
                                <Input id={`ffe-name-${si}-${ii}`} aria-label="Item name" placeholder="Item name" value={it.item} onChange={(e) => renameItem(si, ii, e.target.value)} />
                                <Input aria-label={`${it.item || "item"} standard quantity`} placeholder="Std" className="md:w-16" value={it.std} onChange={(e) => setItem(si, ii, { std: e.target.value })} />
                                <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label={`Remove ${it.item || "item"}`} onClick={() => removeItem(si, ii)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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
                            {roFull ? <span className="hidden md:block" /> : (
                              <Button type="button" variant="ghost" size="icon" className="hidden md:inline-flex" aria-label={`Remove ${it.item || "item"}`} onClick={() => removeItem(si, ii)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {!roFull && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => addItem(si)}>
                            <Plus className="mr-1 h-4 w-4" /> Add item
                          </Button>
                          {sec.custom && (
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeSection(si)}>
                              <Trash2 className="mr-1 h-4 w-4" /> Delete section
                            </Button>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {!roFull && (addingSection ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    autoFocus aria-label="New section title" placeholder="Section title, e.g. Study" value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSection(); } if (e.key === "Escape") setAddingSection(false); }}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addSection} disabled={!newSection.trim()}>Add</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingSection(false); setNewSection(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingSection(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add section
                </Button>
              ))}
            </div>
            <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore standard checklist?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Adds back any standard items you removed. Your own items and everything you have filled in are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => upd((d) => ({ ...d, ffe: restoreStandardFfe(d.ffe) }))}>Restore</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
