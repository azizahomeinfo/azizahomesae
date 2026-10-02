import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database } from "@/integrations/supabase/types";
import { keys } from "./queries";
import { PROJECT_STAGES, type ProjectStage } from "./projectConstants";

type T = Database["public"]["Tables"];
export type Project = Pick<
  T["projects"]["Row"],
  | "id" | "code" | "lead_id" | "name" | "client" | "property" | "unit" | "unit_type" | "location" | "drive_url"
  | "sales_id" | "designer_id" | "coordinator_id" | "start_date" | "handover_date" | "actual_handover"
  | "stage" | "risk" | "overall_pct" | "proc_pct" | "received"
  | "next_due" | "next_due_date" | "pay_status" | "created_at" | "updated_at" | "confirmed_at" | "confirmed_by"
>;
export type Task = Pick<
  T["tasks"]["Row"],
  "id" | "project_id" | "lead_id" | "title" | "assignee_id" | "due_date" | "due_at" | "priority" | "done" | "done_at" | "created_at" | "drawing_kind"
>;
export type Issue = Pick<
  T["issues"]["Row"],
  "id" | "project_id" | "title" | "detail" | "severity" | "owner_id" | "raised_on" | "status" | "resolved_at"
>;
export type ChangeRequest = Pick<
  T["change_requests"]["Row"],
  "id" | "project_id" | "title" | "detail" | "raised_on" | "days_delta" | "status" | "decided_at" | "decided_by"
> & { cost_delta: number | null };
export type HandoverItem = Pick<T["handover_items"]["Row"], "id" | "project_id" | "label" | "sort_order" | "done" | "done_at" | "done_by">;
export type ProjectFile = Pick<
  T["project_files"]["Row"],
  "id" | "project_id" | "lead_id" | "storage_path" | "file_name" | "category" | "size_bytes" | "uploaded_by" | "created_at" | "in_drive"
>;

// projects.value is revoked from staff (contract value lives in project_value_private) — never list it here.
const PROJECT_COLS =
  "id, code, lead_id, name, client, property, unit, unit_type, location, sales_id, designer_id, coordinator_id, start_date, handover_date, actual_handover, stage, risk, overall_pct, proc_pct, received, next_due, next_due_date, pay_status, drive_url, created_at, updated_at";
const TASK_COLS = "id, project_id, lead_id, title, assignee_id, due_date, due_at, priority, done, done_at, created_at, drawing_kind";
const ISSUE_COLS = "id, project_id, title, detail, severity, owner_id, raised_on, status, resolved_at";
const CR_COLS = "id, project_id, title, detail, raised_on, days_delta, status, decided_at, decided_by";
const HANDOVER_COLS = "id, project_id, label, sort_order, done, done_at, done_by";
const FILE_COLS = "id, project_id, lead_id, storage_path, file_name, category, size_bytes, uploaded_by, created_at, in_drive";
const BUCKET = "workspace";

export const pKeys = {
  projects: ["ws", "projects"] as const,
  project: (code: string) => ["ws", "project", code] as const,
  tasks: (projectId: string) => ["ws", "tasks", projectId] as const,
  myTasks: (uid: string) => ["ws", "my-tasks", uid] as const,
  issues: (projectId: string) => ["ws", "issues", projectId] as const,
  crs: (projectId: string) => ["ws", "crs", projectId] as const,
  handover: (projectId: string) => ["ws", "handover", projectId] as const,
  files: (projectId: string) => ["ws", "project-files", projectId] as const,
};

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};
const notify = async (targets: T["notifications"]["Insert"][]) => {
  if (!targets.length) return;
  const { error } = await supabase.from("notifications").insert(targets);
  fail(error);
};

/* ---------------- projects ---------------- */

export const useProjects = () =>
  useQuery({
    queryKey: pKeys.projects,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select(PROJECT_COLS).order("created_at", { ascending: false });
      fail(error);
      return (data ?? []) as Project[];
    },
  });

export const useProject = (code: string | undefined) =>
  useQuery({
    queryKey: pKeys.project(code ?? ""),
    enabled: !!code,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select(PROJECT_COLS).eq("code", code!).maybeSingle();
      fail(error);
      return (data ?? null) as Project | null;
    },
  });

/** Contract value per project (RLS: GM and the project's sales owner only). Only fetched for those roles. */
export const useProjectValues = (role: string | undefined) =>
  useQuery({
    queryKey: ["ws", "project-values"],
    enabled: role === "gm" || role === "sales",
    queryFn: async () => {
      const { data, error } = await supabase.from("project_value_private").select("project_id, value");
      fail(error);
      return new Map((data ?? []).map((r) => [r.project_id, r.value === null ? null : Number(r.value)]));
    },
  });

export type ProjectCosts = Pick<T["project_costs_private"]["Row"], "est_proc" | "act_proc" | "est_ops" | "act_ops">;
/** Cost figures sit in project_costs_private (RLS: never sales). Only fetched for cost-seeing roles. */
export const useProjectCosts = (projectId: string | undefined, role: string | undefined) =>
  useQuery({
    queryKey: ["ws", "project-costs", projectId ?? ""],
    enabled: !!projectId && (role === "gm" || role === "designer" || role === "coordinator"),
    queryFn: async () => {
      const { data, error } = await supabase.from("project_costs_private")
        .select("est_proc, act_proc, est_ops, act_ops").eq("project_id", projectId!).maybeSingle();
      fail(error);
      return (data ?? null) as ProjectCosts | null;
    },
  });

export const useProjectCode = (id: string | null | undefined) =>
  useQuery({
    queryKey: ["ws", "project-code", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("code").eq("id", id!).maybeSingle();
      fail(error);
      return data?.code ?? null;
    },
  });

/** Fast path Won lead → project: one database transaction (ws_convert_lead) — project, coordinator, FF&E seeded and stamped, drawing tasks if a designer exists, notifications. */
export const useConvertLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; handover: string }) => {
      const { data, error } = await supabase.rpc("ws_convert_lead", { _lead: v.leadId, _handover: v.handover });
      fail(error);
      const r = data as { project_id: string; code: string | null; items: number };
      return { id: r.project_id, code: r.code, items: r.items };
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: pKeys.projects });
      qc.invalidateQueries({ queryKey: keys.lead(v.leadId) });
      qc.invalidateQueries({ queryKey: keys.leads });
      qc.invalidateQueries({ queryKey: ["ws"] });
    },
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: T["projects"]["Update"] }) => {
      const { data, error } = await supabase.from("projects").update(values).eq("id", id).select(PROJECT_COLS).single();
      fail(error);
      return data as Project;
    },
    onSuccess: (p) => {
      qc.setQueryData(pKeys.project(p.code), p);
      qc.invalidateQueries({ queryKey: pKeys.projects });
    },
  });
};


/* ---------------- tasks ---------------- */

export const useProjectTasks = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.tasks(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select(TASK_COLS).eq("project_id", projectId!)
        .order("done").order("due_date", { ascending: true, nullsFirst: false });
      fail(error);
      return (data ?? []) as Task[];
    },
  });

export const useMyTasks = (uid: string | undefined) =>
  useQuery({
    queryKey: pKeys.myTasks(uid ?? ""),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select(TASK_COLS).eq("assignee_id", uid!)
        .order("due_date", { ascending: true, nullsFirst: false });
      fail(error);
      return (data ?? []) as Task[];
    },
  });

const invalidateTasks = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["ws", "tasks"] });
  qc.invalidateQueries({ queryKey: ["ws", "my-tasks"] });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: T["tasks"]["Insert"] & { actorName: string; projectName: string }) => {
      const { actorName, projectName, ...row } = v;
      const { error } = await supabase.from("tasks").insert(row);
      fail(error);
      if (row.assignee_id && row.assignee_id !== row.created_by && row.project_id) {
        await notify([{ user_id: row.assignee_id, kind: "task", project_id: row.project_id, title: `${actorName} assigned you "${row.title}" on ${projectName}` }]);
      }
    },
    onSettled: () => invalidateTasks(qc),
  });
};

export const useToggleTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks").update({ done: v.done, done_at: v.done ? new Date().toISOString() : null }).eq("id", v.id);
      fail(error);
    },
    onSettled: () => invalidateTasks(qc),
  });
};

/* ---------------- issues ---------------- */

export const useIssues = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.issues(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select(ISSUE_COLS).eq("project_id", projectId!).order("raised_on", { ascending: false });
      fail(error);
      return (data ?? []) as Issue[];
    },
  });

export const useSaveIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id?: string; projectId: string; values: T["issues"]["Update"] }) => {
      const values = { ...v.values };
      if (values.status) values.resolved_at = values.status === "Resolved" ? new Date().toISOString() : null;
      const { error } = v.id
        ? await supabase.from("issues").update(values).eq("id", v.id)
        : await supabase.from("issues").insert({ ...(values as T["issues"]["Insert"]), project_id: v.projectId });
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: pKeys.issues(v.projectId) }),
  });
};

/* ---------------- change requests ---------------- */

// cost_delta is what the client is charged: no direct SELECT grant, read only via ws_cr_costs (empty for coordinators).
export const useChangeRequests = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.crs(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const [{ data, error }, costs] = await Promise.all([
        supabase.from("change_requests").select(CR_COLS).eq("project_id", projectId!).order("raised_on", { ascending: false }),
        supabase.rpc("ws_cr_costs", { _project: projectId! }),
      ]);
      fail(error);
      fail(costs.error);
      const cost = new Map((costs.data ?? []).map((c) => [c.id, Number(c.cost_delta)]));
      return (data ?? []).map((r) => ({ ...r, cost_delta: cost.get(r.id) ?? null })) as ChangeRequest[];
    },
  });

export const useRaiseCR = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: T["change_requests"]["Insert"]) => {
      const { error } = await supabase.from("change_requests").insert(v);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: pKeys.crs(v.project_id) }),
  });
};

export const useDecideCR = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; projectId: string; approve: boolean; by: string }) => {
      const { error } = await supabase
        .from("change_requests")
        .update({ status: v.approve ? "Approved" : "Rejected", decided_at: new Date().toISOString(), decided_by: v.by })
        .eq("id", v.id);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: pKeys.crs(v.projectId) }),
  });
};

/* ---------------- handover ---------------- */

export const useHandover = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.handover(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("handover_items").select(HANDOVER_COLS).eq("project_id", projectId!).order("sort_order");
      fail(error);
      return (data ?? []) as HandoverItem[];
    },
  });

export const useTickHandover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; projectId: string; done: boolean; by: string }) => {
      const { error } = await supabase
        .from("handover_items")
        .update({ done: v.done, done_at: v.done ? new Date().toISOString() : null, done_by: v.done ? v.by : null })
        .eq("id", v.id);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: pKeys.handover(v.projectId) }),
  });
};

/* ---------------- files ---------------- */

export const useProjectFiles = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.files(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_files").select(FILE_COLS).eq("project_id", projectId!).order("created_at", { ascending: false });
      fail(error);
      return (data ?? []) as ProjectFile[];
    },
  });

/** Who a file belongs to: a project, or (deal documents only) a lead that isn't a project yet. */
export type FileOwner = { projectId: string | null; leadId: string | null };
const ownerKey = (o: FileOwner) => (o.projectId ? pKeys.files(o.projectId) : pKeys.files(`lead:${o.leadId}`));

/** Deal documents filed on a lead, including ones carried into its project (same rows). */
export const useLeadDealFiles = (leadId: string | undefined) =>
  useQuery({
    queryKey: pKeys.files(`lead:${leadId ?? ""}`),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_files").select(FILE_COLS).eq("lead_id", leadId!)
        .in("category", [...DEAL_RECORD_KINDS]).order("created_at", { ascending: false });
      fail(error);
      return (data ?? []) as ProjectFile[];
    },
  });

export const useUploadProjectFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: FileOwner & { file: File; category: string | null; by: string }) => {
      const ext = (v.file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      // Lead-only deal documents live under deals/<lead_id>/ and keep that path after the project is created.
      const path = v.projectId ? `projects/${v.projectId}/${crypto.randomUUID()}.${ext}` : `deals/${v.leadId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, v.file, { contentType: v.file.type || undefined });
      fail(upErr);
      const { error } = await supabase.from("project_files").insert({
        project_id: v.projectId, lead_id: v.leadId, storage_path: path, file_name: v.file.name.slice(0, 200),
        category: v.category, size_bytes: v.file.size, uploaded_by: v.by,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        fail(error);
      }
      return v;
    },
    // A drawing upload closes its task in the database, so tasks refresh too.
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ownerKey(v) });
      if (v.leadId) qc.invalidateQueries({ queryKey: pKeys.files(`lead:${v.leadId}`) });
      invalidateTasks(qc);
    },
  });
};

/** Removes the record, then the stored file. A drawing delete reopens its task in the database if it was the last one. */
export const useDeleteProjectFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: FileOwner & { id: string; path: string }) => {
      const { error } = await supabase.from("project_files").delete().eq("id", v.id);
      fail(error);
      await supabase.storage.from(BUCKET).remove([v.path]);
      return v;
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ownerKey(v) });
      if (v.leadId) qc.invalidateQueries({ queryKey: pKeys.files(`lead:${v.leadId}`) });
      invalidateTasks(qc);
    },
  });
};

/* ---------------- drawings (post-signing) ---------------- */

// Category strings are stable identifiers (tasks.drawing_kind, DB triggers, and any future Drive sync key off them).
// Ordered by deadline; hours mirror ws_drawing_hours, counted from projects.created_at.
export const DRAWING_KINDS = ["Cabinet drawings", "Furniture drawings", "Wall design drawings", "Hanging items, light fixtures & wall art"] as const;
export const DRAWING_HOURS: Record<(typeof DRAWING_KINDS)[number], number> = {
  "Cabinet drawings": 24, "Furniture drawings": 48, "Wall design drawings": 72, "Hanging items, light fixtures & wall art": 72,
};
export const isDrawingKind = (c: string | null | undefined) => (DRAWING_KINDS as readonly string[]).includes(c ?? "");

/** Tick "also in the client's Drive folder"; ws_sync_drawing_task closes/reopens the drawing task from it. */
export const useSetInDrive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; projectId: string; inDrive: boolean }) => {
      const { error } = await supabase.from("project_files").update({ in_drive: v.inDrive }).eq("id", v.id);
      fail(error);
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: pKeys.files(v.projectId) });
      invalidateTasks(qc);
    },
  });
};

/** GM-only (enforced in the DB). Pass null to clear. Creates the drawing tasks when a designer is set. */
export const useAssignDesigner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId?: string; projectId?: string; designerId: string | null }) => {
      const { error } = v.projectId
        ? await supabase.rpc("ws_assign_project_designer", { _project: v.projectId, _designer: v.designerId as string })
        : await supabase.rpc("ws_assign_lead_designer", { _lead: v.leadId as string, _designer: v.designerId as string });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ws"] }),
  });
};
export const SIGNED_CONTRACT = "Signed contract";
export const SALES_PROPOSAL = "Proposal";
/** Sales/GM-only categories (enforced by project_files policies); never drive drawing tasks. Stable keys. */
export const DEAL_RECORD_KINDS = [SIGNED_CONTRACT, SALES_PROPOSAL] as const;
/** Every file category treated as a deal record (designers and coordinators can't read or upload them; mirrors the DB). */
export const DEAL_CATEGORIES = [...DEAL_RECORD_KINDS, "Contract", "Quote"] as const;
