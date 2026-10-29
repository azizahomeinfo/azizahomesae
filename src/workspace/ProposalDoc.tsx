import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useBrief, useLead, useLeadBudgets } from "./queries";
import { uploadToWorkspace, useSignedUrls } from "./designQueries";
import { useLeadContracts, useSaveContract } from "./contractQueries";
import { contractFromProposal } from "./contractModel";
import { RedesignDialog, RedesignStatus } from "./RedesignRequest";
import { NewProposalDialog } from "./NewProposalDialog";
import { PackageCostCheck } from "./PackageCostCheck";
import { docFileName, printAs } from "./printAs";
import { buildPackageDocument, isCatalogPath, packageLayoutFor, packagePrice, tierOfLabel, type PackageChoice } from "./packageCatalog";
import { leadOwner, useCosting } from "./ffeQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { shortDate } from "./format";
import { useKeepScroll } from "./scrollMemory";
import {
  useCreateProposal, useLeadProposals, useProposalItems, useProposalStatus, useSaveProposal, useSharedDesign,
  useSyncFfeFromProposal, useDiscountRequests, useRequestDiscount, useDecideDiscount, useSimplifyRequests, useRequestSimplify,
  type FfeSyncPlan, type ProposalStatus,
} from "./proposalQueries";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  applyDesign, applyQuote, buildDocument, isDefaultDesc, itemListDiff, layoutSheets, MAX_IMAGES_PER_PAGE, newId,
  type DocImage, type ProposalDocument,
} from "./proposalModel";
import { PROPOSAL_CSS, ProposalPages, descOverflowChars } from "./ProposalPages";

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

const imageLabel = (image: DocImage) => {
  if (image.caption?.trim()) return image.caption.trim();
  const fileName = image.path.split("/").pop() || "picture";
  try { return decodeURIComponent(fileName); } catch { return fileName; }
};

const ImageStrip = ({ images, url, onRemove, onMove, moveDisabled }: {
  images: DocImage[];
  url: (p: string) => string | undefined;
  onRemove?: (i: number) => void;
  onMove?: (i: number, direction: -1 | 1) => void;
  moveDisabled?: (i: number, direction: -1 | 1) => boolean;
}) => (
  <div className="flex flex-wrap gap-2">
    {images.map((img, i) => {
      const label = imageLabel(img);
      return (
        <div key={img.path} className="w-32 space-y-1">
          <div className="relative h-20 w-32 overflow-hidden rounded border border-border bg-muted/20">
            {url(img.path) && <img src={url(img.path)} alt="" className="h-full w-full object-contain" />}
            {onRemove && (
              <button type="button" aria-label="Remove image" onClick={() => onRemove(i)}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {onMove && (
            <div className="flex justify-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                aria-label={`Move ${label} up`} disabled={moveDisabled?.(i, -1)} onClick={() => onMove(i, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                aria-label={`Move ${label} down`} disabled={moveDisabled?.(i, 1)} onClick={() => onMove(i, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      );
    })}
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
  // Rail scrolls itself on desktop (lg:overflow-y-auto); keep its place per proposal.
  const railScrollRef = useKeepScroll(leadId ? `proposal-rail:${leadId}` : null);
  const navigate = useNavigate();
  const { member } = useWorkspace();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: brief, isLoading: briefLoading } = useBrief(leadId);
  const { data: design, isLoading: designLoading } = useSharedDesign(leadId);
  // withCost=false: sales-safe read — options, status and version only, never markup or notes.
  const { data: costing, isLoading: costingLoading } = useCosting(leadId ? leadOwner(leadId) : undefined, false);
  const { data: groups, isLoading: itemsLoading } = useProposalItems(briefLoading ? undefined : leadId, brief?.ffe);
  const { data: proposals = [], isLoading: propLoading } = useLeadProposals(leadId);
  const { data: leadContracts = [] } = useLeadContracts(leadId);
  const [redesignOpen, setRedesignOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const create = useCreateProposal();
  const save = useSaveProposal();
  const setStatus = useProposalStatus();
  // Sales and the GM only: the placeholder price of a proposal with no GM quote yet is the lead's budget.
  const leadBudget = useLeadBudgets().data?.get(leadId) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalDocument | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const synced = useRef<string | null>(null);

  const row = proposals.find((p) => p.id === selectedId) ?? proposals[0];
  const quote = costing?.status === "Quoted" ? { version: costing.version, options: costing.options } : null;
  const ready = !designLoading && !costingLoading && !itemsLoading && !propLoading;

  // Keep it in sync: a new GM quote or a newly shared design is pulled in (unsaved) when the proposal opens.
  useEffect(() => {
    if (!row || !ready || synced.current === row.id) return;
    synced.current = row.id;
    let doc = row.doc;
    const found: string[] = [];
    // A package proposal never pulls designer renders. It does take the GM's quotation once the designer → GM
    // costing round (after an item change) has produced one: that becomes its price.
    if (doc.source === "package") {
      if (quote && doc.quoteVersion !== quote.version) {
        doc = applyQuote(doc, quote, groups ?? []);
        found.push(`Items and prices updated from the GM's final quotation V${quote.version} — save to keep`);
      }
      // A budget redesign: the designer's renders join the package proposal as design pages; the catalog cover stays.
      if (design && design.status === "Accepted" && doc.designId !== design.id) {
        doc = { ...applyDesign(doc, design), cover: doc.cover };
        found.push(`Design V${design.version} added from the designer — save to keep`);
      }
      setDraft(found.length ? doc : null); setNotices(found);
      setAttempted(false);
      return;
    }
    if (quote && doc.quoteVersion !== quote.version) {
      doc = applyQuote(doc, quote, groups ?? []);
      found.push(`Prices and items updated from GM quotation V${quote.version} — save to keep`);
    }
    if (design && doc.designId !== design.id) {
      doc = applyDesign(doc, design);
      found.push(`Images refreshed from design V${design.version} — save to keep`);
    }
    setDraft(found.length ? doc : null);
    setNotices(found);
    setAttempted(false);
  }, [row, ready, quote, design, groups]);

  // Unsaved edits survive a reload, a crash or switching accounts (sign in as GM to approve, back as sales):
  // the draft is kept in this browser per proposal until it is saved. Lost item lists happened without it.
  const backupKey = row && member ? `ws:proposal-draft:${member.user_id}:${row.id}` : null;
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!backupKey || !row || !ready || synced.current !== row.id || restoredFor.current === backupKey) return;
    restoredFor.current = backupKey;
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { at: string; doc: ProposalDocument };
      if (row.status !== "Draft") { localStorage.removeItem(backupKey); return; }
      setDraft(saved.doc);
      setNotices((n) => [`Your unsaved edits from ${new Date(saved.at).toLocaleString()} were restored — press Save to keep them`, ...n]);
    } catch { /* storage blocked or corrupt: nothing to restore */ }
  }, [backupKey, row, ready]);
  useEffect(() => {
    if (!backupKey || restoredFor.current !== backupKey) return;
    try {
      if (draft) localStorage.setItem(backupKey, JSON.stringify({ at: new Date().toISOString(), doc: draft }));
      else localStorage.removeItem(backupKey);
    } catch { /* storage blocked */ }
  }, [draft, backupKey]);
  useEffect(() => {
    if (!draft) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);

  // Package costing round (sales sent item changes → designer → GM): the FF&E list is the item list. Whatever
  // the designer changes there is written into the proposal automatically — no button — and, once the GM quotes,
  // the final items and prices too. Only drafts follow; a sent proposal keeps what the client received.
  // Above the early returns: hooks below one crash the page.
  const followed = useRef<string | null>(null);
  useEffect(() => {
    if (!row || !ready || !lead || !member || row.doc.source !== "package" || row.status !== "Draft" || !costing) return;
    if (!(member.role === "gm" || lead.sales_id === member.user_id)) return;
    const open = costing.status === "Returned" || costing.status === "Submitted";
    const freshQuote = costing.status === "Quoted" && row.doc.quoteVersion !== costing.version;
    // A budget redesign the GM has approved joins the proposal as design pages, like the price — no button.
    const freshDesign = costing.status === "Quoted" && !!design && design.status === "Accepted" && row.doc.designId !== design.id;
    if (!open && !freshQuote && !freshDesign) return;
    const live = groups ?? [];
    const differs = live.length > 0 && itemListDiff(row.doc.itemList, live).differs;
    if (!differs && !freshQuote && !freshDesign) return;
    const key = `${row.id}:${costing.status}:${costing.version}:${design?.id ?? ""}:${JSON.stringify(live)}`;
    if (followed.current === key || save.isPending) return;
    followed.current = key;
    let doc = freshQuote ? applyQuote(row.doc, { version: costing.version, options: costing.options }, live) : { ...row.doc, itemList: live, finalAt: null };
    if (freshDesign && design) doc = { ...applyDesign(doc, design), cover: doc.cover };
    save.mutate({ id: row.id, leadId: row.lead_id ?? lead.id, doc }, {
      onSuccess: () => { setDraft(null); setNotices([freshQuote
        ? `Items and prices updated from the GM's final quotation V${costing.version}${freshDesign ? ` with design V${design?.version}` : ""} — saved`
        : freshDesign ? `Design V${design?.version} added from the designer — saved`
        : "Item list updated from the designer's FF&E list — saved"]); },
      onError: (e) => { followed.current = null; toast.error(e instanceof Error ? e.message : "Could not update the proposal from the FF&E list"); },
    });
  }, [row, ready, lead, member, costing, groups, save, design]);

  const current = row ? (draft ?? row.doc) : null;
  const paths = current ? [
    current.cover.hero, current.floorPlan.path, ...current.moodBoard.map((m) => m.path), ...current.pages.flatMap((p) => p.images.map((i) => i.path)),
  ].filter((p): p is string => !!p && !p.toLowerCase().endsWith(".pdf") && !isCatalogPath(p)) : [];
  const { data: urls } = useSignedUrls(paths);
  const url = (p: string | null | undefined) => (p ? (isCatalogPath(p) ? p : urls?.get(p)) : undefined);
  // Two directions now: pull the FF&E list into the proposal, or push the proposal's edits back into it.
  // Drift alone cannot say which side moved, so both are offered and the wording stays neutral.
  // These MUST stay above the early returns below — hooks after a conditional return crash the page.
  const syncFfe = useSyncFfeFromProposal();
  const [syncPlan, setSyncPlan] = useState<FfeSyncPlan | null>(null);
  // Discount loop. Also above the early returns — hooks below one crash the page.
  const { data: discounts = [] } = useDiscountRequests(leadId);
  const askDiscount = useRequestDiscount();
  const decideDiscount = useDecideDiscount();
  const saveContract = useSaveContract();
  const [askOpen, setAskOpen] = useState(false);
  const [askAmount, setAskAmount] = useState("");
  const [askLabel, setAskLabel] = useState("");
  const [askWhy, setAskWhy] = useState("");
  // "Client wants a lower price": one ask, two paths — GM discount, or the designer simplifies the list.
  const { data: simplifies = [] } = useSimplifyRequests(leadId);
  const askSimplify = useRequestSimplify();
  const [askPath, setAskPath] = useState<"discount" | "simplify">("discount");
  const [counter, setCounter] = useState("");
  const [gmNote, setGmNote] = useState("");

  const back = <Link to="/workspace/proposals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All proposals</Link>;
  if (isLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (!lead || !member) return <div className="space-y-4">{back}<p className="text-muted-foreground">This lead doesn't exist or you don't have access to it.</p></div>;

  const canEdit = member.role === "gm" || lead.sales_id === member.user_id;
  const editable = canEdit && row?.status === "Draft";
  const dirty = !!draft;
  const locked = current?.quoteVersion != null;
  // The designer resubmitted the costing after a quote: the prices this proposal carries are superseded until the GM re-quotes.
  const withdrawn = locked && !!costing && costing.status !== "Quoted";

  /* ---- gate ---- */
  // Package proposals: no designer, and the price list (less any discount the GM approved) is the floor.
  const isPackage = current?.source === "package";
  const pkgLayout = packageLayoutFor(lead.unit_type).layout;
  const pkgUnits = Math.max(1, Number(current?.pkg?.units) || 1);
  const pkgFloor = (label: string) => {
    const tier = tierOfLabel(label);
    if (!tier) return null;
    const quoted = quote?.options.find((o) => o.label === label);
    if (quoted) return Number(quoted.amount) - Math.max(0, ...discounts.filter((x) => x.status === "Approved" && x.option_label === label).map((x) => Number(x.approved_discount ?? 0)));
    const off = Math.max(0, ...discounts.filter((x) => x.status === "Approved" && x.option_label === label).map((x) => Number(x.approved_discount ?? 0)));
    return packagePrice(tier, pkgLayout) * pkgUnits - off;
  };
  const pkgBelow = isPackage ? (current?.investment.options ?? []).filter((o) => { const f = pkgFloor(o.label); return f == null || Number(o.amount) < f; }) : [];
  // Package item changes: sent to the FF&E list → designer checks costs → GM quotes. Until then, no download.
  const pkgCosting = isPackage && !!costing && (costing.status === "Returned" || costing.status === "Submitted");
  const pkgDrift = isPackage && !pkgCosting && !!current && (groups ?? []).length > 0 && itemListDiff(current.itemList, groups ?? []).differs;
  const designOk = isPackage || (design?.status === "Accepted" && current?.designId === design.id);
  const quoteOk = isPackage ? pkgBelow.length === 0 && !pkgCosting && !pkgDrift : !!quote && current?.quoteVersion === quote.version;
  const designText = isPackage ? `catalog package · ${current?.pkg?.style ?? ""}` : !design ? "waiting for designer" : design.status === "Accepted" ? `V${design.version} accepted` : `V${design.version} shared — accept it to finalise`;
  const quoteText = isPackage
    ? (pkgDrift ? "items changed — send them to the FF&E list for the designer to cost"
      : pkgCosting ? (costing?.status === "Returned" ? "with the designer — checking the costs of your item changes" : "with the GM — setting the final price")
      : pkgBelow.length ? `${pkgBelow.map((o) => o.label).join(", ")} below the price — needs GM approval`
      : quote ? `GM final price V${quote.version}` : `price list (${pkgLayout})`)
    : quote ? `GM quote V${quote.version} · prices locked` : "waiting for GM — prices below are budget placeholders";
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
      const doc = buildDocument({ lead: { ...lead, budget: leadBudget }, design: design ?? null, quote, groups: groups ?? [] });
      const nextVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      const id = await create.mutateAsync({ leadId: lead.id, doc, by: member.user_id, nextVersion });
      synced.current = id; setSelectedId(id); setDraft(null); setNotices([]);
      toast.success(`Proposal V${nextVersion} created`);
    } catch (e) { toast.error(errMsg(e, "Could not generate proposal")); }
  };
  const generatePackage = async (choice: PackageChoice) => {
    try {
      const doc = buildPackageDocument({ lead, choice });
      const nextVersion = proposals.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      const id = await create.mutateAsync({ leadId: lead.id, doc, by: member.user_id, nextVersion });
      synced.current = id; setSelectedId(id); setDraft(null); setNotices([]); setNewOpen(false);
      toast.success(`Package proposal V${nextVersion} created — edit the items, then Finalise & download`);
    } catch (e) { toast.error(errMsg(e, "Could not create the proposal")); }
  };
  const newProposalDialog = (
    <NewProposalDialog open={newOpen} onOpenChange={setNewOpen} lead={lead} design={design ?? null} pending={create.isPending}
      onDesigner={() => { void generate().then(() => setNewOpen(false)); }} onPackage={(c) => void generatePackage(c)} />
  );
  // "Aziza Home Proposal - Client - Building" as the suggested PDF name.
  const proposalFile = docFileName("Proposal", lead.name, lead.building || lead.property);
  const finalise = async () => {
    if (!current) return;
    if (!designOk || !quoteOk) {
      setAttempted(true);
      if (isPackage) {
        toast.error(pkgDrift ? "Can't download yet — you changed the item list. Press \"Send to FF&E list\": the designer checks the costs, then the GM sets the final price."
          : pkgCosting ? "Can't download yet — your item changes are with the designer / GM for costing. You'll be notified when the final price is set."
          : `Can't download yet — ${pkgBelow.map((o) => o.label).join(", ")} is below the price. Ask the GM to approve the lower price (Price and discounts, below).`);
        return;
      }
      const missing = [!designOk && "the design is not accepted", !quoteOk && "the GM quotation is not set"].filter(Boolean).join(" and ");
      toast.error(`Can't finalise yet — design must be accepted and GM quotation set. Still missing: ${missing}.`);
      return;
    }
    const ok = await persist({ ...current, finalAt: new Date().toISOString() });
    if (ok) window.setTimeout(() => printAs(proposalFile), 300);
  };
  const opts = row?.doc.investment.options ?? [];
  const acceptWith = (i: number) => {
    const o = opts[i];
    if (!row || !o) return;
    setStatus.mutate({ id: row.id, leadId: lead.id, status: "Accepted", acceptedOption: { index: i, label: o.label, desc: o.desc, amount: Number(o.amount) || 0 } }, {
      onSuccess: () => {
        toast.success(`Marked Accepted · ${o.label}`); setPicking(null);
        // A draft contract made from an older proposal follows the newly accepted one (price, option, items).
        const c = leadContracts[0];
        const older = c && c.proposal_id && c.proposal_id !== row.id && (proposals.find((p) => p.id === c.proposal_id)?.version ?? 0) < row.version;
        if (c && older && c.status === "Draft") {
          saveContract.mutate({ id: c.id, leadId: lead.id, doc: contractFromProposal(c.doc, row.doc, { label: o.label, amount: Number(o.amount) || 0 }), proposalId: row.id }, {
            onSuccess: () => toast.success(`Contract updated to V${row.version} — ${o.label} AED ${(Number(o.amount) || 0).toLocaleString()}`),
            onError: (e) => toast.error(errMsg(e, "Could not update the contract — open it and press Update")),
          });
        } else if (c && older) toast.info(`The contract is ${c.status} — open it and press "Update from V${row.version}" to take the new price and items.`);
      },
      onError: (e) => toast.error(errMsg(e, "Failed")),
    });
  };
  // With 2+ options sales must record which one the client took; a single option is taken automatically.
  const clientAccepted = () => (opts.length > 1 ? setPicking(-1) : opts.length === 1 ? acceptWith(0) : toast.error("This proposal has no quote option to accept."));
  const acceptedRow = proposals.find((p) => p.status === "Accepted");
  const openContract = () => {
    // A newer version than the accepted one (a re-quote): the contract can only follow it once the client accepts it.
    const newest = proposals[0];
    if (acceptedRow && newest && newest.version > acceptedRow.version && newest.status !== "Accepted" && newest.status !== "Rejected") {
      toast.error(`Proposal V${newest.version} is ${newest.status} — the contract still follows accepted V${acceptedRow.version}. ${newest.status === "Draft" ? "Finalise & download V" + newest.version + ", Mark sent, then" : "Record"} Client accepted: the contract updates to V${newest.version} automatically.`, { duration: 9000 });
      return;
    }
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
            <p className="text-sm text-muted-foreground">No proposal yet. Make one from a package in minutes, or from the designer's work for a serious client.</p>
            <Button onClick={() => setNewOpen(true)} disabled={create.isPending || !ready}>New proposal</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">No proposal yet. Only the lead's sales owner or the GM can generate one.</p>}
        {newProposalDialog}
      </div>
    );
  }

  /* ---- doc editing helpers ---- */
  const d = current;
  const liveGroups = groups ?? [];
  // Package leads have an FF&E list too (seeded from the package), so item changes sync the same way.
  const drift = liveGroups.length ? itemListDiff(d.itemList, liveGroups) : null;
  const driftSummary = drift?.differs
    ? `${drift.added} ${drift.added === 1 ? "item" : "items"} added, ${drift.removed} removed, ${drift.quantitiesChanged} ${drift.quantitiesChanged === 1 ? "quantity" : "quantities"} changed`
    : null;
  // The GM's cost check and the FF&E sync read the SAVED proposal: save the edits on screen first.
  const saveFirst = async () => {
    if (!dirty || !current) return true;
    try { await save.mutateAsync({ id: row.id, leadId: lead.id, doc: current }); setDraft(null); return true; }
    catch {
      // A price below the floor can't be saved yet (that's what the request is for): keep the saved prices, save the items.
      try {
        await save.mutateAsync({ id: row.id, leadId: lead.id, doc: { ...current, investment: { ...current.investment, options: row.doc.investment.options } } });
        toast.info("Your item edits were saved; the lower price stays on screen until the GM approves it.");
        return true;
      } catch (e) { toast.error(errMsg(e, "Save your edits first — could not save")); return false; }
    }
  };
  const previewSync = async () => {
    if (!(await saveFirst())) return;
    try {
      const plan = await syncFfe.mutateAsync({ proposalId: row.id, leadId, dry: true });
      if (!plan.n_added && !plan.n_removed && !plan.n_changed) { toast.info("The FF&E list already matches this proposal."); return; }
      setSyncPlan(plan);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not check the FF&E list"); }
  };
  const applySync = async () => {
    try {
      const plan = await syncFfe.mutateAsync({ proposalId: row.id, leadId, dry: false });
      setSyncPlan(null);
      toast.success(plan.sent_to === "designer"
        ? `FF&E list updated — ${plan.n_added} new item${plan.n_added === 1 ? "" : "s"} sent to the designer to spec and cost`
        : "FF&E list updated — sent to the GM for a new quotation");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update the FF&E list"); }
  };

  const updateItemList = () => {
    if (row.status !== "Draft" || !liveGroups.length) return;
    setDraft({
      ...d,
      itemList: liveGroups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item })) })),
    });
  };
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
  const movePicture = (source: { page: number | "mood"; image: number }, direction: -1 | 1) => {
    const pages = d.pages.map((page) => ({ ...page, images: [...page.images] }));
    const moodBoard = [...d.moodBoard];
    const sourceImages = source.page === "mood" ? moodBoard : pages[source.page]?.images;
    if (!sourceImages) return;
    const image = sourceImages[source.image];
    if (!image) return;

    const neighbour = source.image + direction;
    if (neighbour >= 0 && neighbour < sourceImages.length) {
      [sourceImages[source.image], sourceImages[neighbour]] = [sourceImages[neighbour], sourceImages[source.image]];
      change({ ...d, pages, moodBoard });
      return;
    }

    let targetImages: DocImage[] | undefined;
    if (source.page === "mood") {
      if (direction < 0 && pages.length) targetImages = pages[pages.length - 1]?.images;
    } else if (direction < 0 && source.page > 0) {
      targetImages = pages[source.page - 1]?.images;
    } else if (direction > 0 && source.page < pages.length - 1) {
      targetImages = pages[source.page + 1]?.images;
    } else if (direction > 0 && source.page === pages.length - 1) {
      targetImages = moodBoard;
    }
    if (!targetImages) return;
    if (targetImages.length >= MAX_IMAGES_PER_PAGE) {
      toast.error(`That page already has ${MAX_IMAGES_PER_PAGE} pictures. Move one out before adding another.`);
      return;
    }
    sourceImages.splice(source.image, 1);
    if (direction < 0) targetImages.push(image);
    else targetImages.unshift(image);
    change({ ...d, pages, moodBoard });
  };
  const pictureMoveDisabled = (source: { page: number | "mood"; image: number }, direction: -1 | 1) => {
    if (direction < 0) return source.image === 0 && (source.page === 0 || (source.page === "mood" && d.pages.length === 0));
    return source.page === "mood" && source.image === d.moodBoard.length - 1;
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
          {canEdit && row.status === "Draft" && d.finalAt && !dirty && <Button variant="outline" disabled={withdrawn} onClick={() => markStatus("Sent")}>Mark sent</Button>}
          {canEdit && row.status === "Sent" && <><Button variant="outline" disabled={withdrawn} onClick={clientAccepted}>Client accepted</Button><Button variant="outline" onClick={() => markStatus("Rejected")}>Client rejected</Button></>}
          {row.status === "Accepted" && row.accepted_option && <span className="self-center text-xs text-muted-foreground">Client chose {row.accepted_option.label}</span>}
          {canEdit && row.status !== "Accepted" && !isPackage && (
            <Button variant="outline" onClick={() => setRedesignOpen(true)} title="Send the client's feedback to the designer for a new design version">Client wants changes</Button>
          )}
          {canEdit && <Button variant="outline" onClick={() => setNewOpen(true)}>New proposal</Button>}
          {canEdit && <Button variant="outline" onClick={openContract}>Generate contract</Button>}
          {canEdit && <Button variant="outline" title="This proposal followed by the sales agreement, as one PDF for the client to sign"
            onClick={() => leadContracts.length ? navigate(`/workspace/contracts/${lead.id}?combined=1`)
              : toast.info("Generate the contract first — the combined document is this proposal followed by the agreement.")}>Proposal + agreement</Button>}
          {d.finalAt && !dirty
            ? <Button disabled={withdrawn} onClick={() => printAs(proposalFile)}>Download PDF</Button>
            : canEdit && <Button onClick={() => void finalise()} disabled={save.isPending}>Finalise &amp; download</Button>}
        </div>
      </div>

      {/* gate */}
      <div className="grid gap-2 md:grid-cols-2">
        <Chip label="Design" text={designText} mark={markOf(designOk)} />
        <Chip label="Quotation" text={withdrawn ? `GM quote V${d.quoteVersion} withdrawn — waiting for a new quotation` : quoteText} mark={withdrawn ? "block" : markOf(quoteOk)} />
      </div>
      {withdrawn && (
        <p className="rounded-[var(--radius)] border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm">
          {row.status === "Accepted"
            ? `The FF&E has gone back to the GM for re-quoting since the client accepted. The price here is from GM quotation V${d.quoteVersion}; check with the GM before generating the contract.`
            : `GM quotation V${d.quoteVersion} has been withdrawn — the FF&E is back with the GM for re-quoting. The prices shown are not current: don't send or print this proposal until the new quotation arrives.`}
        </p>
      )}
      {!isPackage && <RedesignStatus leadId={lead.id} basedOn={d.designVersion} />}
      {newProposalDialog}
      <RedesignDialog open={redesignOpen} onOpenChange={setRedesignOpen} leadId={lead.id} leadName={lead.name} proposalId={row.id} proposalVersion={row.version}
        pages={d.pages.map((p) => ({ title: p.title, paths: p.images.map((i) => i.path) }))} />
      {notices.map((n) => <p key={n} className="rounded-[var(--radius)] border border-warning/50 bg-warning/10 px-3 py-2 text-sm">{n}</p>)}
      {isPackage && pkgCosting && row.status === "Draft" && (
        <p className="rounded-[var(--radius)] border border-border bg-muted/40 px-3 py-2 text-sm">
          {costing?.status === "Returned"
            ? "The designer is checking the costs of your item changes. Anything they add, remove or change in the FF&E list appears here and is saved automatically."
            : "The designer has sent the item list to the GM for the final price. It appears here automatically when the GM sends the quotation."}
        </p>
      )}
      {driftSummary && row.status === "Draft" && !(isPackage && pkgCosting) && (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-warning/50 bg-warning/10 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">This proposal and the FF&amp;E list are different.</p>
            <p className="text-muted-foreground">{driftSummary}. Take the FF&amp;E list if the designer changed it; send yours to the FF&amp;E list if you changed the proposal after client feedback — that one re-prices the job.</p>
          </div>
          {editable && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={updateItemList}>Take the FF&amp;E list</Button>
              <Button type="button" onClick={() => void previewSync()} disabled={syncFfe.isPending}>
                {syncFfe.isPending ? "Checking…" : "Send to FF&E list"}
              </Button>
            </div>
          )}
        </div>
      )}
      {driftSummary && (row.status === "Sent" || row.status === "Accepted") && (
        <div className="space-y-1 rounded-[var(--radius)] border border-warning/60 bg-warning/10 px-3 py-3 text-sm">
          <p className="font-medium">The FF&amp;E list has changed since this proposal was sent.</p>
          <p>This document still shows what the client received — create a new version if the change should reach them.</p>
          <p className="text-muted-foreground">{driftSummary}.</p>
        </div>
      )}

      {/* Removals delete the row and the designer's work on it, so the confirmation names every one. */}
      <AlertDialog open={!!syncPlan} onOpenChange={(o) => !o && setSyncPlan(null)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Send these changes to the FF&amp;E list?</AlertDialogTitle>
            <AlertDialogDescription>
              The FF&amp;E list is what the coordinator buys from and what the cost is worked out from. After this,
              {syncPlan?.sent_to === "designer"
                ? " the new items go to the designer to give each one a supplier and a cost, then the GM sets the new price."
                : " the GM sets the new price."}
              {" "}This proposal cannot be downloaded or sent until that new price arrives.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 text-sm">
            {!!syncPlan?.n_removed && (
              <div className="rounded-[var(--radius)] border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                <p className="font-medium text-destructive">{syncPlan.n_removed} item{syncPlan.n_removed === 1 ? "" : "s"} will be deleted from the FF&amp;E list</p>
                <p className="text-xs text-muted-foreground">This cannot be undone. Anything the designer recorded against these — supplier, cost, dimensions — is lost. If you only renamed an item, cancel and rename it on the FF&amp;E list instead, or it will be deleted and re-added empty.</p>
                <ul className="list-disc pl-5">
                  {syncPlan.removed.map((r, i) => (
                    <li key={i}>{r.room} · {r.item}{(r.had_supplier || r.had_cost) && <span className="text-destructive"> — has {[r.had_supplier && "a supplier", r.had_cost && "a cost"].filter(Boolean).join(" and ")}</span>}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!syncPlan?.n_added && (
              <div className="space-y-1">
                <p className="font-medium">{syncPlan.n_added} item{syncPlan.n_added === 1 ? "" : "s"} will be added, uncosted</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {syncPlan.added.map((r, i) => <li key={i}>{r.room} · {r.item} ×{r.qty}</li>)}
                </ul>
              </div>
            )}
            {!!syncPlan?.n_changed && (
              <div className="space-y-1">
                <p className="font-medium">{syncPlan.n_changed} quantit{syncPlan.n_changed === 1 ? "y" : "ies"} will change</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {syncPlan.changed.map((r, i) => <li key={i}>{r.room} · {r.item}: {r.from} → {r.to}</li>)}
                </ul>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void applySync()} disabled={syncFfe.isPending}>
              {syncFfe.isPending ? "Updating…" : "Update the FF&E list"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discount loop: only the GM moves price, so sales asks and the database holds the floor. */}
      {/* The GM's standing FF&E list & costs for a package proposal — the list the project will be bought from. */}
      {isPackage && member?.role === "gm" && !discounts.some((x) => x.status === "Requested") && (
        <section className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-3 text-sm md:p-4">
          <PackageCostCheck proposalId={row.id} leadId={leadId} units={pkgUnits}
            prices={d.investment.options.map((o) => ({ label: o.label, amount: Number(o.amount) || 0 }))} />
        </section>
      )}
      {(costing?.status === "Quoted" || isPackage || simplifies.some((x) => x.status === "Open")) && (member?.role === "gm" || member?.role === "sales") && (() => {
        const baseOptions = isPackage
          ? d.investment.options.filter((o) => tierOfLabel(o.label)).map((o) => ({ label: o.label, amount: packagePrice(tierOfLabel(o.label)!, pkgLayout) * pkgUnits }))
          : (costing?.options ?? []);
        const isGm = member?.role === "gm";
        const open = discounts.find((x) => x.status === "Requested");
        const approved = discounts.filter((x) => x.status === "Approved");
        const lastDecided = discounts.find((x) => x.status !== "Requested");
        const openSimplify = simplifies.find((x) => x.status === "Open");
        // The latest simplify round, if nothing was asked of the GM since: is the new price within the client's budget?
        const doneSimplify = simplifies.find((x) => x.status === "Quoted");
        const simplifyResult = !openSimplify && doneSimplify && doneSimplify.new_amount != null
          && !discounts.some((x) => x.requested_at > (doneSimplify.closed_at ?? "")) ? doneSimplify : null;
        const openAsk = (label?: string, budget?: number) => {
          setAskPath("discount"); setAskLabel(label ?? ""); setAskAmount(budget ? String(budget) : ""); setAskOpen(true);
        };
        const floorFor = (label: string, quoted: number) =>
          quoted - Math.max(0, ...approved.filter((a) => a.option_label === label).map((a) => Number(a.approved_discount ?? 0)), 0);
        return (
          <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-3 text-sm md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">Price and discounts</h3>
              {!open && !openSimplify && !askOpen && !isGm && (
                <Button type="button" variant="outline" size="sm" onClick={() => openAsk()}>Client wants a lower price</Button>
              )}
            </div>

            <ul className="space-y-1">
              {baseOptions.map((o, i) => {
                const fl = floorFor(o.label, Number(o.amount));
                return (
                  <li key={i} className="flex flex-wrap justify-between gap-x-3">
                    <span>{o.label}</span>
                    <span className="tabular-nums">
                      {isPackage ? "List price" : "Quoted"} {Number(o.amount).toLocaleString()}
                      {fl < Number(o.amount) && <span className="text-success"> · lowest you may send {fl.toLocaleString()}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>

            {open && (
              <div className="space-y-2 rounded-[var(--radius)] border border-warning/50 bg-warning/10 p-3">
                <p className="font-medium">
                  {isPackage
                    ? <>Asked for {(Number(open.quoted_amount) - Number(open.requested_discount)).toLocaleString()} on {open.option_label} (list {Number(open.quoted_amount).toLocaleString()}) — waiting for the GM</>
                    : <>{Number(open.requested_discount).toLocaleString()} off {open.option_label} — waiting for the GM</>}
                </p>
                {open.client_note && <p className="text-muted-foreground">Client: {open.client_note}</p>}
                {isGm && isPackage && (
                  <PackageCostCheck proposalId={row.id} leadId={leadId} request={open} units={pkgUnits}
                    listPrice={Number(baseOptions.find((o) => o.label === open.option_label)?.amount ?? open.quoted_amount)} />
                )}
                {!isGm && isPackage && <p className="text-xs text-muted-foreground">The GM is checking the item list against cost and will send back a final price.</p>}
                {isGm && !isPackage && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="space-y-1">
                        <span className="block text-xs text-muted-foreground">Approve a different amount (optional)</span>
                        <Input inputMode="decimal" className="h-8 w-36" placeholder={String(open.requested_discount)}
                          value={counter} onChange={(e) => setCounter(e.target.value)} />
                      </label>
                      <Input className="h-8 w-full sm:w-56" placeholder="Note back to sales (optional)"
                        value={gmNote} onChange={(e) => setGmNote(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={decideDiscount.isPending}
                        onClick={async () => {
                          const amt = counter.trim() ? Number(counter) : null;
                          if (counter.trim() && !(amt! > 0)) { toast.error("Enter a number greater than zero"); return; }
                          try {
                            await decideDiscount.mutateAsync({ id: open.id, leadId, approve: true, amount: amt, note: gmNote });
                            setCounter(""); setGmNote(""); toast.success("Discount approved");
                          } catch (e) { toast.error(e instanceof Error ? e.message : "Could not approve"); }
                        }}>
                        {counter.trim() ? `Approve ${Number(counter).toLocaleString()} instead` : "Approve"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={decideDiscount.isPending}
                        onClick={async () => {
                          try {
                            await decideDiscount.mutateAsync({ id: open.id, leadId, approve: false, amount: null, note: gmNote });
                            setCounter(""); setGmNote(""); toast.success("Discount declined");
                          } catch (e) { toast.error(e instanceof Error ? e.message : "Could not decline"); }
                        }}>Decline</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {openSimplify && (
              <div className="space-y-1 rounded-[var(--radius)] border border-warning/50 bg-warning/10 p-3">
                <p className="font-medium">
                  {costing?.status === "Submitted" ? "Simplified list is with the GM for the new price" : "With the designer — simplifying the design to the client's budget"}
                </p>
                <p className="tabular-nums">
                  {openSimplify.option_label}: AED {Number(openSimplify.quoted_amount).toLocaleString()} → client budget <b>AED {Number(openSimplify.client_budget).toLocaleString()}</b>
                  {isGm && <span className="text-muted-foreground"> · designer's target cost AED {Number(openSimplify.target_cost).toLocaleString()} (was {Number(openSimplify.cost_at_request).toLocaleString()})</span>}
                </p>
                {openSimplify.note && <p className="text-muted-foreground">Note: {openSimplify.note}</p>}
                {!isGm && <p className="text-xs text-muted-foreground">The designer adjusts the FF&E list and resubmits; the GM sets the final quote and the draft proposal updates. You'll be notified.</p>}
              </div>
            )}

            {simplifyResult && (() => {
              const gap = Number(simplifyResult.new_amount) - Number(simplifyResult.client_budget);
              return (
                <p className={cn("rounded-[var(--radius)] border p-2 tabular-nums", gap > 0 ? "border-warning/50 bg-warning/10" : "border-success/50 bg-success/10")}>
                  Simplified design re-quoted: {simplifyResult.option_label} <b>AED {Number(simplifyResult.new_amount).toLocaleString()}</b> (was {Number(simplifyResult.quoted_amount).toLocaleString()}) · client budget AED {Number(simplifyResult.client_budget).toLocaleString()}
                  {gap > 0 ? <> — still AED {gap.toLocaleString()} over.
                    {!isGm && !open && !askOpen && (
                      <Button type="button" size="sm" variant="outline" className="ml-2 h-7"
                        onClick={() => openAsk(simplifyResult.option_label, Number(simplifyResult.client_budget))}>Ask the GM to discount the rest</Button>
                    )}</> : <> — within budget.</>}
                </p>
              );
            })()}

            {!open && lastDecided && (
              <p className={cn("rounded-[var(--radius)] border p-2",
                lastDecided.status === "Approved" ? "border-success/50 bg-success/10" : "border-destructive/40 bg-destructive/10")}>
                {lastDecided.status === "Approved" && isPackage
                  ? (() => {
                      const gmPrice = Number(lastDecided.quoted_amount) - Number(lastDecided.approved_discount);
                      const idx = d.investment.options.findIndex((o) => o.label === lastDecided.option_label);
                      const applied = idx >= 0 && Number(d.investment.options[idx].amount) === gmPrice;
                      return <>GM's final price for {lastDecided.option_label}: <b>AED {gmPrice.toLocaleString()}</b> excl. VAT
                        {editable && idx >= 0 && !applied && (
                          <Button type="button" size="sm" className="ml-2 h-7" onClick={() => setInv({ options: d.investment.options.map((o, j) => (j === idx ? { ...o, amount: gmPrice } : o)) })}>Use this price</Button>
                        )}
                        {applied && <span className="text-muted-foreground"> · in the proposal</span>}</>;
                    })()
                  : lastDecided.status === "Approved"
                  ? <>Approved: {Number(lastDecided.approved_discount).toLocaleString()} off {lastDecided.option_label}
                      {Number(lastDecided.approved_discount) !== Number(lastDecided.requested_discount) &&
                        <> (asked for {Number(lastDecided.requested_discount).toLocaleString()})</>}</>
                  : <>Declined: {Number(lastDecided.requested_discount).toLocaleString()} off {lastDecided.option_label}</>}
                {lastDecided.gm_note && <> — {lastDecided.gm_note}</>}
              </p>
            )}

            {askOpen && !open && (
              <div className="space-y-2 rounded-[var(--radius)] border border-border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  {baseOptions.length > 1 && (
                    <label className="space-y-1">
                      <span className="block text-xs text-muted-foreground">On</span>
                      <select className="h-8 rounded-[var(--radius)] border border-input bg-background px-2 text-sm" value={askLabel || baseOptions[0].label}
                        onChange={(e) => setAskLabel(e.target.value)} aria-label="Which price">
                        {baseOptions.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="space-y-1">
                    <span className="block text-xs text-muted-foreground">Client's budget (AED, excl. VAT)</span>
                    <Input inputMode="decimal" className="h-8 w-32" value={askAmount} onChange={(e) => setAskAmount(e.target.value)} />
                  </label>
                  <Input className="h-8 w-full sm:w-72" placeholder={askPath === "simplify" ? "Note for the designer, e.g. keep the sofa, drop the decor" : "What did the client say?"}
                    value={askWhy} onChange={(e) => setAskWhy(e.target.value)} />
                </div>
                {(() => {
                  const label = askLabel || baseOptions[0]?.label || "Option A";
                  const list = Number(baseOptions.find((o) => o.label === label)?.amount ?? 0);
                  const budget = Number(askAmount);
                  const gap = budget > 0 && budget < list ? list - budget : 0;
                  return (
                    <div className="space-y-1" role="radiogroup" aria-label="How to meet the budget">
                      {gap > 0 && <p className="text-xs tabular-nums text-muted-foreground">{label} is AED {list.toLocaleString()} — AED {gap.toLocaleString()} ({Math.round((gap / list) * 100)}%) over the budget.</p>}
                      <label className="flex items-start gap-2">
                        <input type="radio" className="mt-1" checked={askPath === "discount"} onChange={() => setAskPath("discount")} />
                        <span><b className="font-medium">Ask the GM for a discount</b>{gap > 0 && <> — AED {gap.toLocaleString()} off</>}<br />
                          <span className="text-xs text-muted-foreground">Same design, lower price. The GM approves, counters or declines.</span></span>
                      </label>
                      <label className="flex items-start gap-2">
                        <input type="radio" className="mt-1" checked={askPath === "simplify"} onChange={() => setAskPath("simplify")} />
                        <span><b className="font-medium">Ask the designer to simplify the design</b><br />
                          <span className="text-xs text-muted-foreground">Big gap: the designer adjusts the FF&E list to a target cost and resubmits; the GM sets the final quote. The GM is told now.</span></span>
                      </label>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={askDiscount.isPending || askSimplify.isPending}
                    onClick={async () => {
                      const label = askLabel || baseOptions[0]?.label || "Option A";
                      const list = Number(baseOptions.find((o) => o.label === label)?.amount ?? 0);
                      const budget = Number(askAmount);
                      if (!(budget > 0 && budget < list)) { toast.error(`Enter the client's budget — below the current price ${list.toLocaleString()}`); return; }
                      if (!(await saveFirst())) return;
                      try {
                        if (askPath === "simplify") {
                          await askSimplify.mutateAsync({ proposalId: row.id, leadId, label, budget, note: askWhy });
                          toast.success("Sent to the designer to simplify — the GM has been told");
                        } else {
                          // The request is an amount off the price; the client's budget goes to the GM with the note.
                          const why = isPackage ? askWhy : [`Client budget AED ${budget.toLocaleString()}`, askWhy.trim()].filter(Boolean).join(" — ");
                          await askDiscount.mutateAsync({ proposalId: row.id, leadId, label, discount: list - budget, clientNote: why });
                          toast.success(isPackage ? "Sent to the GM with the item list for a cost check" : "Sent to the GM");
                        }
                        setAskOpen(false); setAskAmount(""); setAskWhy("");
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send the request"); }
                    }}>{askPath === "simplify" ? "Send to the designer" : "Send to the GM"}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAskOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </section>
        );
      })()}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* rail */}
        <aside ref={railScrollRef} className="rounded-[var(--radius)] border border-border bg-card px-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
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
              {(d.cover.hero || d.moodBoard[0]) && (
                <ImageStrip
                  images={[{ path: d.cover.hero ?? d.moodBoard[0]?.path ?? "", caption: null }]}
                  url={(p) => url(p)}
                  onRemove={editable && d.cover.hero ? () => setCover({ hero: null }) : undefined}
                />
              )}
              {!d.cover.hero && d.moodBoard[0] && (
                <p className="text-xs text-muted-foreground">Using the first mood-board image. Upload a cover image to replace it.</p>
              )}
              {editable && (
                <UploadButton label={d.cover.hero ? "Replace cover image" : "Upload cover image"}
                  onFile={async (f) => { const path = await upload(f); setCover({ hero: path }); }} />
              )}
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
              {editable && design && (
                <div className="space-y-1">
                  <Button type="button" variant="outline" size="sm" className="w-full"
                    onClick={() => change(applyDesign(d, design))}>
                    Refresh images from the design
                  </Button>
                  <p className="text-xs text-muted-foreground">Rebuilds the render pages from the current design images.</p>
                </div>
              )}
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
                  {isDefaultDesc(p.desc, p.area) && (
                    <p className="text-xs text-muted-foreground">Default text — worth replacing with a line about this room.</p>
                  )}
                  {descOverflowChars(p.desc, p.images.length) > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Too long for the page — the last ~{descOverflowChars(p.desc, p.images.length)} characters won't appear in the PDF.
                    </p>
                  )}
                  <ImageStrip images={p.images} url={(x) => url(x)}
                    onRemove={editable ? (k) => setPage(i, { images: p.images.filter((_, j) => j !== k) }) : undefined}
                    onMove={editable ? (k, direction) => movePicture({ page: i, image: k }, direction) : undefined}
                    moveDisabled={(k, direction) => pictureMoveDisabled({ page: i, image: k }, direction)} />
                  {editable && <UploadButton label="Add image" onFile={async (f) => { const path = await upload(f); setPage(i, { images: [...p.images, { path, caption: null }] }); }} />}
                </div>
              ))}
              {editable && (
                <Button type="button" variant="outline" size="sm" onClick={() => change({ ...d, pages: [...d.pages, { id: newId(), area: null, title: "New page", desc: "", images: [] }] })}>
                  <Plus className="h-4 w-4" /> Add new page
                </Button>
              )}
            </RailSection>

            {d.moodBoard.length > 0 && (
              <RailSection title="Mood board">
                <p className="text-xs text-muted-foreground">Images supplied with the accepted design.</p>
                <ImageStrip images={d.moodBoard} url={(x) => url(x)}
                  onMove={editable ? (k, direction) => movePicture({ page: "mood", image: k }, direction) : undefined}
                  moveDisabled={(k, direction) => pictureMoveDisabled({ page: "mood", image: k }, direction)} />
              </RailSection>
            )}

            <RailSection title="Picture pages">
              <Field label="Note at the foot of every picture page">
                <Textarea rows={3} value={d.imagesNote} onChange={(e) => change({ ...d, imagesNote: e.target.value })} />
              </Field>
              <p className="text-xs text-muted-foreground">Leave empty to hide the note.</p>
            </RailSection>

            <RailSection title="Item list">
              {isPackage && pkgCosting && <p className="text-xs text-muted-foreground">Locked while the designer and GM cost it — it follows the FF&amp;E list.</p>}
              <fieldset disabled={isPackage && pkgCosting} className="space-y-1.5 disabled:opacity-70">
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
              </fieldset>
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
                    <Input aria-label="Option label" value={o.label} readOnly={isPackage} title={isPackage ? "Package names stay as they are — the GM's price check uses them" : undefined}
                      onChange={(e) => { if (!isPackage) setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }); }} />
                    {editable && !locked && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${o.label}`} onClick={() => setInv({ options: d.investment.options.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  <Input aria-label="Option description" value={o.desc} onChange={(e) => setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
                  <Field label={isPackage ? `Price (AED, excl. VAT) — list ${(() => { const tr = tierOfLabel(o.label); return tr ? (packagePrice(tr, pkgLayout) * pkgUnits).toLocaleString() + (pkgUnits > 1 ? ` (${pkgUnits} units)` : "") : "—"; })()}` : locked ? "Price (AED, excl. VAT) — locked" : "Budget placeholder (AED, excl. VAT)"}>
                    <Input aria-label="Price" type="number" min={0} className="tabular-nums" value={o.amount} readOnly={locked} disabled={locked}
                      onChange={(e) => { if (!locked) setInv({ options: d.investment.options.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) }); }} />
                  </Field>
                  {isPackage && (() => { const fl = pkgFloor(o.label); return fl != null && Number(o.amount) < fl
                    ? <p className="text-xs text-warning">Below {fl.toLocaleString()} — needs the GM's approval before this can be downloaded or saved. Use "Ask the GM" under Price and discounts.</p>
                    : null; })()}
                </div>
              ))}
              {editable && !locked && !isPackage && (
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
