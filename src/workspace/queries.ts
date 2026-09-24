import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Lead = T["leads"]["Row"];
export type LeadInsert = T["leads"]["Insert"];
export type LeadUpdate = T["leads"]["Update"];
export type Comment = Pick<T["comments"]["Row"], "id" | "lead_id" | "author_id" | "body" | "mentions" | "created_at">;
export type MemberLite = Pick<T["workspace_members"]["Row"], "user_id" | "full_name" | "role" | "title" | "active">;

const LEAD_COLS =
  "id, ref, name, phone, email, property, building, location, unit_type, size, handover_status, exp_handover, use_type, budget, target_date, scope, style, refs, floor_plan, source, sales_id, designer_id, status, last_contact, next_follow, notes, lost_reason, converted_project_id, is_demo, created_by, created_at, updated_at";
const COMMENT_COLS = "id, lead_id, author_id, body, mentions, created_at";
const MEMBER_COLS = "user_id, full_name, role, title, active";

export const keys: Record<string, any> = {
  leads: ["ws", "leads"] as const,
  lead: (id: string) => ["ws", "lead", id] as const,
  comments: (leadId: string) => ["ws", "comments", leadId] as const,
  members: ["ws", "members"] as const,
};

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export const useMembers = () =>
  useQuery({
    queryKey: keys.members,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_members").select(MEMBER_COLS).order("full_name");
      fail(error);
      return (data ?? []) as MemberLite[];
    },
  });

export const useLeads = () =>
  useQuery({
    queryKey: keys.leads,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select(LEAD_COLS).order("created_at", { ascending: false });
      fail(error);
      return (data ?? []) as Lead[];
    },
  });

export const useLead = (id: string | undefined) =>
  useQuery({
    queryKey: keys.lead(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select(LEAD_COLS).eq("id", id!).maybeSingle();
      fail(error);
      return (data ?? null) as Lead | null;
    },
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: LeadInsert) => {
      const { data, error } = await supabase.from("leads").insert(values).select(LEAD_COLS).single();
      fail(error);
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.leads }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LeadUpdate }) => {
      const { data, error } = await supabase.from("leads").update(values).eq("id", id).select(LEAD_COLS).single();
      fail(error);
      return data as Lead;
    },
    onSuccess: (lead) => {
      qc.setQueryData(keys.lead(lead.id), lead);
      qc.invalidateQueries({ queryKey: keys.leads });
    },
  });
};

export const useComments = (leadId: string | undefined) =>
  useQuery({
    queryKey: keys.comments(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(COMMENT_COLS)
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: true });
      fail(error);
      return (data ?? []) as Comment[];
    },
  });

export const usePostComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      leadId: string;
      leadName: string;
      authorId: string;
      authorName: string;
      body: string;
      mentions: string[];
    }) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({ lead_id: v.leadId, author_id: v.authorId, body: v.body, mentions: v.mentions })
        .select(COMMENT_COLS)
        .single();
      fail(error);
      const targets = v.mentions.filter((m) => m !== v.authorId);
      if (targets.length) {
        const { error: nErr } = await supabase.from("notifications").insert(
          targets.map((user_id) => ({
            user_id,
            kind: "mention",
            title: `${v.authorName} mentioned you on ${v.leadName}`,
            body: v.body.slice(0, 140),
            lead_id: v.leadId,
          })),
        );
        fail(nErr);
      }
      return data as Comment;
    },
    onSuccess: (_c, v) => qc.invalidateQueries({ queryKey: keys.comments(v.leadId) }),
  });
};

/* ---------------- Requirement briefs ---------------- */

export type BriefRow = Pick<
  T["requirement_briefs"]["Row"],
  | "id" | "lead_id" | "status" | "designer_id" | "header" | "style" | "colours" | "ffe" | "bedrooms" | "lists"
  | "attachments" | "revision_note" | "submitted_at" | "assigned_at" | "ready_at" | "approved_at" | "updated_at"
>;
export type BriefDocColumns = Pick<T["requirement_briefs"]["Update"], "header" | "style" | "colours" | "ffe" | "bedrooms" | "lists" | "attachments">;

const BRIEF_COLS =
  "id, lead_id, status, designer_id, header, style, colours, ffe, bedrooms, lists, attachments, revision_note, submitted_at, assigned_at, ready_at, approved_at, updated_at";
const BRIEF_LIST_COLS =
  "id, lead_id, status, designer_id, submitted_at, updated_at, leads(name, property, unit_type, budget, target_date, sales_id)";

export interface BriefListRow {
  id: string;
  lead_id: string;
  status: T["requirement_briefs"]["Row"]["status"];
  designer_id: string | null;
  submitted_at: string | null;
  updated_at: string;
  leads: { name: string; property: string | null; unit_type: string | null; budget: number | null; target_date: string | null; sales_id: string | null } | null;
}

export type QueueRow = Database["public"]["Functions"]["ws_brief_queue"]["Returns"][number];

export interface NotifyTarget { user_id: string; title: string; body?: string | null; lead_id: string; kind: string }

keys.brief = (leadId: string) => ["ws", "brief", leadId] as const;
Object.assign(keys, {
  briefs: ["ws", "briefs"] as const,
  queue: ["ws", "brief-queue"] as const,
  notifications: (uid: string) => ["ws", "notifications", uid] as const,
});
const K = keys as typeof keys & {
  brief: (leadId: string) => readonly unknown[];
  briefs: readonly unknown[];
  queue: readonly unknown[];
  notifications: (uid: string) => readonly unknown[];
};

/** Insert notifications without .select(): the author cannot read rows addressed to others. */
const notify = async (targets: NotifyTarget[]) => {
  if (!targets.length) return;
  const { error } = await supabase.from("notifications").insert(targets);
  fail(error);
};

export const useBrief = (leadId: string | undefined) =>
  useQuery({
    queryKey: K.brief(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("requirement_briefs").select(BRIEF_COLS).eq("lead_id", leadId!).maybeSingle();
      fail(error);
      return (data ?? null) as BriefRow | null;
    },
  });

export const useCreateBrief = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; createdBy: string; doc: BriefDocColumns }) => {
      const { data, error } = await supabase
        .from("requirement_briefs")
        .insert({ lead_id: v.leadId, created_by: v.createdBy, ...v.doc })
        .select(BRIEF_COLS)
        .single();
      fail(error);
      return data as BriefRow;
    },
    onSuccess: (b) => {
      qc.setQueryData(K.brief(b.lead_id), b);
      qc.invalidateQueries({ queryKey: K.briefs });
    },
  });
};

export const useSaveBrief = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; leadId: string; doc: BriefDocColumns }) => {
      const { error } = await supabase.from("requirement_briefs").update(v.doc).eq("id", v.id);
      fail(error);
      return v;
    },
    onSuccess: (v) => {
      qc.setQueryData<BriefRow | null>(K.brief(v.leadId), (old) => (old ? ({ ...old, ...v.doc } as BriefRow) : old));
    },
  });
};

const invalidateBrief = (qc: ReturnType<typeof useQueryClient>, leadId: string) => {
  qc.invalidateQueries({ queryKey: K.brief(leadId) });
  qc.invalidateQueries({ queryKey: K.briefs });
  qc.invalidateQueries({ queryKey: K.queue });
  qc.invalidateQueries({ queryKey: keys.lead(leadId) });
  qc.invalidateQueries({ queryKey: keys.leads });
};

export const useBriefTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      leadId: string;
      patch: T["requirement_briefs"]["Update"];
      notify: NotifyTarget[];
    }) => {
      const { error } = await supabase.from("requirement_briefs").update(v.patch).eq("id", v.id);
      fail(error);
      await notify(v.notify);
      return v;
    },
    onSettled: (_d, _e, v) => invalidateBrief(qc, v.leadId),
  });
};

export const useAssignBrief = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; leadId: string; designerId: string; notify: NotifyTarget[] }) => {
      const { error } = await supabase.rpc("ws_assign_brief", { _brief: v.id, _designer: v.designerId });
      fail(error);
      await notify(v.notify);
      return v;
    },
    onSettled: (_d, _e, v) => invalidateBrief(qc, v.leadId),
  });
};

export const useBriefQueue = (enabled = true) =>
  useQuery({
    queryKey: K.queue,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ws_brief_queue");
      fail(error);
      return (data ?? []) as QueueRow[];
    },
  });

export const useBriefList = () =>
  useQuery({
    queryKey: K.briefs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requirement_briefs")
        .select(BRIEF_LIST_COLS)
        .order("updated_at", { ascending: false });
      fail(error);
      return (data ?? []) as unknown as BriefListRow[];
    },
  });

/* ---------------- Notifications ---------------- */

export type NotificationRow = Pick<T["notifications"]["Row"], "id" | "kind" | "title" | "body" | "lead_id" | "project_id" | "read" | "created_at">;

export const useNotifications = (uid: string | undefined) =>
  useQuery({
    queryKey: K.notifications(uid ?? ""),
    enabled: !!uid,
    queryFn: async () => {
      const [list, unread] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, kind, title, body, lead_id, project_id, read, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("read", false),
      ]);
      fail(list.error);
      fail(unread.error);
      return { items: (list.data ?? []) as NotificationRow[], unread: unread.count ?? 0 };
    },
  });

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { uid: string; ids?: string[] }) => {
      let q = supabase.from("notifications").update({ read: true }).eq("user_id", v.uid).eq("read", false);
      if (v.ids) q = q.in("id", v.ids);
      const { error } = await q;
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: K.notifications(v.uid) }),
  });
};

export const briefKeys = K;
