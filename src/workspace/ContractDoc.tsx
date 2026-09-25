import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/aziza-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBrief, useLead, useMembers } from "./queries";
import { useWorkspace } from "./WorkspaceProvider";
import { useLeadProposals, useProposalItems } from "./proposalQueries";
import { useCreateContract, useLeadContracts, useSaveContract, type ContractStatus } from "./contractQueries";
import {
  CATEGORIES, CONTRACT_UNIT_TYPES, SELLER, SIGNATURE_COPY, USE_TYPES, aedWhole, buildContract, contractMoney, fillClause, makeSection,
  newClause, newItem, paymentSentence, preflight, priceSentence, projectLabel, standardClauses, templateFor,
  type ContractDocument, type CSection,
} from "./contractModel";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

/* ---------------- print + document CSS ---------------- */

const CSS = `
.ctr { font-family: 'Montserrat', sans-serif; font-size: 10.5px; line-height: 1.65; color: hsl(var(--foreground)); background: hsl(var(--card)); }
.ctr-sheet { width: 794px; max-width: 100%; margin: 0 auto; padding: 0.7in; box-shadow: 0 1px 12px hsl(var(--foreground) / 0.12); }
.ctr-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid hsl(var(--border-soft)); padding-bottom: 8px; margin-bottom: 22px; }
.ctr-head img { width: 42px; height: 42px; object-fit: contain; }
.ctr-head span { font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: hsl(var(--fg-2)); }
.ctr-foot { display: flex; justify-content: space-between; border-top: 1px solid hsl(var(--border-soft)); padding-top: 6px; margin-top: 28px;
  font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--fg-2)); }
.ctr-serif { font-family: 'Cormorant Garamond', serif; }
.ctr-title { text-align: center; margin-bottom: 20px; }
.ctr-eyebrow { font-size: 8.5px; letter-spacing: 0.24em; text-transform: uppercase; color: hsl(var(--secondary)); margin: 0 0 6px; }
.ctr-h1 { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: hsl(var(--primary)); margin: 0; line-height: 1.1; }
.ctr-rule { width: 64px; height: 2px; background: hsl(var(--primary)); margin: 10px auto 0; }
.ctr-h2 { font-family: 'Cormorant Garamond', serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: hsl(var(--primary)); margin: 16px 0 4px; font-weight: 600; }
.ctr p { margin: 0 0 8px; }
.ctr-indent { padding-left: 18px; font-weight: 500; }
.ctr-clause { break-inside: avoid; orphans: 3; widows: 3; margin: 12px 0; }
.ctr-small { font-size: 9.2px; }
.ctr-goods { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 8px 0 10px; }
.ctr-goods tr { break-inside: avoid; }
.ctr-goods th { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 8.5px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; padding: 6px 10px; text-align: left; }
.ctr-goods th.q, .ctr-goods td.q { text-align: right; width: 22%; }
.ctr-goods td { padding: 5px 10px; border-bottom: 1px solid hsl(var(--border-soft)); }
.ctr-goods td.sec { background: hsl(var(--surface-warm)); font-family: 'Cormorant Garamond', serif; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(var(--primary)); font-weight: 600; }
.ctr-goods td.sum { text-align: right; border-bottom: none; }
.ctr-fig { font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 600; color: hsl(var(--primary)); }
.ctr-bank { background: hsl(var(--surface-warm)); border: 1px solid hsl(var(--border-soft)); display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; padding: 10px 14px; margin: 6px 0 4px; break-inside: avoid; }
.ctr-label { font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: hsl(var(--fg-2)); display: block; }
.ctr-pay { border: 1px solid hsl(var(--primary)); background: hsl(var(--surface-warm)); padding: 10px 14px; break-inside: avoid; }
.ctr-strip { display: flex; border-top: 1px solid hsl(var(--primary)); margin-top: 8px; }
.ctr-strip > div { flex: 1; padding: 8px 10px 2px; }
.ctr-strip > div + div { border-left: 1px solid hsl(var(--primary)); }
.ctr-strip b { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 600; color: hsl(var(--primary)); display: block; }
.ctr-sign { margin-top: 26px; break-inside: avoid; }
.ctr-sign > p { margin: 0 0 22px; }
.ctr-sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
.ctr-sign h3 { font-family: 'Cormorant Garamond', serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: hsl(var(--primary)); border-bottom: 1px solid hsl(var(--primary)); padding-bottom: 4px; margin: 0 0 14px; font-weight: 600; }
.ctr-line { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 14px; }
.ctr-line span:last-child { flex: 1; border-bottom: 1px solid hsl(var(--foreground) / 0.5); min-height: 16px; padding-left: 4px; }
.ctr-pf { display: none; }
.ctr-spacer-h { height: 64px; } .ctr-spacer-f { height: 36px; }
.ctr-layout { width: 100%; border-collapse: collapse; } .ctr-layout > thead, .ctr-layout > tfoot { display: none; }
@media print {
  @page { size: A4; margin: 0.7in; }
  html, body { background: hsl(var(--card)) !important; }
  body * { visibility: hidden !important; }
  [data-contract-root], [data-contract-root] * { visibility: visible !important; }
  [data-contract-root] { position: absolute; left: 0; top: 0; width: 100%; }
  .ctr-sheet { width: auto; padding: 0; box-shadow: none; }
  .ctr-sheet > .ctr-head, .ctr-sheet > .ctr-foot { display: none; }
  .ctr-pf { display: flex; position: fixed; left: 0; right: 0; margin: 0; background: hsl(var(--card)); }
  .ctr-pf.ctr-head { top: 0; } .ctr-pf.ctr-foot { bottom: 0; }
  .ctr-layout > thead { display: table-header-group; } .ctr-layout > tfoot { display: table-footer-group; }
}
`;

/* ---------------- the document ---------------- */

const Head = ({ d, fixed }: { d: ContractDocument; fixed?: boolean }) => (
  <div className={fixed ? "ctr-head ctr-pf" : "ctr-head"}><img src={logo} alt="Aziza Home" /><span>Sales Agreement · {projectLabel(d) || "—"}</span></div>
);
const Foot = ({ fixed }: { fixed?: boolean }) => (
  <div className={fixed ? "ctr-foot ctr-pf" : "ctr-foot"}><span>Aziza Home L.L.C-FZ · Dubai, UAE</span><span>azizahomes.com · +971 55 977 9635</span></div>
);

const longDate = (iso: string) => {
  const dt = new Date(`${iso}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const ContractPaper = ({ d }: { d: ContractDocument }) => {
  const m = contractMoney(d);
  const proj = projectLabel(d);
  return (
    <div className="ctr contract-doc" data-contract-root>
      <style>{CSS}</style>
      <Head d={d} fixed /><Foot fixed />
      <div className="ctr-sheet">
        <Head d={d} />
        <table className="ctr-layout">
          <thead><tr><td><div className="ctr-spacer-h" /></td></tr></thead>
          <tfoot><tr><td><div className="ctr-spacer-f" /></td></tr></tfoot>
          <tbody><tr><td>
            <div className="ctr-title">
              <p className="ctr-eyebrow">{[proj, d.unitType, d.useType].filter(Boolean).join(" · ")}</p>
              <h1 className="ctr-h1">Sales Agreement</h1>
              <div className="ctr-rule" />
            </div>
            <p>
              This Sales Agreement (the "Agreement") is entered into <b>{longDate(d.date)}</b> (the "Effective Date"), by and between <b>{SELLER}</b>, with an address of 6th Floor, Business Center, The Meydan Hotel Grandstand, Meydan Road, Nad Al Sheba Dubai, UAE (the "Seller") and <b>{d.client || "—"}</b>, with an address of Unit {d.unit || "—"}, {proj || "—"}, Dubai, UAE, (the "Buyer"), also individually referred to as "Party", and collectively "the Parties."
            </p>
            <h2 className="ctr-h2">Background</h2>
            <p>The Seller is the manufacturer/distributor of the following product(s):</p>
            <p className="ctr-indent">Home Furniture and Service;</p>
            <p>and</p>
            <p>The Buyer wishes to purchase the aforementioned product(s).</p>
            <p><b>THEREFORE, the Parties agree as follows:</b></p>

            <div style={{ margin: "12px 0" }}>
              <p><b>1. Sale of Goods.</b> The Seller shall make available for sale and the Buyer shall purchase (the "Goods"):</p>
              <table className="ctr-goods">
                <thead><tr><th>Item</th><th className="q">Qty</th></tr></thead>
                <tbody>
                  {d.sections.map((s) => [
                    <tr key={s.id}><td className="sec" colSpan={2}>{s.title}</td></tr>,
                    ...s.items.map((i) => <tr key={i.id}><td>{i.item}</td><td className="q">{i.qty}</td></tr>),
                  ])}
                  <tr><td className="sum">Total</td><td className="q sum"><span className="ctr-fig">{aedWhole(m.subtotal)}</span></td></tr>
                  <tr><td className="sum">VAT (5%)</td><td className="q sum"><span className="ctr-fig">{d.vatCharged ? aedWhole(m.vat) : "Waived"}</span></td></tr>
                </tbody>
              </table>
              {d.vatCharged && (
                <div className="ctr-bank">
                  <div><span className="ctr-label">Account Name</span><b>AZIZA HOME L.L.C-FZ</b></div>
                  <div><span className="ctr-label">IBAN</span><b>AE5 1086 0000009598140131</b></div>
                  <div><span className="ctr-label">Bank Name</span><b>WIO</b></div>
                  <div><span className="ctr-label">Swift Code</span><b>WIOBAEADXXX</b></div>
                </div>
              )}
            </div>

            {d.clauses.map((c, i) => {
              const n = i + 2;
              if (c.key === "price") {
                return (
                  <div key={c.id} className="ctr-clause ctr-pay ctr-small">
                    <p><b>{n}. {c.title}.</b> {priceSentence(d)} {paymentSentence(d)} {fillClause(c.body, d)}</p>
                    <div className="ctr-strip">
                      <div><span className="ctr-label">Total incl. VAT</span><b>{aedWhole(m.total)}</b></div>
                      <div><span className="ctr-label">{m.dep}% on signing</span><b>{aedWhole(m.depA)}</b></div>
                      {m.del > 0 && <div><span className="ctr-label">{m.del}% on delivery</span><b>{aedWhole(m.delA)}</b></div>}
                      <div><span className="ctr-label">{m.bal}% on handover</span><b>{aedWhole(m.balA)}</b></div>
                    </div>
                  </div>
                );
              }
              return <div key={c.id} className="ctr-clause ctr-small"><p style={{ whiteSpace: "pre-line" }}><b>{n}. {c.title}.</b> {fillClause(c.body, d)}</p></div>;
            })}

            <div className="ctr-sign">
              <p>{SIGNATURE_COPY.sig}</p>
              <div className="ctr-sign-grid">
                {[[SIGNATURE_COPY.buyer, d.client], [SIGNATURE_COPY.seller, SELLER]].map(([h, name]) => (
                  <div key={h}>
                    <h3>{h}</h3>
                    <div className="ctr-line"><span>{SIGNATURE_COPY.signed}</span><span /></div>
                    <div className="ctr-line"><span>{SIGNATURE_COPY.name}</span><span>{name}</span></div>
                    <div className="ctr-line"><span>{SIGNATURE_COPY.date}</span><span /></div>
                  </div>
                ))}
              </div>
            </div>
          </td></tr></tbody>
        </table>
        <Foot />
      </div>
    </div>
  );
};

/* ---------------- editor ---------------- */

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <details open className="rounded-[var(--radius)] border border-border bg-card">
    <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</summary>
    <div className="space-y-3 border-t border-border p-3">{children}</div>
  </details>
);
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>
);
const sel = "h-9 w-full rounded-[var(--radius)] border border-input bg-background px-2 text-sm";

type Confirm = { title: string; body: string; run: () => void } | null;

export const CONTRACT_TONE: Record<ContractStatus, string> = {
  Draft: "border-border text-muted-foreground", Issued: "bg-secondary/30 text-foreground border-transparent", Signed: "bg-primary/10 text-primary border-transparent",
};

const ContractDoc = () => {
  const { leadId } = useParams();
  const { member } = useWorkspace();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: members = [] } = useMembers();
  const { data: brief, isLoading: bLoading } = useBrief(leadId);
  const { data: proposals = [], isLoading: pLoading } = useLeadProposals(leadId);
  const { data: contracts = [], isLoading: cLoading, error: cError } = useLeadContracts(leadId);
  const { data: briefGroups = [], isLoading: gLoading } = useProposalItems(leadId, brief?.ffe ?? null);
  const create = useCreateContract();
  const save = useSaveContract();
  const [draft, setDraft] = useState<ContractDocument | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const accepted = proposals.find((p) => p.status === "Accepted");
  const back = accepted
    ? <Link to={`/workspace/proposals/${leadId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Proposal</Link>
    : <Link to={`/workspace/leads/${leadId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Lead</Link>;
  if (isLoading || pLoading || cLoading || bLoading || gLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (!lead || !member || member.role === "designer") return <div className="space-y-4">{back}<p className="text-muted-foreground">You don't have access to this contract.</p></div>;
  if (cError) return <div className="space-y-4">{back}<p className="text-destructive">{(cError as Error).message}</p></div>;

  const canEdit = member.role === "gm" || lead.sales_id === member.user_id;
  const row = contracts[0];

  if (!row) {
    // Route A: an accepted proposal exists → price locked to the accepted quote option.
    const fromProposal = async () => {
      if (!accepted) return;
      const opts = accepted.doc.investment.options;
      const opt = accepted.accepted_option ?? (opts.length === 1 ? { label: opts[0].label, amount: Number(opts[0].amount) } : null);
      if (!opt) { toast.error("Can't generate the contract — record which quote option the client accepted on the proposal."); return; }
      const doc = buildContract({
        lead, unit: null, option: opt, vat: accepted.doc.investment.vat, down: accepted.doc.investment.down, groups: accepted.doc.itemList,
      });
      try { await create.mutateAsync({ leadId: lead.id, proposalId: accepted.id, doc, by: member.user_id, version: 1 }); toast.success("Contract created"); }
      catch (e) { toast.error(errMsg(e, "Could not create the contract")); }
    };
    // Route B: direct from the lead — items from the brief (or the unit template), subtotal left for sales to type.
    const direct = async () => {
      const doc = buildContract({ lead, unit: null, option: null, vat: 5, down: 80, groups: briefGroups });
      if (!doc.sections.length) doc.sections = templateFor(doc.unitType);
      try { await create.mutateAsync({ leadId: lead.id, proposalId: null, doc, by: member.user_id, version: 1 }); toast.success("Direct contract created — enter the subtotal"); }
      catch (e) { toast.error(errMsg(e, "Could not create the contract")); }
    };
    return (
      <div className="space-y-4">
        {back}
        <h2 className="font-heading text-2xl uppercase tracking-wide">Contract · {lead.name}</h2>
        <div className="space-y-3 rounded-[var(--radius)] border border-dashed border-border p-8 text-center">
          {accepted ? (
            <p className="text-sm text-muted-foreground">Generated from accepted proposal V{accepted.version}{accepted.accepted_option ? ` · ${accepted.accepted_option.label}` : ""} — the price is the GM's quoted option.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Direct contract — no proposal or GM quotation. Client details come from the lead, items from {briefGroups.length ? "the requirement brief" : `the standard ${lead.unit_type || "2 Bedroom"} list`}; you type the subtotal.
            </p>
          )}
          {canEdit ? (
            <Button onClick={accepted ? fromProposal : direct} disabled={create.isPending}>{create.isPending ? "Generating…" : "Generate contract"}</Button>
          ) : <p className="text-sm text-muted-foreground">Only the lead's sales owner or the GM can generate the contract.</p>}
        </div>
      </div>
    );
  }

  const isDirect = row.source === "direct";
  const d = draft ?? row.doc;
  const editable = canEdit && row.status !== "Signed";
  const change = (p: Partial<ContractDocument>) => setDraft({ ...d, ...p });
  const m = contractMoney(d);
  const setSec = (i: number, p: Partial<CSection>) => change({ sections: d.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const moveSec = (i: number, dir: -1 | 1) => {
    const s = [...d.sections]; const j = i + dir; if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]]; change({ sections: s });
  };
  const persist = async () => {
    try { await save.mutateAsync({ id: row.id, leadId: lead.id, doc: d }); setDraft(null); toast.success("Contract saved"); }
    catch (e) { toast.error(errMsg(e, "Could not save")); }
  };
  const setStatus = async (status: ContractStatus) => {
    // Every other client-facing price comes from the GM; a direct contract's doesn't, so the GM hears when one goes out.
    const notify = isDirect && status === "Issued"
      ? members.filter((x) => x.role === "gm" && x.active && x.user_id !== member.user_id)
          .map((x) => ({ user_id: x.user_id, title: `Direct contract issued · ${lead.name} · ${aedWhole(m.total)}`, body: "Price set by sales — no GM quotation." }))
      : undefined;
    try { await save.mutateAsync({ id: row.id, leadId: lead.id, status, doc: draft ?? undefined, notify }); setDraft(null); toast.success(`Marked ${status}`); }
    catch (e) { toast.error(errMsg(e, "Failed")); }
  };
  const print = () => {
    const missing = preflight(d);
    if (missing.length) setConfirm({ title: "Some details are missing", body: `Missing: ${missing.join(", ")}. Print anyway?`, run: () => window.setTimeout(() => window.print(), 200) });
    else window.print();
  };
  const dis = !editable;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          {back}
          <h2 className="font-heading text-2xl uppercase tracking-wide break-words">Contract · {lead.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 ${CONTRACT_TONE[row.status]}`}>{row.status}</span>
            <span>V{row.version}</span>
            {isDirect
              ? <span className="inline-flex rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-foreground">Direct contract · no GM quotation</span>
              : d.optionLabel && <span>· {d.optionLabel}</span>}
            {draft && <span>· unsaved changes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && row.status === "Draft" && <Button variant="outline" onClick={() => setStatus("Issued")}>Mark issued</Button>}
          {canEdit && row.status === "Issued" && <Button variant="outline" onClick={() => setStatus("Signed")}>Mark signed</Button>}
          {editable && <Button variant="outline" disabled={!draft || save.isPending} onClick={persist}>Save</Button>}
          <Button onClick={print}>Save as PDF / Print</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Section title="Parties & property">
            <Field label="Client name"><Input disabled={dis} value={d.client} onChange={(e) => change({ client: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit no."><Input disabled={dis} value={d.unit} onChange={(e) => change({ unit: e.target.value })} /></Field>
              <Field label="Building"><Input disabled={dis} value={d.building} onChange={(e) => change({ building: e.target.value })} /></Field>
            </div>
            <Field label="Project"><Input disabled={dis} value={d.project} onChange={(e) => change({ project: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit type">
                <select className={sel} disabled={dis} value={d.unitType} onChange={(e) => change({ unitType: e.target.value })}>
                  {!CONTRACT_UNIT_TYPES.includes(d.unitType) && <option value={d.unitType}>{d.unitType || "—"}</option>}
                  {CONTRACT_UNIT_TYPES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Use">
                <select className={sel} disabled={dis} value={d.useType} onChange={(e) => change({ useType: e.target.value })}>
                  {USE_TYPES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Effective date"><Input type="date" disabled={dis} value={d.date} onChange={(e) => change({ date: e.target.value })} /></Field>
              <Field label="Delivery (business days)"><Input disabled={dis} value={d.deliveryDays} onChange={(e) => change({ deliveryDays: e.target.value })} /></Field>
            </div>
          </Section>

          <Section title="Price & payments">
            <Field label={isDirect ? "Subtotal ex-VAT (AED)" : "Subtotal ex-VAT (AED) — locked to GM quote"}>
              <Input type="number" min={0} placeholder="Enter the price" readOnly={!isDirect} disabled={dis || !isDirect} value={d.subtotal || ""} onChange={(e) => change({ subtotal: Number(e.target.value) })} />
            </Field>
            <label className="flex items-center justify-between text-sm">VAT 5% charged<Switch disabled={dis} checked={d.vatCharged} onCheckedChange={(v) => change({ vatCharged: v })} /></label>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Deposit %"><Input type="number" min={0} max={100} disabled={dis} value={d.deposit}
                onChange={(e) => { const dep = Math.min(100, Math.max(0, Number(e.target.value) || 0)); change({ deposit: dep, delivery: Math.min(d.delivery, 100 - dep) }); }} /></Field>
              <Field label="Delivery %"><Input type="number" min={0} max={100 - m.dep} disabled={dis} value={d.delivery}
                onChange={(e) => change({ delivery: Math.min(100 - m.dep, Math.max(0, Number(e.target.value) || 0)) })} /></Field>
              <Field label="Handover %"><Input readOnly disabled value={m.bal} aria-label="Handover percent (remainder)" /></Field>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">Total {aedWhole(m.total)} = {aedWhole(m.depA)} + {aedWhole(m.delA)} + {aedWhole(m.balA)}</p>
          </Section>

          <Section title="Goods (item table)">
            {d.sections.map((s, i) => (
              <div key={s.id} className="space-y-2 rounded-[var(--radius)] border border-border p-2">
                <div className="flex items-center gap-1">
                  <Input disabled={dis} value={s.title} aria-label="Section name" onChange={(e) => setSec(i, { title: e.target.value })} />
                  <Button type="button" size="icon" variant="ghost" disabled={dis || i === 0} onClick={() => moveSec(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" disabled={dis || i === d.sections.length - 1} onClick={() => moveSec(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" disabled={dis} aria-label="Delete section"
                    onClick={() => setConfirm({ title: `Delete "${s.title}"?`, body: `Removes the section and its ${s.items.length} item(s).`, run: () => change({ sections: d.sections.filter((_, j) => j !== i) }) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {s.items.map((it, k) => (
                  <div key={it.id} className="flex items-center gap-1">
                    <Input disabled={dis} value={it.item} placeholder="Item" aria-label="Item"
                      onChange={(e) => setSec(i, { items: s.items.map((x, j) => (j === k ? { ...x, item: e.target.value } : x)) })} />
                    <Input disabled={dis} value={it.qty} className="w-16" aria-label="Qty"
                      onChange={(e) => setSec(i, { items: s.items.map((x, j) => (j === k ? { ...x, qty: e.target.value } : x)) })} />
                    <Button type="button" size="icon" variant="ghost" disabled={dis} aria-label="Delete item" onClick={() => setSec(i, { items: s.items.filter((_, j) => j !== k) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" disabled={dis} onClick={() => setSec(i, { items: [...s.items, newItem()] })}><Plus className="mr-1 h-3 w-3" /> Add item</Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={dis} onClick={() => change({ sections: [...d.sections, makeSection("New section", [{ item: "", qty: "1" }])] })}><Plus className="mr-1 h-3 w-3" /> Add section</Button>
              <select className={`${sel} w-auto`} disabled={dis} value="" aria-label="Add category"
                onChange={(e) => { const c = CATEGORIES.find((x) => x.title === e.target.value); if (c) change({ sections: [...d.sections, makeSection(c.title, c.items())] }); }}>
                <option value="">+ Add category…</option>
                {CATEGORIES.map((c) => <option key={c.title}>{c.title}</option>)}
              </select>
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={dis}
              onClick={() => setConfirm({ title: `Reload standard list for ${d.unitType || "2 Bedroom"}?`, body: "This replaces the whole item table, including any edits.", run: () => change({ sections: templateFor(d.unitType) }) })}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reload standard list for {d.unitType || "2 Bedroom"}
            </Button>
          </Section>

          <Section title="Clauses">
            <p className="text-xs text-muted-foreground">{"{deliveryDays}"} and {"{balancePct}"} are filled in when printed. Clause 3 is preceded by the generated price and payment sentences.</p>
            {d.clauses.map((c, i) => (
              <div key={c.id} className="space-y-1 rounded-[var(--radius)] border border-border p-2">
                <div className="flex items-center gap-1">
                  <span className="w-6 text-sm tabular-nums">{i + 2}.</span>
                  <Input disabled={dis} value={c.title} aria-label="Clause title" onChange={(e) => change({ clauses: d.clauses.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                  {!c.key && <Button type="button" size="icon" variant="ghost" disabled={dis} aria-label="Delete clause" onClick={() => change({ clauses: d.clauses.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                <Textarea disabled={dis} rows={4} value={c.body} aria-label="Clause text" onChange={(e) => change({ clauses: d.clauses.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={dis} onClick={() => change({ clauses: [...d.clauses, newClause()] })}><Plus className="mr-1 h-3 w-3" /> Add clause</Button>
              <Button type="button" size="sm" variant="ghost" disabled={dis}
                onClick={() => setConfirm({ title: "Reset clauses to the standard wording?", body: "Every clause title and text returns to the standard; added clauses are removed.", run: () => change({ clauses: standardClauses() }) })}>
                <RotateCcw className="mr-1 h-3 w-3" /> Reset
              </Button>
            </div>
          </Section>
        </aside>

        <div className="overflow-x-auto rounded-[var(--radius)] bg-muted/20 p-4">
          <ContractPaper d={d} />
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm?.run(); setConfirm(null); }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContractDoc;
