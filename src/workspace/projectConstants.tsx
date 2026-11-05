import { cn } from "@/lib/utils";
import { rolesOf, type WorkspaceRole } from "./access";

/** The active pipeline — the only place it is defined. Procurement is a parallel track (proc_pct), not a stage.
 *  Site Survey / Client Approval / Procurement remain in the enum as legacy; ws_project_guard refuses entering them. */
export const PROJECT_STAGES = [
  "Contract / Deposit", "Design", "Production", "Installation", "Snagging", "Handover", "Closed",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export type ProjectTab =
  | "overview" | "brief" | "design" | "ffe" | "procurement" | "timeline"
  | "tasks" | "issues" | "changes" | "snagging" | "files";

export const TAB_LABEL: Record<ProjectTab, string> = {
  overview: "Overview", brief: "Client Brief", design: "Design", ffe: "FF&E", procurement: "Procurement",
  timeline: "Timeline", tasks: "Tasks", issues: "Issues", changes: "Change Requests",
  snagging: "Snagging & Handover", files: "Files",
};

const ALL_TABS = Object.keys(TAB_LABEL) as ProjectTab[];

// Convenience only — RLS is the real boundary.
// The designer gets Procurement READ-ONLY (ProcurementTab's canEdit is gm/coordinator only): she
// specified every item, so she has to be able to see what was actually ordered and what has landed
// without asking the coordinator (Veronica, 2026-11-03, on Luca: "she cannot see what's delivered and
// what's not delivered… she cannot see what the coordinator did for the procurement"). It shows no
// money to her — useFfeItems is called with withCost = canEdit — and the Commercial card that carries
// the contract value stays gm/sales only, so the wall is untouched.
export const TABS_BY_ROLE: Record<WorkspaceRole, ProjectTab[]> = {
  gm: ALL_TABS,
  sales: ["overview", "brief", "timeline", "changes", "files"],
  designer: ["overview", "brief", "design", "ffe", "procurement", "timeline", "tasks", "issues", "changes", "files"],
  coordinator: ["overview", "brief", "design", "ffe", "procurement", "timeline", "tasks", "issues", "changes", "snagging", "files"],
};

/** Every tab either of someone's roles opens, in the canonical order (see rolesOf). */
export const tabsFor = (m: { role: string; second_role?: string | null } | null | undefined): ProjectTab[] => {
  const roles = rolesOf(m);
  return ALL_TABS.filter((t) => roles.some((r) => TABS_BY_ROLE[r].includes(t)));
};

export const RISK_DOT: Record<string, string> = { Green: "bg-primary", Yellow: "bg-secondary", Red: "bg-destructive" };

export const RiskDot = ({ risk, className }: { risk: string; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", className)}>
    <span className={cn("h-2.5 w-2.5 rounded-full border border-border", RISK_DOT[risk] ?? "bg-muted")} aria-hidden />
    {risk}
  </span>
);

export const StagePill = ({ stage, className }: { stage: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
      stage === "Closed" ? "border-border text-muted-foreground" : "border-transparent bg-primary/10 text-primary",
      className,
    )}
  >
    {stage}
  </span>
);

/** −AED 900 / +AED 1,200 with a real minus sign. */
export const signedAed = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  const abs = `AED ${Math.round(Math.abs(v)).toLocaleString("en-US")}`;
  return v < 0 ? `−${abs}` : v > 0 ? `+${abs}` : abs;
};

export const fileSize = (b: number | null | undefined) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
