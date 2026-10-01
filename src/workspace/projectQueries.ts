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
  | "next_due" | "next_due_date" | "pay_status" | "created_at" | "updated_at"
>;
export type Task = Pick<
  T["tasks"]["Row"],
  "id" | "project_id" | "lead_id" | "title" | "assignee_id" | "due_date" | "priority" | "done" | "done_at" | "created_at" | "drawing_kind"
>;
export type Issue = Pick<
  T["issues"]["Row"],
  "id" | "project_id" | "title" | "detail" | "severity" | "owner_id" | "raised_on" | "status" | "resolved_at"
>;
export type ChangeRequest = Pick<
  T["change_requests"]["Row"],
  "id" | "project_id" | "title" | "detail" | "raised_on" | "cost_delta" | "days_delta" | "status" | "decided_at" | "decided_by"
>;
export type HandoverItem = Pick<T["handover_items"]["Row"], "id" | "project_id" | "label" | "sort_order" | "done" | "done_at" | "done_by">;
export type ProjectFile = Pick<
  T["project_files"]["Row"],
  "id" | "project_id" | "storage_path" | "file_name" | "category" | "size_bytes" | "uploaded_by" | "created_at"
>;

// projects.value is revoked from staff (contract value lives in project_value_private) — never list it here.
const PROJECT_COLS =
  "id, code, lead_id, name, client, property, unit, unit_type, location, sales_id, designer_id, coordinator_id, start_date, handover_date, actual_handover, stage, risk, overall_pct, proc_pct, received, next_due, next_due_date, pay_status, drive_url, created_at, updated_at";
const TASK_COLS = "id, project_id, lead_id, title, assignee_id, due_date, priority, done, done_at, created_at, drawing_kind";
const ISSUE_COLS = "id, project_id, title, detail, severity, owner_id, raised_on, status, resolved_at";
const CR_COLS = "id, project_id, title, detail, raised_on, cost_delta, days_delta, status, decided_at, decided_by";
const HANDOVER_COLS = "id, project_id, label, sort_order, done, done_at, done_by";
const FILE_COLS = "id, project_id, storage_path, file_name, category, size_bytes, uploaded_by, created_at";
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

export const useChangeRequests = (projectId: string | undefined) =>
  useQuery({
    queryKey: pKeys.crs(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("change_requests").select(CR_COLS).eq("project_id", projectId!).order("raised_on", { ascending: false });
      fail(error);
      return (data ?? []) as ChangeRequest[];
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

export const useUploadProjectFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; file: File; category: string | null; by: string }) => {
      const ext = (v.file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `projects/${v.projectId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, v.file, { contentType: v.file.type || undefined });
      fail(upErr);
      const { error } = await supabase.from("project_files").insert({
        project_id: v.projectId, storage_path: path, file_name: v.file.name.slice(0, 200),
        category: v.category, size_bytes: v.file.size, uploaded_by: v.by,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        fail(error);
      }
      return v;
    },
    // A drawing upload closes its task in the database, so tasks refresh too.
    onSettled: (_d, _e, v) => { qc.invalidateQueries({ queryKey: pKeys.files(v.projectId) }); invalidateTasks(qc); },
  });
};

/** Removes the record, then the stored file. A drawing delete reopens its task in the database if it was the last one. */
export const useDeleteProjectFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; projectId: string; path: string }) => {
      const { error } = await supabase.from("project_files").delete().eq("id", v.id);
      fail(error);
      await supabase.storage.from(BUCKET).remove([v.path]);
      return v;
    },
    onSettled: (_d, _e, v) => { qc.invalidateQueries({ queryKey: pKeys.files(v.projectId) }); invalidateTasks(qc); },
  });
};

/* ---------------- drawings (post-signing) ---------------- */

// Category strings are stable identifiers (tasks.drawing_kind, DB triggers, and any future Drive sync key off them).
export const DRAWING_KINDS = ["Wall design drawings", "Furniture drawings", "Cabinet drawings", "Artwork locations"] as const;
export const SIGNED_CONTRACT = "Signed contract";
export const SALES_PROPOSAL = "Proposal";
/** Sales/GM-only categories (enforced by project_files policies); never drive drawing tasks. Stable keys. */
export const DEAL_RECORD_KINDS = [SIGNED_CONTRACT, SALES_PROPOSAL] as const;
