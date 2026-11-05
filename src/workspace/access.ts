export type WorkspaceRole = "gm" | "sales" | "designer" | "coordinator";
export type WorkspacePage =
  | "dashboard"
  | "leads"
  | "briefs"
  | "proposals"
  | "contracts"
  | "projects"
  | "tasks"
  | "suppliers"
  | "guide"
  | "reports"
  | "settings";

// Convenience only — database RLS is the real access boundary.
export const PAGES_BY_ROLE: Record<WorkspaceRole, WorkspacePage[]> = {
  gm: ["dashboard", "leads", "briefs", "proposals", "contracts", "projects", "tasks", "suppliers", "guide", "reports", "settings"],
  sales: ["dashboard", "leads", "proposals", "contracts", "projects", "guide", "reports"],
  designer: ["dashboard", "briefs", "projects", "tasks", "suppliers"],
  coordinator: ["dashboard", "projects", "tasks", "suppliers", "guide"],
};

/**
 * One person can hold a second job — Suha designs AND coordinates (Veronica, 2026-11-05: "give her
 * account both roles"). `role` stays the PRIMARY one, because every rule of the form "designers and
 * coordinators must never see this" keys off it and must not change; these helpers answer the other
 * question, "may they do a <role> job". The database mirrors this exactly in ws_has_role.
 */
export interface RoleHolder { role: string; second_role?: string | null }
export const rolesOf = (m: RoleHolder | null | undefined): WorkspaceRole[] =>
  m ? ([m.role, m.second_role].filter(Boolean) as WorkspaceRole[]) : [];
/** "Can this person do a <role> job" — never use it to decide what someone may SEE. */
export const hasRole = (m: RoleHolder | null | undefined, role: WorkspaceRole) => rolesOf(m).includes(role);
/** Every page either of their roles opens, in the canonical order. */
export const pagesFor = (m: RoleHolder | null | undefined): WorkspacePage[] => {
  const roles = rolesOf(m);
  return PAGES_BY_ROLE.gm.filter((p) => roles.some((r) => PAGES_BY_ROLE[r].includes(p)));
};
/** The GM can do anything a <role> can; anyone else needs that role, primary or second. */
export const isGmOr = (m: RoleHolder | null | undefined, role: WorkspaceRole) =>
  hasRole(m, "gm") || hasRole(m, role);
export const canSeeAny = (m: RoleHolder | null | undefined, page: WorkspacePage) =>
  rolesOf(m).some((r) => PAGES_BY_ROLE[r].includes(page));

export const canSee = (role: WorkspaceRole | null | undefined, page: WorkspacePage) =>
  !!role && PAGES_BY_ROLE[role].includes(page);

export const PAGE_META: Record<WorkspacePage, { label: string; path: string; description: string }> = {
  dashboard: { label: "Dashboard", path: "/workspace", description: "Your day at a glance." },
  leads: { label: "Leads", path: "/workspace/leads", description: "Every enquiry from first contact to won or lost." },
  briefs: { label: "Briefs", path: "/workspace/briefs", description: "Client requirements handed to design." },
  proposals: { label: "Proposals", path: "/workspace/proposals", description: "Quotes sent to clients and their outcome." },
  contracts: { label: "Contracts", path: "/workspace/proposals", description: "Sales agreements generated from accepted proposals." },
  projects: { label: "Projects", path: "/workspace/projects", description: "Live jobs from deposit to handover." },
  tasks: { label: "Tasks", path: "/workspace/tasks", description: "What needs doing, by whom, and when." },
  suppliers: { label: "Suppliers", path: "/workspace/suppliers", description: "Who we buy from, their terms and how they perform." },
  guide: { label: "Playbook", path: "/workspace/guide", description: "How your job works — and, for sales, what to say on a first call." },
  reports: { label: "Reports", path: "/workspace/reports", description: "Pipeline, conversion and delivery from the rows you can see." },
  settings: { label: "Settings", path: "/workspace/settings", description: "Team roster, roles and invitations." },
};

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  gm: "General Manager",
  sales: "Sales",
  designer: "Designer",
  coordinator: "Coordinator",
};
