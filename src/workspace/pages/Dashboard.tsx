import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../WorkspaceProvider";
import { useBriefList, useLeads } from "../queries";
import { useDesignStatuses } from "../designQueries";
import { isClosed } from "../constants";
import { isDue, shortDate } from "../format";
import StatusPill from "../StatusPill";
import { useMyTasks, useProjects } from "../projectQueries";
import { dueTaskCount } from "../TaskList";
import AssignQueue, { useAssignQueue } from "../AssignQueue";
import BriefStatusPill from "../BriefStatusPill";
import type { BriefStatus } from "../briefWorkflow";
import { DESIGNER_LABEL, isMineBrief } from "./Briefs";

const Dashboard = () => {
  const { member } = useWorkspace();
  const first = member?.full_name.split(" ")[0] ?? "";
  const { data: leads = [], isLoading } = useLeads();

  const { data: designStatuses } = useDesignStatuses();
  const { data: briefs = [] } = useBriefList();
  const role = member?.role;
  const { rows: queue } = useAssignQueue(role === "gm");
  const { data: projects = [] } = useProjects();
  const { data: myTasks = [] } = useMyTasks(member?.user_id);
  const tasksDue = dueTaskCount(myTasks);
  const atRisk = projects.filter((p) => p.stage !== "Closed" && p.risk === "Red").length;
  const awaitingReview = [...(designStatuses?.values() ?? [])].filter((d) => d.status === "Submitted").length;
  const myBriefs = role === "designer" ? briefs.filter((b) => isMineBrief(b, member?.user_id)) : [];
  const inDesign = myBriefs.filter((b) => b.status !== "Design Approved").length;
  const myOrdered = [...myBriefs.filter((b) => b.status !== "Design Approved"), ...myBriefs.filter((b) => b.status === "Design Approved")];

  // Post-signing drawings past their 2-day deadline, one row per project.
  const today = new Date().toISOString().slice(0, 10);
  const lateDrawings = [...myTasks.filter((t) => t.drawing_kind && !t.done && t.due_date && t.due_date < today)
    .reduce((m, t) => m.set(t.project_id!, [...(m.get(t.project_id!) ?? []), t]), new Map<string, typeof myTasks>())]
    .map(([pid, ts]) => ({ project: projects.find((p) => p.id === pid), tasks: ts }));

  const now = new Date();
  const active = leads.filter((l) => !isClosed(l.status));
  const due = active
    .filter((l) => isDue(l.next_follow))
    .sort((a, b) => (a.next_follow ?? "").localeCompare(b.next_follow ?? ""));
  const wonThisMonth = leads.filter((l) => {
    if (l.status !== "Won") return false;
    const d = new Date(l.updated_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const stats: { label: string; value: number | string; caption?: string; alert?: boolean }[] = [
    { label: "Active leads", value: active.length },
    { label: "Follow-up due", value: due.length, alert: due.length > 0 },
    { label: "Won this month", value: wonThisMonth.length },
    { label: "Live projects", value: projects.filter((p) => p.stage !== "Closed").length },
    { label: "Tasks due", value: tasksDue, caption: "assigned to you", alert: tasksDue > 0 },
  ];
  if (role === "gm" || role === "sales") stats.splice(2, 0, { label: "Awaiting your review", value: awaitingReview, caption: "submitted designs", alert: awaitingReview > 0 });
  if (role === "gm") stats.push({ label: "At risk", value: atRisk, caption: "red projects", alert: atRisk > 0 });
  if (role === "designer") stats.splice(2, 0, { label: "In design", value: inDesign, caption: "live briefs assigned to you" });

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl">Welcome, {first}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[var(--radius)] border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className={cn("mt-2 font-heading text-3xl", s.alert && "text-destructive")}>{isLoading ? "–" : s.value}</p>
            {s.caption && <p className="text-xs text-muted-foreground">{s.caption}</p>}
          </div>
        ))}
      </div>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-3">
        <h3 className="font-heading uppercase text-xl tracking-wide">Needs your attention</h3>
        {queue.length > 0 && (
          <div className="space-y-1 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-3 pt-3">
            <p className="text-sm font-medium text-foreground">{queue.length} brief{queue.length === 1 ? "" : "s"} waiting for a designer</p>
            <AssignQueue rows={queue} />
          </div>
        )}
        {lateDrawings.length > 0 && (
          <div className="space-y-1 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 px-3 py-3">
            <p className="text-sm font-medium text-foreground">{lateDrawings.reduce((n, g) => n + g.tasks.length, 0)} drawing{lateDrawings.reduce((n, g) => n + g.tasks.length, 0) === 1 ? "" : "s"} overdue for procurement</p>
            <ul className="divide-y divide-border">
              {lateDrawings.map(({ project, tasks }) => (
                <li key={tasks[0].id}>
                  <Link to={project ? `/workspace/projects/${project.code}` : "/workspace/tasks"} className="flex flex-col gap-0.5 py-2 hover:text-primary sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate">{project?.client ?? project?.name ?? "Project"}</span>
                    <span className="text-xs text-destructive">{tasks.map((t) => t.title).join(" · ")} · due {shortDate(tasks[0].due_date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : due.length === 0 ? (
          queue.length === 0 && lateDrawings.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>
        ) : (
          <ul className="divide-y divide-border">
            {due.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link to={`/workspace/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                  <div className="min-w-0">
                    <p className="truncate">{l.name}</p>
                    <p className="text-xs text-destructive">Follow-up {shortDate(l.next_follow)}</p>
                  </div>
                  <StatusPill status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {role === "designer" && (
        <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-3">
          <h3 className="font-heading uppercase text-xl tracking-wide">My briefs <span className="text-muted-foreground text-base">({myBriefs.length})</span></h3>
          {myOrdered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing assigned to you.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myOrdered.map((b) => (
                <li key={b.id}>
                  <Link to={`/workspace/leads/${b.lead_id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                    <div className="min-w-0">
                      <p className="truncate">{b.leads?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{[b.leads?.property, b.leads?.unit_type].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    <BriefStatusPill status={b.status as BriefStatus} label={DESIGNER_LABEL[b.status as BriefStatus]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default Dashboard;
