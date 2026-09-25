import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../WorkspaceProvider";
import type { WorkspaceRole } from "../access";
import {
  stagePct, useChangeRequests, useIssues, useProject, useProjectTasks, useUpdateProject,
} from "../projectQueries";
import { PROJECT_STAGES, RiskDot, StagePill, TAB_LABEL, TABS_BY_ROLE, type ProjectStage, type ProjectTab } from "../projectConstants";
import {
  BriefTab, ChangesTab, ComingSoon, DesignTab, DrawingsChecklist, FilesTab, IssuesTab, OverviewTab, SignedContractCard, SnaggingTab, TasksTab, TimelineTab,
} from "../ProjectTabs";
import { Team } from "./Projects";
import { FfeTab, ProcurementTab } from "../FfeTab";

const ProjectDetail = () => {
  const { code } = useParams();
  const { member } = useWorkspace();
  const { data: project, isLoading, error } = useProject(code);
  const { data: tasks = [] } = useProjectTasks(project?.id);
  const { data: issues = [] } = useIssues(project?.id);
  const { data: crs = [] } = useChangeRequests(project?.id);
  const update = useUpdateProject();
  const [params, setParams] = useSearchParams();

  const back = (
    <Link to="/workspace/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> All projects
    </Link>
  );
  if (isLoading) return <div className="space-y-4">{back}<p className="text-muted-foreground">Loading…</p></div>;
  if (error) return <div className="space-y-4">{back}<p className="text-destructive">{(error as Error).message}</p></div>;
  if (!project || !member) return <div className="space-y-4">{back}<p className="text-muted-foreground">This project doesn't exist or you don't have access to it.</p></div>;

  const role = member.role as WorkspaceRole;
  const tabs = TABS_BY_ROLE[role];
  const requested = params.get("tab") as ProjectTab | null;
  const tab: ProjectTab = requested && tabs.includes(requested) ? requested : "overview";
  const stage = project.stage as ProjectStage;
  const idx = PROJECT_STAGES.indexOf(stage);
  const next = idx < PROJECT_STAGES.length - 1 ? PROJECT_STAGES[idx + 1] : null;
  const isGm = role === "gm";

  const counts: Partial<Record<ProjectTab, number>> = {
    tasks: tasks.filter((t) => !t.done).length,
    issues: issues.filter((i) => i.status !== "Resolved").length,
    changes: crs.length,
  };
  const label = (t: ProjectTab) =>
    t === "tasks" ? `Tasks · ${counts.tasks} open` : t === "issues" ? `Issues · ${counts.issues} unresolved` : t === "changes" ? `Change Requests · ${counts.changes}` : TAB_LABEL[t];

  const setStage = async (s: ProjectStage) => {
    try {
      await update.mutateAsync({ id: project.id, values: { stage: s, overall_pct: stagePct(s) } });
      toast.success(`Moved to ${s}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stage");
    }
  };

  const body = (() => {
    switch (tab) {
      case "overview": return <OverviewTab project={project} />;
      case "brief": return <BriefTab project={project} />;
      case "design": return <DesignTab project={project} />;
      case "ffe": return <FfeTab project={project} />;
      case "procurement": return <ProcurementTab project={project} />;
      case "timeline": return <TimelineTab project={project} />;
      case "tasks": return <TasksTab project={project} />;
      case "issues": return <IssuesTab project={project} />;
      case "changes": return <ChangesTab project={project} />;
      case "snagging": return <SnaggingTab project={project} />;
      case "files": return <FilesTab project={project} />;
      default: return <ComingSoon />;
    }
  })();

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-primary">{project.code}</p>
          <h2 className="font-heading uppercase text-2xl md:text-3xl tracking-wide break-words">{project.name}</h2>
          <p className="text-sm text-muted-foreground">{project.client ?? "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StagePill stage={stage} />
          <RiskDot risk={project.risk} />
          <Team ids={[project.sales_id, project.designer_id, project.coordinator_id]} />
        </div>
      </div>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-4">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {PROJECT_STAGES.map((s, i) => (
            <li key={s} className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap",
              i === idx && "border-primary bg-primary text-primary-foreground",
              i < idx && "border-primary text-primary",
              i > idx && "border-border text-muted-foreground opacity-60",
            )}>
              {i < idx && <Check className="h-3 w-3" />}{s}
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {next && <Button onClick={() => setStage(next)} disabled={update.isPending}>Advance to {next}</Button>}
          {isGm && (
            <Select value={stage} onValueChange={(v) => v !== stage && setStage(v as ProjectStage)}>
              <SelectTrigger className="sm:w-56" aria-label="Set stage"><SelectValue placeholder="Set stage" /></SelectTrigger>
              <SelectContent>{PROJECT_STAGES.map((s) => <SelectItem key={s} value={s}>Set stage: {s}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground sm:ml-auto">{project.overall_pct}% complete</span>
        </div>
      </section>

      <SignedContractCard project={project} />
      <DrawingsChecklist project={project} />

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0" aria-label="Project sections">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setParams({ tab: t }, { replace: true })}
            className={cn("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              t === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label(t)}
          </button>
        ))}
      </nav>

      {body}
    </div>
  );
};

export default ProjectDetail;
