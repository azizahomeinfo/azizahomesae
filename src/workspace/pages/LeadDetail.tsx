import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBrief, useCreateBrief, useLead, useMembers, useUpdateLead } from "../queries";
import { useWorkspace } from "../WorkspaceProvider";
import { blankBrief } from "../briefSchema";
import type { BriefStatus } from "../briefWorkflow";
import BriefStatusPill from "../BriefStatusPill";
import BriefEditor from "../BriefEditor";
import DesignPackage from "../DesignPackage";
import { LEAD_STATUSES, LEAD_STATUS_HELP, type LeadStatus } from "../constants";
import { aed, shortDate } from "../format";
import StatusPill from "../StatusPill";
import LeadForm from "../LeadForm";
import CommentThread from "../CommentThread";
import { FollowUp } from "./Leads";

const PIPE = LEAD_STATUSES.filter((s) => s !== "Lost");

const Grid = ({ title, items }: { title: string; items: [string, ReactNode][] }) => (
  <div>
    <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="text-sm text-foreground break-words">{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const LeadDetail = () => {
  const { id } = useParams();
  const { data: lead, isLoading, error } = useLead(id);
  const { data: members = [] } = useMembers();
  const update = useUpdateLead();
  const { member } = useWorkspace();
  const { data: brief } = useBrief(id);
  const createBrief = useCreateBrief();
  const [briefOpen, setBriefOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const back = (
    <Link to="/workspace/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> All leads
    </Link>
  );

  if (isLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (error) return <div className="space-y-4">{back}<p className="text-destructive">{(error as Error).message}</p></div>;
  if (!lead) return <div className="space-y-4">{back}<p className="text-muted-foreground">This lead doesn't exist or you don't have access to it.</p></div>;

  const status = lead.status as LeadStatus;
  const owner = members.find((m) => m.user_id === lead.sales_id)?.full_name;
  const designer = members.find((m) => m.user_id === lead.designer_id)?.full_name;
  const idx = PIPE.indexOf(status as (typeof PIPE)[number]);
  const next = idx >= 0 && idx < PIPE.length - 1 ? PIPE[idx + 1] : null;

  const setStatus = async (s: LeadStatus, extra: { lost_reason?: string | null } = {}) => {
    try {
      await update.mutateAsync({ id: lead.id, values: { status: s, ...extra } });
      toast.success(`Moved to ${s}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    }
  };

  const confirmLost = async () => {
    const reason = lostReason.trim();
    if (!reason) return toast.error("Please give a reason");
    if (reason.length > 1000) return toast.error("Reason is too long");
    await setStatus("Lost", { lost_reason: reason });
    setLostOpen(false);
    setLostReason("");
  };

  const briefStage = status === "Qualified" || status === "Proposal Sent" || status === "Won";
  const canStartBrief = member?.role === "gm" || (!!member && lead.sales_id === member.user_id);

  const startBrief = async () => {
    if (!member) return;
    try {
      const d = blankBrief(lead);
      await createBrief.mutateAsync({
        leadId: lead.id,
        createdBy: member.user_id,
        doc: {
          header: d.header as never, style: d.style as never, colours: d.colours as never, ffe: d.ffe as never,
          bedrooms: d.bedrooms as never, lists: d.lists as never, attachments: d.attachments as never,
        },
      });
      setBriefOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the brief");
    }
  };

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading uppercase text-2xl md:text-3xl tracking-wide break-words">{lead.name}</h2>
          <p className="text-sm text-muted-foreground">{lead.ref} · Owner: {owner ?? "Unassigned"}</p>
        </div>
        <StatusPill status={status} className="self-start" />
      </div>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-4">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {LEAD_STATUSES.map((s, i) => {
            const current = s === status;
            const past = status !== "Lost" && idx >= 0 && i < idx;
            return (
              <li
                key={s}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap",
                  current && "bg-primary text-primary-foreground border-primary",
                  past && "border-primary text-primary",
                  !current && !past && "border-border text-muted-foreground opacity-60",
                )}
              >
                {past && <Check className="h-3 w-3" />}
                {s}
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted-foreground">{LEAD_STATUS_HELP[status]}</p>
        {status === "Lost" && lead.lost_reason && <p className="text-sm">Reason: {lead.lost_reason}</p>}
        <div className="flex flex-wrap gap-2">
          {next && <Button onClick={() => setStatus(next)} disabled={update.isPending}>Move to {next}</Button>}
          {status !== "Lost" && status !== "Won" && (
            <Button variant="outline" onClick={() => setLostOpen(true)} disabled={update.isPending}>Mark as lost</Button>
          )}
          {status === "Lost" && (
            <Button variant="outline" onClick={() => setStatus("Contacted", { lost_reason: null })} disabled={update.isPending}>
              Reopen lead
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-primary/40 bg-card p-4 md:p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Next step</p>
        {brief || briefStage ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-foreground">Requirement brief</p>
              {brief ? <BriefStatusPill status={brief.status as BriefStatus} /> : <p className="text-sm text-muted-foreground">Not started yet.</p>}
            </div>
            {brief ? (
              <Button onClick={() => setBriefOpen(true)}>
                {brief.status === "Draft" && canStartBrief ? "Complete the requirement brief" : "Open requirement brief"}
              </Button>
            ) : canStartBrief ? (
              <Button onClick={startBrief} disabled={createBrief.isPending}>Complete the requirement brief</Button>
            ) : (
              <span className="text-xs text-muted-foreground">The sales owner starts the brief.</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-foreground">{LEAD_STATUS_HELP[status]}</p>
        )}
        {brief && ["Assigned", "In Design", "Revision Requested", "Design Ready", "Design Approved"].includes(brief.status) && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-foreground">Design package</p>
              {brief.status === "Design Approved" && <p className="text-sm text-primary">Design approved</p>}
              {brief.status === "Design Ready" && <p className="text-sm text-muted-foreground">Submitted for review.</p>}
            </div>
            <Button
              variant={brief.status === "Design Approved" ? "outline" : "default"}
              onClick={() => setDesignOpen(true)}
            >
              {brief.status === "Design Approved"
                ? "View approved design"
                : brief.status === "Design Ready" && member?.role !== "designer" && (member?.role === "gm" || lead.sales_id === member?.user_id)
                  ? "Review design"
                  : "Open design package"}
            </Button>
          </div>
        )}
        {status === "Won" && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-foreground">{lead.converted_project_id ? "Project" : "Convert to project"}</p>
            {lead.converted_project_id ? (
              projectCode ? (
                <Button asChild variant="outline"><Link to={`/workspace/projects/${projectCode}`}>Open project {projectCode}</Link></Button>
              ) : (
                <span className="text-sm text-muted-foreground">Already converted.</span>
              )
            ) : canConvert ? (
              <Button onClick={() => setConvertOpen(true)}>Convert to project</Button>
            ) : (
              <span className="text-xs text-muted-foreground">GM or sales converts won leads.</span>
            )}
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading uppercase text-xl tracking-wide">Details</h2>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
        </div>
        <Grid title="Client" items={[["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email]]} />
        <Grid
          title="Property"
          items={[
            ["Property", lead.property], ["Building", lead.building], ["Area", lead.location],
            ["Unit type", lead.unit_type], ["Size", lead.size], ["Handover", lead.handover_status],
            ["Expected handover", lead.exp_handover ? shortDate(lead.exp_handover) : null],
          ]}
        />
        <Grid
          title="Requirement"
          items={[
            ["Use", lead.use_type], ["Budget", aed(lead.budget)],
            ["Target date", lead.target_date ? shortDate(lead.target_date) : null], ["Scope", lead.scope],
            ["Style", lead.style], ["References", lead.refs], ["Floor plan", lead.floor_plan], ["Source", lead.source],
          ]}
        />
        <Grid
          title="Pipeline"
          items={[
            ["Status", <StatusPill key="s" status={status} />],
            ["Last contact", lead.last_contact ? shortDate(lead.last_contact) : null],
            ["Next follow-up", lead.next_follow ? <FollowUp key="f" lead={lead} /> : null],
            ["Owner", owner], ["Designer", designer],
            ["Notes", lead.notes ? <span className="whitespace-pre-wrap">{lead.notes}</span> : null],
          ]}
        />
      </section>

      <CommentThread leadId={lead.id} parentName={lead.name} />

      <LeadForm open={editOpen} onOpenChange={setEditOpen} lead={lead} />

      {brief && (
        <BriefEditor open={briefOpen} onOpenChange={setBriefOpen} lead={lead} brief={brief} />
      )}

      {brief && <DesignPackage leadId={lead.id} open={designOpen} onOpenChange={setDesignOpen} />}

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as lost</DialogTitle>
            <DialogDescription>Why did this lead close without a contract?</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="lost-reason">Reason</Label>
            <Textarea id="lost-reason" rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>Cancel</Button>
            <Button onClick={confirmLost} disabled={update.isPending}>Mark as lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadDetail;
