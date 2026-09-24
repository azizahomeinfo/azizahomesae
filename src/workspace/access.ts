export type WorkspaceRole = "gm" | "sales" | "designer" | "coordinator";
export type WorkspacePage =
  | "dashboard"
  | "leads"
  | "briefs"
  | "proposals"
  | "projects"
  | "tasks"
  | "suppliers"
  | "reports"
  | "settings";

// Convenience only — database RLS is the real access boundary.
export const PAGES_BY_ROLE: Record<WorkspaceRole, WorkspacePage[]> = {
  gm: ["dashboard", "leads", "briefs", "proposals", "projects", "tasks", "suppliers", "reports", "settings"],
  sales: ["dashboard", "leads", "proposals", "projects", "reports"],
  designer: ["dashboard", "briefs", "proposals", "projects", "tasks", "suppliers"],
  coordinator: ["dashboard", "projects", "tasks", "suppliers"],
};

export const canSee = (role: WorkspaceRole | null | undefined, page: WorkspacePage) =>
  !!role && PAGES_BY_ROLE[role].includes(page);

export const PAGE_META: Record<WorkspacePage, { label: string; path: string; description: string }> = {
  dashboard: { label: "Dashboard", path: "/workspace", description: "Your day at a glance." },
  leads: { label: "Leads", path: "/workspace/leads", description: "Every enquiry from first contact to won or lost." },
  briefs: { label: "Briefs", path: "/workspace/briefs", description: "Client requirements handed to design." },
  proposals: { label: "Proposals", path: "/workspace/proposals", description: "Quotes sent to clients and their outcome." },
  projects: { label: "Projects", path: "/workspace/projects", description: "Live jobs from deposit to handover." },
  tasks: { label: "Tasks", path: "/workspace/tasks", description: "What needs doing, by whom, and when." },
  suppliers: { label: "Suppliers", path: "/workspace/suppliers", description: "Who we buy from, their terms and how they perform." },
  reports: { label: "Reports", path: "/workspace/reports", description: "Pipeline, conversion and delivery from the rows you can see." },
  settings: { label: "Settings", path: "/workspace/settings", description: "Team roster, roles and invitations." },
};

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  gm: "General Manager",
  sales: "Sales",
  designer: "Designer",
  coordinator: "Coordinator",
};
