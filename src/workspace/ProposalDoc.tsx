import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useBrief, useLead } from "./queries";
import { useSignedUrls } from "./designQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { aed, shortDate } from "./format";
import {
  buildDocument, fromDesign, useAcceptedDesign, useCreateProposal, useLeadProposals, useProposalStatus, useSaveProposal,
  type ProposalDocument, type ProposalRow, type ProposalStatus,
} from "./proposalQueries";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

export const PROPOSAL_TONE: Record<ProposalStatus, string> = {
  Draft: "border-border text-muted-foreground", Sent: "bg-secondary/30 text-foreground border-transparent",
  Accepted: "bg-primary/10 text-primary border-transparent", Rejected: "bg-destructive/10 text-destructive border-transparent",
};
export const ProposalPill = ({ status }: { status: ProposalStatus }) => (
  <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs", PROPOSAL_TONE[status])}>{status}</span>
);

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden !important; }
  .proposal-print, .proposal-print * { visibility: visible !important; }
  .proposal-print { position: absolute; inset: 0 auto auto 0; width: 100%; background: #fff !important; color: #111 !important; border: 0 !important; padding: 0 !important; }
  .proposal-print * { color: #111 !important; border-color: #ccc !important; background: transparent !important; }
  .proposal-print .no-print { display: none !important; }
  .proposal-print .pp-page { break-before: page; page-break-before: always; }
  .proposal-print .pp-cover { break-after: page; }
  .proposal-print img { break-inside: avoid; page-break-inside: avoid; max-height: 200mm; max-width: 100%; object-fit: contain; }
  .proposal-print .pp-keep { break-inside: avoid; page-break-inside: avoid; }
  .proposal-print input, .proposal-print textarea { border: 0 !important; padding: 0 !important; resize: none; }
}`;

const Toggle = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <label className="flex items-center gap-2 text-xs whitespace-nowrap">
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />{label}
  </label>
);

const H = ({ children }: { children: ReactNode }) => <h2 className="font-heading uppercase tracking-wide text-xl md:text-2xl">{children}</h2>;

const Document = ({ row, canEdit, onChange }: { row: ProposalRow; canEdit: boolean; onChange: (d: ProposalDocument) => void }) => {
  const doc = row.doc;
  const editable = canEdit && row.status === "Draft";
  const paths = [doc.cover.hero, doc.floorPlan?.path, ...doc.moodBoard.map((m) => m.path), ...doc.areas.flatMap((a) => a.images.map((i) => i.path))]
    .filter(Boolean) as string[];
  const { data: urls } = useSignedUrls(paths);
  const url = (p: string | null | undefined) => (p ? urls?.get(p) : undefined);
  const inv = doc.investment;
  const setInv = (patch: Partial<ProposalDocument["investment"]>) => onChange({ ...doc, investment: { ...inv, ...patch } });
  const setArea = (i: number, patch: Partial<ProposalDocument["areas"][number]>) =>
    onChange({ ...doc, areas: doc.areas.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const itemList = (
    <section className="pp-page space-y-3">
      <H>Item list</H>
      {doc.itemList.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {doc.itemList.map((g) => (
            <div key={g.room} className="pp-keep">
              <p className="mb-1 text-sm font-medium">{g.room}</p>
              <ul className="text-sm">{g.items.map((i, k) => <li key={k} className="flex justify-between gap-2 border-b border-border py-0.5"><span>{i.item}</span><span>×{i.qty}</span></li>)}</ul>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{doc.itemSource === "project" ? "From the project FF&E list." : "From the client brief checklist."}</p>
    </section>
  );

  const investment = (
    <section className={cn("space-y-3", !doc.toggles.combine && "pp-page")}>
      <H>Investment</H>
      {inv.options.length === 0 && !editable && <p className="text-sm text-muted-foreground">No quotation options yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {inv.options.map((o, i) => {
          const vat = Number(o.amount) * (inv.vat / 100);
          return (
            <div key={i} className="pp-keep rounded-[var(--radius)] border border-border p-4 space-y-1">
              {editable ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input aria-label="Option label" value={o.label} onChange={(e) => setInv({ options: inv.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <Button variant="ghost" size="icon" className="no-print" aria-label="Remove option" onClick={() => setInv({ options: inv.options.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Input aria-label="Description" value={o.desc} onChange={(e) => setInv({ options: inv.options.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
                  <Input aria-label="Amount" type="number" value={o.amount} onChange={(e) => setInv({ options: inv.options.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) })} />
                </div>
              ) : (
                <><p className="font-medium">{o.label}</p>{o.desc && <p className="text-sm text-muted-foreground">{o.desc}</p>}</>
              )}
              <p className="text-sm">{aed(o.amount)} + VAT {inv.vat}% ({aed(vat)}) = <span className="font-medium text-primary">{aed(Number(o.amount) + vat)}</span></p>
              <p className="text-xs text-muted-foreground">Down payment {inv.downpayment}%: {aed((Number(o.amount) + vat) * (inv.downpayment / 100))}</p>
            </div>
          );
        })}
      </div>
      {editable && (
        <div className="no-print space-y-3">
          <Button variant="outline" size="sm" onClick={() => setInv({ options: [...inv.options, { label: `Option ${String.fromCharCode(65 + inv.options.length)}`, desc: "", amount: 0 }] })}>
            <Plus className="h-4 w-4" /> Add option
          </Button>
          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <div className="space-y-1"><Label htmlFor="vat">VAT %</Label><Input id="vat" type="number" value={inv.vat} onChange={(e) => setInv({ vat: Number(e.target.value) || 0 })} /></div>
            <div className="space-y-1"><Label htmlFor="dp">Down payment %</Label><Input id="dp" type="number" value={inv.downpayment} onChange={(e) => setInv({ downpayment: Number(e.target.value) || 0 })} /></div>
          </div>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">Terms</p>
        {editable
          ? <Textarea aria-label="Terms" value={inv.terms} onChange={(e) => setInv({ terms: e.target.value })} placeholder="Payment schedule, validity, exclusions…" />
          : <p className="whitespace-pre-wrap text-sm">{inv.terms || "—"}</p>}
      </div>
    </section>
  );

  return (
    <article className="proposal-print space-y-10 rounded-[var(--radius)] border border-border bg-card p-4 md:p-10">
      <section className="pp-cover space-y-4">
        {url(doc.cover.hero) && <img src={url(doc.cover.hero)} alt="Design render" className="w-full rounded-[var(--radius)] object-cover" />}
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Interior design proposal · V{row.version}</p>
        <h1 className="font-heading uppercase text-3xl md:text-4xl tracking-wide break-words">{doc.cover.client}</h1>
        <p className="text-sm">{[doc.cover.property, doc.cover.unit].filter(Boolean).join(" · ")}</p>
        <p className="text-sm text-muted-foreground">{shortDate(doc.cover.date)}</p>
      </section>

      {doc.areas.map((a, i) => (
        <section key={a.area} className="pp-page space-y-3">
          {editable ? (
            <Input aria-label="Area title" value={a.title} className="font-heading text-xl uppercase" onChange={(e) => setArea(i, { title: e.target.value })} />
          ) : <H>{a.title}</H>}
          {editable
            ? <Textarea aria-label="Area description" value={a.desc} onChange={(e) => setArea(i, { desc: e.target.value })} />
            : <p className="text-sm">{a.desc}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {a.images.map((img) => url(img.path) ? (
              <figure key={img.path} className="pp-keep space-y-1">
                <img src={url(img.path)} alt={img.caption ?? a.title} className="w-full rounded-[var(--radius)] object-cover" />
                {img.caption && <figcaption className="text-xs text-muted-foreground">{img.caption}</figcaption>}
              </figure>
            ) : <div key={img.path} className="aspect-video rounded-[var(--radius)] bg-muted/20" />)}
          </div>
        </section>
      ))}

      {doc.toggles.floorPlan && doc.floorPlan && (
        <section className="pp-page space-y-3">
          <H>Floor plan</H>
          {doc.floorPlan.path.toLowerCase().endsWith(".pdf")
            ? <a href={url(doc.floorPlan.path)} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{doc.floorPlan.name ?? "Floor plan (PDF)"}</a>
            : url(doc.floorPlan.path) && <img src={url(doc.floorPlan.path)} alt="Floor plan" className="pp-keep w-full rounded-[var(--radius)]" />}
        </section>
      )}

      {doc.toggles.moodBoard && doc.moodBoard.length > 0 && (
        <section className="pp-page space-y-3">
          <H>Mood board</H>
          <div className="grid gap-3 sm:grid-cols-2">
            {doc.moodBoard.map((m) => m.path.toLowerCase().endsWith(".pdf")
              ? <a key={m.path} href={url(m.path)} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{m.name ?? "Mood board (PDF)"}</a>
              : url(m.path) && <img key={m.path} src={url(m.path)} alt="Mood board" className="pp-keep w-full rounded-[var(--radius)]" />)}
          </div>
        </section>
      )}

      {doc.toggles.combine && (doc.toggles.itemList || doc.toggles.investment) ? (
        <div className="pp-page space-y-8">{doc.toggles.itemList && itemList}{doc.toggles.investment && investment}</div>
      ) : (
        <>{doc.toggles.itemList && itemList}{doc.toggles.investment && investment}</>
      )}
    </article>
  );
};

const ProposalDoc = () => {
  const { leadId } = useParams();
  const { member } = useWorkspace();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: brief } = useBrief(leadId);
  const { data: design } = useAcceptedDesign(leadId);
  const { data: proposals = [] } = useLeadProposals(leadId);
  const create = useCreateProposal();
  const save = useSaveProposal();
  const setStatus = useProposalStatus();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalDocument | null>(null);
  const timer = useRef<number>();

  const row = proposals.find((p) => p.id === selectedId) ?? proposals[0];
  useEffect(() => { setDraft(null); }, [row?.id]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const back = <Link to="/workspace/proposals" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All proposals</Link>;
  if (isLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (!lead || !member) return <div className="space-y-4">{back}<p className="text-muted-foreground">This lead doesn't exist or you don't have access to it.</p></div>;

  const canEdit = member.role === "gm" || lead.sales_id === member.user_id;
  const current = row ? { ...row, doc: draft ?? row.doc } : null;

  const change = (doc: ProposalDocument) => {
    if (!row) return;
    setDraft(doc);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      save.mutate({ id: row.id, leadId: lead.id, doc }, { onError: (e) => toast.error(errMsg(e, "Could not save")) });
    }, 800);
  };
  const saveNow = (doc: ProposalDocument) => {
    if (!row) return;
    setDraft(doc);
    save.mutate({ id: row.id, leadId: lead.id, doc }, { onError: (e) => toast.error(errMsg(e, "Could not save")) });
  };

  const generate = async () => {
    if (!design) return;
    try {
      const doc = await buildDocument({ lead, brief: brief ?? null, design });
      const nextVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      await create.mutateAsync({ leadId: lead.id, doc, by: member.user_id, nextVersion });
      setSelectedId(null);
      toast.success(`Proposal V${nextVersion} created`);
    } catch (e) { toast.error(errMsg(e, "Could not generate proposal")); }
  };

  const refresh = () => {
    if (!current || !design) return;
    const style = (brief?.style as { primaryStyle?: string } | null)?.primaryStyle?.trim() || lead.style?.trim() || "Contemporary";
    const d = fromDesign(design, style, current.doc.areas);
    saveNow({
      ...current.doc, designId: d.designId, designVersion: d.designVersion, areas: d.areas, floorPlan: d.floorPlan, moodBoard: d.moodBoard,
      cover: { ...current.doc.cover, hero: d.hero },
    });
    toast.success(`Refreshed from design V${d.designVersion}`);
  };

  const status = (s: ProposalStatus) => row && setStatus.mutate({ id: row.id, leadId: lead.id, status: s }, {
    onSuccess: () => toast.success(`Marked ${s}`), onError: (e) => toast.error(errMsg(e, "Failed")),
  });
  const stale = current && design && current.doc.designId !== design.id;
  const editable = canEdit && current?.status === "Draft";
  const t = current?.doc.toggles;
  const setToggle = (k: keyof ProposalDocument["toggles"], v: boolean) => current && saveNow({ ...current.doc, toggles: { ...current.doc.toggles, [k]: v } });

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      {back}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading uppercase text-2xl tracking-wide break-words">{lead.name}</h2>
          <p className="text-sm text-muted-foreground">{[lead.property, lead.unit_type].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && design && <Button variant={current ? "outline" : "default"} onClick={generate} disabled={create.isPending}>{create.isPending ? "Generating…" : current ? "New version" : "Generate proposal"}</Button>}
          {current && <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save as PDF</Button>}
        </div>
      </div>

      {!design && !current && <p className="no-print rounded-[var(--radius)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">A proposal can be generated once the design package has been accepted.</p>}
      {design && !current && !canEdit && <p className="no-print text-sm text-muted-foreground">No proposal yet. Only the lead's sales owner or the GM can generate one.</p>}

      {current && t && (
        <>
          {proposals.length > 1 && (
            <div className="no-print flex flex-wrap gap-2">
              {proposals.map((p) => (
                <button key={p.id} type="button" onClick={() => setSelectedId(p.id)}
                  className={cn("rounded-full border px-3 py-1 text-xs", p.id === current.id ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                  V{p.version} · {p.status}
                </button>
              ))}
            </div>
          )}
          <div className="no-print flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
            <ProposalPill status={current.status} />
            {current.sent_at && <span className="text-xs text-muted-foreground">Sent {shortDate(current.sent_at)}</span>}
            {current.decided_at && <span className="text-xs text-muted-foreground">Decided {shortDate(current.decided_at)}</span>}
            {save.isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
            {canEdit && (
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {current.status === "Draft" && <Button size="sm" onClick={() => status("Sent")}>Mark sent</Button>}
                {current.status === "Sent" && <><Button size="sm" onClick={() => status("Accepted")}>Client accepted</Button><Button size="sm" variant="outline" onClick={() => status("Rejected")}>Client rejected</Button></>}
              </div>
            )}
          </div>
          <div className="no-print flex gap-4 overflow-x-auto rounded-[var(--radius)] border border-border p-3">
            <Toggle label="Floor plan" checked={t.floorPlan} onChange={(v) => setToggle("floorPlan", v)} disabled={!editable || !current.doc.floorPlan} />
            <Toggle label="Mood board" checked={t.moodBoard} onChange={(v) => setToggle("moodBoard", v)} disabled={!editable || !current.doc.moodBoard.length} />
            <Toggle label="Item list" checked={t.itemList} onChange={(v) => setToggle("itemList", v)} disabled={!editable} />
            <Toggle label="Investment" checked={t.investment} onChange={(v) => setToggle("investment", v)} disabled={!editable} />
            <Toggle label="Combine item list & investment" checked={t.combine} onChange={(v) => setToggle("combine", v)} disabled={!editable} />
          </div>
          {stale && (
            <div className="no-print flex flex-col gap-2 rounded-[var(--radius)] border border-secondary bg-secondary/20 p-3 sm:flex-row sm:items-center">
              <p className="text-sm flex-1">Design V{design!.version} has been accepted since this proposal was written.</p>
              {editable && <Button size="sm" onClick={refresh}>Refresh from design</Button>}
            </div>
          )}
          <Document row={current} canEdit={canEdit} onChange={change} />
        </>
      )}
    </div>
  );
};

export default ProposalDoc;
