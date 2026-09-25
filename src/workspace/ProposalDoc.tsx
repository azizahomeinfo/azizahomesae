import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useBrief, useLead } from "./queries";
import { uploadToWorkspace, useSignedUrls } from "./designQueries";
import { leadOwner, useCosting } from "./ffeQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { shortDate } from "./format";
import {
  useCreateProposal, useLeadProposals, useProposalItems, useProposalStatus, useSaveProposal, useSharedDesign,
  type ProposalStatus,
} from "./proposalQueries";
import {
  applyDesign, applyQuote, buildDocument, layoutSheets, newId,
  type DocImage, type ProposalDocument,
} from "./proposalModel";
import { PROPOSAL_CSS, ProposalPages } from "./ProposalPages";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

export const PROPOSAL_TONE: Record<ProposalStatus, string> = {
  Draft: "border-border text-muted-foreground", Sent: "bg-secondary/30 text-foreground border-transparent",
  Accepted: "bg-primary/10 text-primary border-transparent", Rejected: "bg-destructive/10 text-destructive border-transparent",
};
export const ProposalPill = ({ status }: { status: ProposalStatus }) => (
  <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs", PROPOSAL_TONE[status])}>{status}</span>
);

/* ---------------- small rail helpers ---------------- */

const RailSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <details open className="group border-b border-border py-3">
    <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</summary>
    <div className="mt-3 space-y-3">{children}</div>
  </details>
);
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>
);
const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span>{label}{hint}</span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
  </div>
);

type Mark = "ok" | "wait" | "block";
const Chip = ({ label, text, mark }: { label: string; text: string; mark: Mark }) => (
  <div className={cn(
    "flex min-w-0 items-start gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm",
    mark === "ok" && "border-success/40 bg-success/10",
    mark === "wait" && "border-border bg-card",
    mark === "block" && "border-destructive/50 bg-destructive/10",
  )}>
    <span aria-hidden className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-semibold",
      mark === "ok" ? "bg-success text-primary-foreground" : mark === "block" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>
      {mark === "ok" ? "✓" : mark === "block" ? "!" : "…"}
    </span>
    <span className="min-w-0"><span className="font-medium">{label}</span> — {text}</span>
  </div>
);

const ImageStrip = ({ images, url, onRemove }: { images: DocImage[]; url: (p: string) => string | undefined; onRemove?: (i: number) => void }) => (
  <div className="flex flex-wrap gap-2">
    {images.map((img, i) => (
      <div key={img.path} className="relative h-14 w-20 overflow-hidden rounded border border-border bg-muted/20">
        {url(img.path) && <img src={url(img.path)} alt="" className="h-full w-full object-cover" />}
        {onRemove && (
          <button type="button" aria-label="Remove image" onClick={() => onRemove(i)}
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    ))}
  </div>
);

const UploadButton = ({ label, onFile, disabled }: { label: string; onFile: (f: File) => Promise<void>; disabled?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { await onFile(f); } catch (err) { toast.error(errMsg(err, "Upload failed")); } finally { setBusy(false); }
      }} />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> {busy ? "Uploading…" : label}
      </Button>
    </>
  );
};

/* ---------------- page ---------------- */

const ProposalDoc = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { member } = useWorkspace();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: brief, isLoading: briefLoading } = useBrief(leadId);
  const { data: design, isLoading: designLoading } = useSharedDesign(leadId);
  // withCost=false: sales-safe read — options, status and version only, never markup or notes.
  const { data: costing, isLoading: costingLoading } = useCosting(leadId ? leadOwner(leadId) : undefined, false);
  const { data: groups, isLoading: itemsLoading } = useProposalItems(briefLoading ? undefined : leadId, brief?.ffe);
  const { data: proposals = [], isLoading: propLoading } = useLeadProposals(leadId);
  const create = useCreateProposal();
  const save = useSaveProposal();
  const setStatus = useProposalStatus();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalDocument | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const synced = useRef<string | null>(null);

  const row = proposals.find((p) => p.id === selectedId) ?? proposals[0];
  const style = (brief?.style as { primaryStyle?: string } | null)?.primaryStyle?.trim() || lead?.style?.trim() || "Contemporary";
  const quote = costing?.status === "Quoted" ? { version: costing.version, options: costing.options } : null;
  const ready = !designLoading && !costingLoading && !itemsLoading && !propLoading;

  // Keep it in sync: a new GM quote or a newly shared design is pulled in (unsaved) when the proposal opens.
  useEffect(() => {
    if (!row || !ready || synced.current === row.id) return;
    synced.current = row.id;
    let doc = row.doc;
    const found: string[] = [];
    if (quote && doc.quoteVersion !== quote.version) {
      doc = applyQuote(doc, quote, groups ?? []);
      found.push(`Prices and items updated from GM quotation V${quote.version} — save to keep`);
    }
    if (design && doc.designId !== design.id) {
      doc = applyDesign(doc, design, style);
      found.push(`Images refreshed from design V${design.version} — save to keep`);
    }
    setDraft(found.length ? doc : null);
    setNotices(found);
    setAttempted(false);
  }, [row, ready, quote, design, groups, style]);

  const current = row ? (draft ?? row.doc) : null;
  const paths = current ? [
    current.cover.hero, current.floorPlan.path, ...current.moodBoard.map((m) => m.path), ...current.pages.flatMap((p) => p.images.map((i) => i.path)),
  ].filter((p): p is string => !!p && !p.toLowerCase().endsWith(".pdf")) : [];
  const { data: urls } = useSignedUrls(paths);
  const url = (p: string | null | undefined) => (p ? urls?.get(p) : undefined);

  const back = <Link to="/workspace/proposals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All proposals</Link>;
  if (isLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (!lead || !member) return <div className="space-y-4">{back}<p className="text-muted-foreground">This lead doesn't exist or you don't have access to it.</p></div>;

  const canEdit = member.role === "gm" || lead.sales_id === member.user_id;
  const editable = canEdit && row?.status === "Draft";
  const dirty = !!draft;
  const locked = current?.quoteVersion != null;

  /* ---- gate ---- */
  const designOk = design?.status === "Accepted" && current?.designId === design.id;
  const quoteOk = !!quote && current?.quoteVersion === quote.version;
  const designText = !design ? "waiting for designer" : design.status === "Accepted" ? `V${design.version} accepted` : `V${design.version} shared — accept it to finalise`;
  const quoteText = quote ? `GM quote V${quote.version} · prices locked` : "waiting for GM — prices below are budget placeholders";
  const markOf = (ok: boolean): Mark => (ok ? "ok" : attempted ? "block" : "wait");

  const change = (doc: ProposalDocument) => { setDraft({ ...doc, finalAt: null }); };
  const persist = async (doc: ProposalDocument) => {
    if (!row) return false;
    try {
      await save.mutateAsync({ id: row.id, leadId: lead.id, doc });
      setDraft(null); setNotices([]);
      return true;
    } catch (e) { toast.error(errMsg(e, "Could not save")); return false; }
  };
  const saveAsRevision = async () => {
    if (!current) return;
    try {
      const nextVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      const id = await create.mutateAsync({ leadId: lead.id, doc: current, by: member.user_id, nextVersion });
      synced.current = id; setSelectedId(id); setDraft(null); setNotices([]);
      toast.success(`Saved as revision V${nextVersion}`);
    } catch (e) { toast.error(errMsg(e, "Could not save revision")); }
  };
  const generate = async () => {
    try {
      const doc = buildDocument({ lead, style, design: design ?? null, quote, groups: groups ?? [] });
      const nextVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      const id = await create.mutateAsync({ leadId: lead.id, doc, by: member.user_id, nextVersion });
      synced.current = id; setSelectedId(id); setDraft(null); setNotices([]);
      toast.success(`Proposal V${nextVersion} created`);
    } catch (e) { toast.error(errMsg(e, "Could not generate proposal")); }
  };
  const finalise = async () => {
    if (!current) return;
    if (!designOk || !quoteOk) {
      setAttempted(true);
      const missing = [!designOk && "the design is not accepted", !quoteOk && "the GM quotation is not set"].filter(Boolean).join(" and ");
      toast.error(`Can't finalise yet — design must be accepted and GM quotation set. Still missing: ${missing}.`);
      return;
    }
    const ok = await persist({ ...current, finalAt: new Date().toISOString() });
    if (ok) window.setTimeout(() => window.print(), 300);
  };
  const opts = row?.doc.investment.options ?? [];
  const acceptWith = (i: number) => {
    const o = opts[i];
    if (!row || !o) return;
    setStatus.mutate({ id: row.id, leadId: lead.id, status: "Accepted", acceptedOption: { index: i, label: o.label, desc: o.desc, amount: Number(o.amount) || 0 } }, {
      onSuccess: () => { toast.success(`Marked Accepted · ${o.label}`); setPicking(null); }, onError: (e) => toast.error(errMsg(e, "Failed")),
    });
  };
  // With 2+ options sales must record which one the client took; a single option is taken automatically.
  const clientAccepted = () => (opts.length > 1 ? setPicking(-1) : opts.length === 1 ? acceptWith(0) : toast.error("This proposal has no quote option to accept."));
  const acceptedRow = proposals.find((p) => p.status === "Accepted");
  const openContract = () => {
    if (acceptedRow) { navigate(`/workspace/contracts/${lead.id}`); return; }
    const st = proposals[0]?.status ?? "missing";
    toast.error(`Can't generate the contract yet — the proposal must be Accepted by the client. It is currently ${st}${st === "Draft" ? " (finalise it, then Mark sent)" : st === "Sent" ? " (record Client accepted)" : ""}.`);
  };
  const markStatus = (s: ProposalStatus) => row && setStatus.mutate({ id: row.id, leadId: lead.id, status: s }, {
    onSuccess: () => toast.success(`Marked ${s}`), onError: (e) => toast.error(errMsg(e, "Failed")),
  });

  if (!row || !current) {
    return (
      <div className="space-y-4">
        {back}
        <h2 className="font-heading text-2xl uppercase tracking-wide">{lead.name}</h2>
        {canEdit ? (
          <div className="space-y-3 rounded-[var(--radius)] border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No proposal yet. It is generated from the latest shared design, the FF&E list and the GM's quotation.</p>
            <Button onClick={generate} disabled={create.isPending || !ready}>{create.isPending ? "Generating…" : "Generate proposal"}</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">No proposal yet. Only the lead's sales owner or the GM can generate one.</p>}
      </div>
    );
  }

  /* ---- doc editing helpers ---- */
  const d = current;
  const setCover = (p: Partial<ProposalDocument["cover"]>) => change({ ...d, cover: { ...d.cover, ...p } });
  const setToggle = (p: Partial<ProposalDocument["toggles"]>) => change({ ...d, toggles: { ...d.toggles, ...p } });
  const setInv = (p: Partial<ProposalDocument["investment"]>) => change({ ...d, investment: { ...d.investment, ...p } });
  const setPage = (i: number, p: Partial<ProposalDocument["pages"][number]>) => change({ ...d, pages: d.pages.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const movePage = (i: number, dir: -1 | 1) => {
    const pages = [...d.pages]; const j = i + dir;
    if (j < 0 || j >= pages.length) return;
    [pages[i], pages[j]] = [pages[j], pages[i]];
    change({ ...d, pages });
  };
  const setGroup = (i: number, p: Partial<ProposalDocument["itemList"][number]>) => change({ ...d, itemList: d.itemList.map((g, j) => (j === i ? { ...g, ...p } : g)) });
  const upload = async (f: File) => (await uploadToWorkspace(`designs/${lead.id}/proposal`, f)).path;
  const layout = layoutSheets(d);

  return (
    <div className="space-y-4">
      <style>{PROPOSAL_CSS}</style>

      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          {back}
          <h2 className="font-heading text-2xl uppercase tracking-wide break-words">Proposal · {lead.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ProposalPill status={row.status} /> <span>V{row.version}</span>
            {d.finalAt && !dirty ? <span className="font-medium text-success">Final · ready to share · {shortDate(d.finalAt)}</span> : <span>Draft</span>}
            {dirty && <span>· unsaved changes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposals.length > 1 && (
            <select aria-label="Revision" className="h-9 rounded-[var(--radius)] border border-border bg-background px-2 text-sm"
              value={row.id} onChange={(e) => { setSelectedId(e.target.value); setDraft(null); }}>
              {proposals.map((p) => <option key={p.id} value={p.id}>V{p.version} · {p.status}</option>)}
            </select>
          )}
          {canEdit && row.status === "Draft" && d.finalAt && !dirty && <Button variant="outline" onClick={() => markStatus("Sent")}>Mark sent</Button>}
          {canEdit && row.status === "Sent" && <><Button variant="outline" onClick={clientAccepted}>Client accepted</Button><Button variant="outline" onClick={() => markStatus("Rejected")}>Client rejected</Button></>}
          {row.status === "Accepted" && row.accepted_option && <span className="self-center text-xs text-muted-foreground">Client chose {row.accepted_option.label}</span>}
          {canEdit && <Button variant="outline" onClick={openContract}>Generate contract</Button>}
          {d.finalAt && !dirty
            ? <Button onClick={() => window.print()}>Download PDF</Button>
            : canEdit && <Button onClick={finalise} disabled={save.isPending}>Finalise &amp; download</Button>}
        </div>
      </div>

      {/* gate */}
      <div className="grid gap-2 md:grid-cols-2">
        <Chip label="Design" text={designText} mark={markOf(designOk)} />
        <Chip label="Quotation" text={quoteText} mark={markOf(quoteOk)} />
      </div>
      {notices.map((n) => <p key={n} className="rounded-[var(--radius)] border border-warning/50 bg-warning/10 px-3 py-2 text-sm">{n}</p>)}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* rail */}
        <aside className="rounded-[var(--radius)] border border-border bg-card px-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <fieldset disabled={!editable} className="min-w-0 disabled:opacity-80">
            <RailSection title="Cover">
              <Field label="Client"><Input value={d.cover.client} onChange={(e) => setCover({ client: e.target.value })} /></Field>
              <Field label="Scope"><Input value={d.cover.scope} onChange={(e) => setCover({ scope: e.target.value })} /></Field>
              <Field label="Location"><Input value={d.cover.location} onChange={(e) => setCover({ location: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date"><Input type="date" value={d.cover.date} onChange={(e) => setCover({ date: e.target.value })} /></Field>
                <Field label="Validity"><Input value={d.cover.validity} onChange={(e) => setCover({ validity: e.target.value })} /></Field>
              </div>
              <Field label="Introduction"><Textarea rows={4} value={d.cover.intro} onChange={(e) => setCover({ intro: e.target.value })} /></Field>
            </RailSection>

            <RailSection title="Pages">
              <Toggle label="Floor plan" checked={d.toggles.floorPlan} onChange={(v) => setToggle({ floorPlan: v })} />
              <Toggle label="Mood board" checked={d.toggles.moodBoard} onChange={(v) => setToggle({ moodBoard: v })} />
              <Toggle label="Everything included" checked={d.toggles.itemList} onChange={(v) => setToggle({ itemList: v })} />
              <Toggle label="Your investment" checked={d.toggles.investment} onChange={(v) => setToggle({ investment: v })} />
              {layout.canCombine && (
                <Toggle label="Combine item list & investment" checked={layout.combined} onChange={(v) => setToggle({ combine: v })}
                  hint={d.toggles.combine == null
                    ? <span className="ml-1 text-xs text-muted-foreground">(auto)</span>
                    : <button type="button" className="ml-1 text-xs text-primary underline" onClick={() => setToggle({ combine: null })}>auto</button>} />
              )}
            </RailSection>

            <RailSection title="Floor plan">
              <Field label="Description"><Textarea rows={4} value={d.floorPlan.text} onChange={(e) => change({ ...d, floorPlan: { ...d.floorPlan, text: e.target.value } })} /></Field>
              {d.floorPlan.path && <ImageStrip images={[{ path: d.floorPlan.path, caption: null }]} url={(p) => url(p)}
                onRemove={editable ? () => change({ ...d, floorPlan: { ...d.floorPlan, path: null, name: null } }) : undefined} />}
              {editable && <UploadButton label={d.floorPlan.path ? "Replace plan" : "Upload plan"}
                onFile={async (f) => { const path = await upload(f); change({ ...d, floorPlan: { ...d.floorPlan, path, name: f.name } }); }} />}
            </RailSection>

            <RailSection title="Render pages">
              {d.pages.map((p, i) => (
                <div key={p.id} className="space-y-2 rounded-[var(--radius)] border border-border p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-muted-foreground">Area {String(i + 1).padStart(2, "0")}</span>
                    {editable && (
                      <div className="flex">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Move up" disabled={i === 0} onClick={() => movePage(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Move down" disabled={i === d.pages.length - 1} onClick={() => movePage(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Delete ${p.title}`} onClick={() => change({ ...d, pages: d.pages.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                  <Input aria-label="Page title" value={p.title} onChange={(e) => setPage(i, { title: e.target.value })} />
                  <Textarea aria-label="Page description" rows={3} value={p.desc} onChange={(e) => setPage(i, { desc: e.target.value })} />
                  <ImageStrip images={p.images} url={(x) => url(x)} onRemove={editable ? (k) => setPage(i, { images: p.images.filter((_, j) => j !== k) }) : undefined} />
                  {editable && <UploadButton label="Add image" onFile={async (f) => { const path = await upload(f); setPage(i, { images: [...p.images, { path, caption: null }] }); }} />}
                </div>
              ))}
              {editable && (
                <Button type="button" variant="outline" size="sm" onClick={() => change({ ...d, pages: [...d.pages, { id: newId(), area: null, title: "New page", desc: "", images: [] }] })}>
                  <Plus className="h-4 w-4" /> Add new page
                </Button>
              )}
            </RailSection>

            <RailSection title="Item list">
              {d.itemList.map((g, i) => (
                <div key={i} className="space-y-1.5 rounded-[var(--radius)] border border-border p-3">
                  <div className="flex gap-1">
                    <Input aria-label="Group name" value={g.room} onChange={(e) => setGroup(i, { room: e.target.value })} />
                    {editable && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${g.room}`} onClick={() => change({ ...d, itemList: d.itemList.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  {g.items.map((it, k) => (
                    <div key={k} className="flex gap-1">
                      <Input aria-label="Item" className="h-8 text-xs" value={it.item} onChange={(e) => setGroup(i, { items: g.items.map((x, j) => (j === k ? { ...x, item: e.target.value } : x)) })} />
                      <Input aria-label="Qty" type="number" min={0} className="h-8 w-16 text-xs tabular-nums" value={it.qty} onChange={(e) => setGroup(i, { items: g.items.map((x, j) => (j === k ? { ...x, qty: Number(e.target.value) || 0 } : x)) })} />
                      {editable && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Remove ${it.item}`} onClick={() => setGroup(i, { items: g.items.filter((_, j) => j !== k) })}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                  ))}
                  {editable && <Button type="button" variant="ghost" size="sm" onClick={() => setGroup(i, { items: [...g.items, { item: "", qty: 1 }] })}><Plus className="h-4 w-4" /> Item</Button>}
                </div>
              ))}
              {editable && <Button type="button" variant="outline" size="sm" onClick={() => change({ ...d, itemList: [...d.itemList, { room: "New group", items: [] }] })}><Plus className="h-4 w-4" /> Add group</Button>}
            </RailSection>

            <RailSection title="Investment">
              <div className="grid grid-cols-2 gap-2">
                <Field label="VAT %"><Input type="number" min={0} value={d.investment.vat} onChange={(e) => setInv({ vat: Number(e.target.value) || 0 })} /></Field>
                <Field label="Downpayment %"><Input type="number" min={0} max={100} value={d.investment.down} onChange={(e) => setInv({ down: Math.min(100, Number(e.target.value) || 0) })} /></Field>
              </div>
              {locked && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Prices come from GM quotation V{d.quoteVersion} and can't be changed here.</p>}
              {d.investment.options.map((o, i) => (
                <div key={i} className="space-y-1.5 rounded-[var(--radius)] border border-border p-3">
                  <div className="flex gap-1">
                    <Input aria-label="Option label" value={o.label} onChange={(e) => setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    {editable && !locked && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${o.label}`} onClick={() => setInv({ options: d.investment.options.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  <Input aria-label="Option description" value={o.desc} onChange={(e) => setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
                  <Field label={locked ? "Price (AED, excl. VAT) — locked" : "Budget placeholder (AED, excl. VAT)"}>
                    <Input aria-label="Price" type="number" min={0} className="tabular-nums" value={o.amount} readOnly={locked} disabled={locked}
                      onChange={(e) => { if (!locked) setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) }); }} />
                  </Field>
                </div>
              ))}
              {editable && !locked && (
                <Button type="button" variant="outline" size="sm" onClick={() => setInv({ options: [...d.investment.options, { label: `Option ${String.fromCharCode(65 + d.investment.options.length)}`, desc: "", amount: 0 }] })}>
                  <Plus className="h-4 w-4" /> Add option
                </Button>
              )}
              <Field label="Terms"><Textarea rows={5} value={d.investment.terms} onChange={(e) => setInv({ terms: e.target.value })} /></Field>
            </RailSection>
          </fieldset>

          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-card py-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/workspace/proposals")}>Close</Button>
            {editable && <Button type="button" variant="outline" disabled={!dirty || save.isPending} onClick={() => current && persist(current).then((ok) => ok && toast.success("Saved"))}>Save</Button>}
            {canEdit && <Button type="button" variant="outline" disabled={create.isPending} onClick={saveAsRevision}>Save as new revision</Button>}
          </div>
        </aside>

        {/* preview */}
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius)]">
          <ProposalPages doc={d} url={url} />
        </div>
      </div>

      {picking !== null && (
        <div role="dialog" aria-modal="true" aria-label="Which option did the client accept?" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setPicking(null)}>
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius)] border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-xl uppercase tracking-wide">Which option did the client accept?</h3>
            <p className="text-sm text-muted-foreground">The contract price comes from this option.</p>
            <div className="space-y-2">
              {opts.map((o, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-3 has-[:checked]:border-primary">
                  <input type="radio" name="accepted-option" checked={picking === i} onChange={() => setPicking(i)} className="mt-1" />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{o.label}</span><span className="block text-xs text-muted-foreground">{o.desc}</span></span>
                  <span className="text-sm tabular-nums">AED {Math.round(Number(o.amount) || 0).toLocaleString("en-US")}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPicking(null)}>Cancel</Button>
              <Button disabled={picking < 0 || setStatus.isPending} onClick={() => acceptWith(picking)}>Mark accepted</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalDoc;
