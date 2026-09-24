import { useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBrief, useLead, useMembers } from "./queries";
import { useDesigns, useSignedUrls } from "./designQueries";
import {
  useChangeRequests, useDecideCR, useHandover, useIssues, useProjectFiles, useProjectTasks, useRaiseCR,
  useProjectCosts, useSaveIssue, useTickHandover, useUploadProjectFile, type Issue, type Project,
} from "./projectQueries";
import { PROJECT_STAGES, fileSize, signedAed } from "./projectConstants";
import { useWorkspace } from "./WorkspaceProvider";
import { aed, shortDate, todayISO } from "./format";
import { DriveLink } from "./DriveLink";
import { NewTaskForm, TaskRow } from "./TaskList";
import CommentThread from "./CommentThread";
import BriefEditor from "./BriefEditor";
import BriefStatusPill from "./BriefStatusPill";
import DesignPackage from "./DesignPackage";
import DesignStatusPill from "./DesignStatusPill";
import type { BriefStatus } from "./briefWorkflow";
import type { DesignStatus } from "./designSchema";
import { useSnags } from "./ffeQueries";
import { SnagList } from "./SnagList";

const Card = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <section className={cn("rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-3", className)}>
    <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</h3>
    {children}
  </section>
);
const Row = ({ k, v, className }: { k: string; v: ReactNode; className?: string }) => (
  <div className="flex items-baseline justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{k}</span>
    <span className={cn("text-right", className)}>{v ?? "—"}</span>
  </div>
);
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

/* ---------------- overview ---------------- */

export const OverviewTab = ({ project }: { project: Project }) => {
  const { member } = useWorkspace();
  const commercial = member?.role === "gm" || member?.role === "sales";
  // Sales never fetch cost figures: contract value beside cost is the margin.
  const seesCost = member?.role === "gm" || member?.role === "designer" || member?.role === "coordinator";
  const { data: costs } = useProjectCosts(project.id, member?.role);
  const balance = project.value === null ? null : Number(project.value) - Number(project.received ?? 0);
  const left = project.handover_date ? daysBetween(todayISO(), project.handover_date) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {commercial && (
          <Card title="Commercial">
            <Row k="Contract value" v={aed(project.value)} />
            <Row k="Received" v={aed(project.received)} />
            <Row k="Balance" v={aed(balance)} />
            <Row k="Payment status" v={project.pay_status} className={cn(project.pay_status === "Overdue" && "text-destructive")} />
            <Row k="Next due" v={project.next_due ? `${project.next_due}${project.next_due_date ? ` · ${shortDate(project.next_due_date)}` : ""}` : null} />
            {seesCost && (
              <>
                <Row k="Est. procurement" v={aed(costs?.est_proc ?? null)} />
                <Row k="Est. operations" v={aed(costs?.est_ops ?? null)} />
                <Row k="Actual procurement" v={aed(costs?.act_proc ?? null)} />
              </>
            )}
          </Card>
        )}
        <Card title="Schedule">
          <Row k="Start" v={shortDate(project.start_date)} />
          <Row k="Handover" v={shortDate(project.handover_date)} />
          <Row k="Drive folder" v={project.drive_url ? <DriveLink url={project.drive_url} /> : null} />
          <Row
            k="Days remaining"
            v={left === null ? null : project.stage === "Closed" ? "Closed" : left < 0 ? `${-left} days late` : `${left} days`}
            className={cn(left !== null && left < 0 && project.stage !== "Closed" && "text-destructive")}
          />
        </Card>
        <Card title="Progress">
          {[["Overall", project.overall_pct], ["Procurement", project.proc_pct]].map(([k, v]) => (
            <div key={k as string} className="space-y-1">
              <Row k={k as string} v={`${v}%`} />
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </Card>
      </div>
      <CommentThread projectId={project.id} parentName={`${project.code} ${project.name}`} />
    </div>
  );
};

/* ---------------- brief / design ---------------- */

export const BriefTab = ({ project }: { project: Project }) => {
  const { data: lead, isLoading: l1 } = useLead(project.lead_id ?? undefined);
  const { data: brief, isLoading: l2 } = useBrief(project.lead_id ?? undefined);
  const [open, setOpen] = useState(false);
  if (!project.lead_id) return <Card title="Client brief"><p className="text-sm text-muted-foreground">No brief — this project was created directly.</p></Card>;
  if (l1 || l2) return <p className="text-muted-foreground">Loading…</p>;
  if (!lead || !brief) return <Card title="Client brief"><p className="text-sm text-muted-foreground">No brief{lead ? "" : " you can see"} for the originating lead.</p></Card>;
  return (
    <Card title="Client brief">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BriefStatusPill status={brief.status as BriefStatus} />
        <Button variant="outline" onClick={() => setOpen(true)}>View brief</Button>
      </div>
      <BriefEditor open={open} onOpenChange={setOpen} lead={lead} brief={brief} viewOnly />
    </Card>
  );
};

export const DesignTab = ({ project }: { project: Project }) => {
  const { data: designs = [], isLoading } = useDesigns(project.lead_id ?? undefined);
  const [open, setOpen] = useState(false);
  if (!project.lead_id) return <Card title="Design"><p className="text-sm text-muted-foreground">No design — this project was created directly.</p></Card>;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const accepted = designs.find((d) => d.status === "Accepted");
  return (
    <Card title="Design">
      {accepted ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Version {accepted.version} <DesignStatusPill status={accepted.status as DesignStatus} className="ml-2" /></p>
          <Button variant="outline" onClick={() => setOpen(true)}>View approved design</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No accepted design yet.</p>
      )}
      <DesignPackage leadId={project.lead_id} open={open} onOpenChange={setOpen} viewOnly />
    </Card>
  );
};

/* ---------------- timeline ---------------- */

export const TimelineTab = ({ project }: { project: Project }) => {
  const idx = PROJECT_STAGES.indexOf(project.stage as (typeof PROJECT_STAGES)[number]);
  return (
    <Card title="Timeline">
      <ol className="space-y-3">
        {PROJECT_STAGES.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full border", i < idx ? "border-primary bg-primary/40" : i === idx ? "border-primary bg-primary" : "border-border")} />
            <div className="text-sm">
              <p className={cn(i > idx && "text-muted-foreground")}>{s}{i === idx && " · current"}</p>
              {i === 0 && project.start_date && <p className="text-xs text-muted-foreground">Started {shortDate(project.start_date)}</p>}
              {s === "Handover" && project.handover_date && <p className="text-xs text-muted-foreground">Planned {shortDate(project.handover_date)}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Dates each stage was reached are not tracked yet.</p>
    </Card>
  );
};

/* ---------------- tasks ---------------- */

export const TasksTab = ({ project }: { project: Project }) => {
  const { data: tasks = [], isLoading } = useProjectTasks(project.id);
  return (
    <Card title="Tasks">
      <NewTaskForm project={project} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="divide-y divide-border">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
      )}
    </Card>
  );
};

/* ---------------- issues ---------------- */

const SEVERITIES = ["Low", "Medium", "High"] as const;
const ISSUE_STATUSES = ["Open", "Escalated", "Resolved"] as const;
const NONE = "__none";

const IssueDialog = ({ projectId, issue, open, onOpenChange }: { projectId: string; issue: Issue | null; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const save = useSaveIssue();
  const [title, setTitle] = useState(issue?.title ?? "");
  const [detail, setDetail] = useState(issue?.detail ?? "");
  const submit = async () => {
    const t = title.trim();
    if (!t) return toast.error("Give the issue a title");
    try {
      await save.mutateAsync({ id: issue?.id, projectId, values: { title: t.slice(0, 300), detail: detail.trim() || null } });
      onOpenChange(false);
    } catch (e) { toast.error(errMsg(e, "Could not save")); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{issue ? "Edit issue" : "New issue"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="is-t">Title</Label><Input id="is-t" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="is-d">Detail</Label><Textarea id="is-d" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const IssuesTab = ({ project }: { project: Project }) => {
  const { data: issues = [], isLoading } = useIssues(project.id);
  const { data: members = [] } = useMembers();
  const save = useSaveIssue();
  const [editing, setEditing] = useState<Issue | null>(null);
  const [open, setOpen] = useState(false);
  const patch = (i: Issue, values: Partial<Issue>) =>
    save.mutate({ id: i.id, projectId: project.id, values }, { onError: (e) => toast.error(errMsg(e, "Could not update")) });

  return (
    <Card title="Issues">
      <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>Raise issue</Button>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues raised.</p>
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((i) => (
            <li key={i.id} className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn("break-words text-sm", i.status === "Resolved" && "text-muted-foreground line-through")}>{i.title}</p>
                  {i.detail && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{i.detail}</p>}
                  <p className="text-xs text-muted-foreground">Raised {shortDate(i.raised_on)}{i.resolved_at && ` · resolved ${shortDate(i.resolved_at)}`}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setOpen(true); }}>Edit</Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Select value={i.severity} onValueChange={(v) => patch(i, { severity: v as Issue["severity"] })}>
                  <SelectTrigger aria-label="Severity" className={cn(i.severity === "High" && "text-destructive")}><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s} severity</SelectItem>)}</SelectContent>
                </Select>
                <Select value={i.owner_id ?? NONE} onValueChange={(v) => patch(i, { owner_id: v === NONE ? null : v })}>
                  <SelectTrigger aria-label="Owner"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No owner</SelectItem>
                    {members.filter((m) => m.active).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={i.status} onValueChange={(v) => patch(i, { status: v as Issue["status"] })}>
                  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                  <SelectContent>{ISSUE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <IssueDialog key={editing?.id ?? "new"} projectId={project.id} issue={editing} open={open} onOpenChange={setOpen} />}
    </Card>
  );
};

/* ---------------- change requests ---------------- */

export const ChangesTab = ({ project }: { project: Project }) => {
  const { member } = useWorkspace();
  const { data: crs = [], isLoading } = useChangeRequests(project.id);
  const { data: members = [] } = useMembers();
  const raise = useRaiseCR();
  const decide = useDecideCR();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [cost, setCost] = useState("0");
  const [days, setDays] = useState("0");
  const isGm = member?.role === "gm";
  const approvedTotal = crs.filter((c) => c.status === "Approved").reduce((s, c) => s + Number(c.cost_delta), 0);

  const submit = async () => {
    const t = title.trim();
    const c = Number(cost); const d = Number(days);
    if (!t) return toast.error("Give the change a title");
    if (Number.isNaN(c) || !Number.isInteger(d)) return toast.error("Cost and days must be numbers (days whole)");
    try {
      await raise.mutateAsync({ project_id: project.id, title: t.slice(0, 300), detail: detail.trim() || null, cost_delta: c, days_delta: d, source: member?.full_name ?? null });
      setOpen(false); setTitle(""); setDetail(""); setCost("0"); setDays("0");
    } catch (e) { toast.error(errMsg(e, "Could not raise")); }
  };

  return (
    <Card title="Change requests">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Approved total: <span className={cn(approvedTotal < 0 && "text-destructive")}>{signedAed(approvedTotal)}</span></p>
        <Button size="sm" onClick={() => setOpen(true)}>Raise change request</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : crs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No change requests.</p>
      ) : (
        <ul className="divide-y divide-border">
          {crs.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm">{c.title}</p>
                {c.detail && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{c.detail}</p>}
                <p className="text-xs text-muted-foreground">
                  <span className={cn(Number(c.cost_delta) < 0 && "text-destructive")}>{signedAed(c.cost_delta)}</span>
                  {" · "}{c.days_delta > 0 ? `+${c.days_delta}` : c.days_delta < 0 ? `−${-c.days_delta}` : 0} days · raised {shortDate(c.raised_on)}
                </p>
                <p className="text-xs">
                  {c.status}
                  {c.decided_at && <span className="text-muted-foreground"> by {members.find((m) => m.user_id === c.decided_by)?.full_name ?? "someone"} {formatDistanceToNow(new Date(c.decided_at), { addSuffix: true })}</span>}
                </p>
              </div>
              {isGm && c.status === "Pending Approval" && member && (
                <div className="flex gap-2">
                  <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: c.id, projectId: project.id, approve: true, by: member.user_id }, { onError: (e) => toast.error(errMsg(e, "Failed")) })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: c.id, projectId: project.id, approve: false, by: member.user_id }, { onError: (e) => toast.error(errMsg(e, "Failed")) })}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise change request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="cr-t">Title</Label><Input id="cr-t" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="cr-d">Detail</Label><Textarea id="cr-d" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="cr-c">Cost change (AED)</Label><Input id="cr-c" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="cr-n">Days change</Label><Input id="cr-n" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Use a negative number for savings or time gained.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={raise.isPending}>Raise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ---------------- snagging (handover checklist only) ---------------- */

export const SnaggingTab = ({ project }: { project: Project }) => {
  const { member } = useWorkspace();
  const { data: items = [], isLoading } = useHandover(project.id);
  const { data: snags = [] } = useSnags(project.id);
  const { data: members = [] } = useMembers();
  const tick = useTickHandover();
  // "Snag list closed" is satisfied automatically once there is at least one snag and all are verified.
  const snagsClosed = snags.length > 0 && snags.every((s) => s.status === "Verified");
  const isAuto = (label: string) => label === "Snag list closed" && snagsClosed;
  const done = items.filter((i) => i.done || isAuto(i.label)).length;
  return (
    <div className="space-y-4">
      <SnagList project={project} snags={snags} />
      <Card title={`Handover checklist · ${done} of ${items.length}`}>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <ul className="divide-y divide-border">
            {items.map((i) => {
              const auto = isAuto(i.label);
              const checked = i.done || auto;
              return (
                <li key={i.id} className="flex items-start gap-3 py-3">
                  <Checkbox id={`ho-${i.id}`} className="mt-0.5" checked={checked} disabled={!member || auto}
                    onCheckedChange={(c) => member && tick.mutate({ id: i.id, projectId: project.id, done: c === true, by: member.user_id }, { onError: (e) => toast.error(errMsg(e, "Failed")) })} />
                  <label htmlFor={`ho-${i.id}`} className="min-w-0 flex-1 text-sm">
                    <span className={cn(checked && "text-muted-foreground line-through")}>{i.label}</span>
                    {auto && !i.done ? (
                      <span className="block text-xs text-muted-foreground">Automatically satisfied — every snag is verified</span>
                    ) : i.done && i.done_at && (
                      <span className="block text-xs text-muted-foreground">
                        {members.find((m) => m.user_id === i.done_by)?.full_name ?? "Someone"} · {shortDate(i.done_at)}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

/* ---------------- files ---------------- */

const FILE_CATEGORIES = ["Contract", "Invoice", "Floor plan", "Quote", "Photo", "Other"];
const MAX_FILE = 25 * 1024 * 1024;

export const FilesTab = ({ project }: { project: Project }) => {
  const { member } = useWorkspace();
  const { data: files = [], isLoading } = useProjectFiles(project.id);
  const { data: members = [] } = useMembers();
  const { data: urls } = useSignedUrls(files.map((f) => f.storage_path));
  const upload = useUploadProjectFile();
  const [category, setCategory] = useState("Other");
  const input = useRef<HTMLInputElement>(null);

  const onFiles = async (list: FileList | null) => {
    if (!list || !member) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE) { toast.error(`${file.name} is over 25 MB`); continue; }
      try {
        await upload.mutateAsync({ projectId: project.id, file, category, by: member.user_id });
      } catch (e) { toast.error(errMsg(e, `Could not upload ${file.name}`)); }
    }
    if (input.current) input.current.value = "";
  };

  return (
    <Card title="Files">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>{FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <Button onClick={() => input.current?.click()} disabled={upload.isPending}>{upload.isPending ? "Uploading…" : "Upload files"}</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((f) => {
            const url = urls?.get(f.storage_path);
            return (
              <li key={f.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-all text-sm">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.category ?? "Other"} · {fileSize(f.size_bytes)} · {members.find((m) => m.user_id === f.uploaded_by)?.full_name ?? "Someone"} · {shortDate(f.created_at)}
                  </p>
                </div>
                {url ? (
                  <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer" download={f.file_name}>Download</a></Button>
                ) : (
                  <span className="text-xs text-muted-foreground">…</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export const ComingSoon = () => (
  <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">Coming in the next release.</div>
);
