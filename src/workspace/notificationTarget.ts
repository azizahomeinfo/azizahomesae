import { canSee, type WorkspaceRole } from "./access";
import { TABS_BY_ROLE, type ProjectTab } from "./projectConstants";

export interface NotificationRef {
  kind: string;
  lead_id: string | null;
  project_id: string | null;
}

/** Where the work actually is, per notification kind, on a project. */
const PROJECT_TAB: Record<string, ProjectTab> = {
  procurement: "procurement",
  ffe_change: "procurement",
  ffe_changed: "procurement",
  ffe_complete: "procurement",
  ffe_reselect: "ffe",
  ffe_confirm: "ffe",
  budget: "ffe",
  drawings: "tasks",
  drawings_overdue: "tasks",
  drawing_uploaded: "files",
  design: "design",
  design_edit: "design",
  project: "overview",
};

/** FF&E-ish notices open the design package straight on its FF&E tab, not on the renders. */
const wantsFfeTab = (kind: string) =>
  kind === "costing" || kind === "budget" || kind.startsWith("ffe");

/**
 * The page where the reader can actually act, or null when there is nowhere useful to send them.
 *
 * Three things this has to respect:
 *  - a coordinator can open neither leads nor briefs, so a lead-only notice has no destination for them,
 *    while a project notice must land on the right tab (that case previously went nowhere at all);
 *  - a designer never gets the lead page (deal records, commercials) — they work from Briefs, so the
 *    design package is opened by URL instead (`?design=<leadId>`);
 *  - a tab the role cannot see falls back to overview rather than 404ing them.
 */
export const notificationTarget = (
  n: NotificationRef,
  role: WorkspaceRole | undefined,
  codeOf: (projectId: string) => string | undefined,
): string | null => {
  if (!role) return null;

  // A project notice is about live delivery work, so it wins over the lead it came from.
  if (n.project_id && canSee(role, "projects")) {
    const code = codeOf(n.project_id);
    if (code) {
      const want = PROJECT_TAB[n.kind] ?? "overview";
      const tab = TABS_BY_ROLE[role].includes(want) ? want : "overview";
      return `/workspace/projects/${encodeURIComponent(code)}?tab=${tab}`;
    }
    // The project list is still closer than nothing while the code is loading.
    if (!n.lead_id) return "/workspace/projects";
  }

  if (!n.lead_id) return null;
  const lead = n.lead_id;

  // Decisions on money happen on the proposal.
  if (n.kind === "discount" && canSee(role, "proposals")) return `/workspace/proposals/${lead}`;
  if (n.kind === "contract" && canSee(role, "contracts")) return `/workspace/contracts/${lead}`;

  // The designer's whole world is Briefs; open the package on the tab the notice is about.
  if (role === "designer") {
    return canSee(role, "briefs")
      ? `/workspace/briefs?design=${lead}${wantsFfeTab(n.kind) ? "&dtab=ffe" : ""}`
      : null;
  }

  // GM and sales: the lead page, with the package already open where the quote and FF&E live.
  if (canSee(role, "leads")) {
    const openPackage = wantsFfeTab(n.kind) || n.kind === "design" || n.kind === "design_edit";
    return openPackage
      ? `/workspace/leads/${lead}?design=${lead}${wantsFfeTab(n.kind) ? "&dtab=ffe" : ""}`
      : `/workspace/leads/${lead}`;
  }
  if (canSee(role, "briefs")) return `/workspace/briefs?design=${lead}`;
  return null;
};
