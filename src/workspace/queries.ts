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

export const keys = {
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
