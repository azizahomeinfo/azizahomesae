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
import { useLead, useMembers, useUpdateLead } from "../queries";
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

  const setStatus = async (s: LeadStatus, extra: { lost_reason?: string } = {}) => {
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

  const nextStep =
    status === "Qualified" ? { label: "Complete the requirement brief" } : status === "Won" ? { label: "Convert to project" } : null;

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
            <Button variant="outline" onClick={() => setStatus("Contacted", { lost_reason: undefined })} disabled={update.isPending}>
              Reopen lead
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-primary/40 bg-card p-4 md:p-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Next step</p>
        {nextStep ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-foreground">{nextStep.label}</p>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <Button disabled>{nextStep.label}</Button>
              <span className="text-xs text-muted-foreground">Coming in the next release</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground">{LEAD_STATUS_HELP[status]}</p>
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

      <CommentThread leadId={lead.id} leadName={lead.name} />

      <LeadForm open={editOpen} onOpenChange={setEditOpen} lead={lead} />

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
