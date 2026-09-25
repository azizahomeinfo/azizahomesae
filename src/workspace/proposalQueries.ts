import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database, Json } from "@/integrations/supabase/types";
import type { FfeSection } from "./briefSchema";
import { cleanRoom } from "./ffeQueries";
import { normalizeDoc, type ItemGroup, type ProposalDocument, type SourceDesign } from "./proposalModel";

type T = Database["public"]["Tables"];
export type ProposalStatus = T["proposals"]["Row"]["status"];
export type { ProposalDocument } from "./proposalModel";

export interface ProposalRow {
  id: string; lead_id: string; version: number; status: ProposalStatus; design_id: string | null;
  total: number | null; accepted_option: AcceptedOption | null; sent_at: string | null; decided_at: string | null; created_at: string; updated_at: string;
  doc: ProposalDocument;
}
export interface AcceptedOption { index: number; label: string; desc: string; amount: number }
export interface ProposalListRow {
  id: string; lead_id: string; version: number; status: ProposalStatus; total: number | null; created_at: string;
  leads: { name: string; property: string | null; unit_type: string | null } | null;
}

const COLS = "id, lead_id, version, status, design_id, total, sent_at, decided_at, created_at, updated_at, line_items, accepted_option";

export const prKeys = {
  list: ["ws", "proposals"] as const,
  lead: (leadId: string) => ["ws", "proposals", leadId] as const,
  design: (leadId: string) => ["ws", "proposal-design", leadId] as const,
  items: (leadId: string) => ["ws", "proposal-items", leadId] as const,
};
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export const useProposalList = () =>
  useQuery({
    queryKey: prKeys.list,
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals")
        .select("id, lead_id, version, status, total, created_at, leads(name, property, unit_type)")
        .order("created_at", { ascending: false });
      fail(error);
      return (data ?? []) as unknown as ProposalListRow[];
    },
  });

/** Leads with a shared or accepted design — candidates for a proposal. */
export const useAcceptedLeads = () =>
  useQuery({
    queryKey: ["ws", "accepted-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("designs").select("lead_id, version, leads(name, property)").in("status", ["Submitted", "Accepted"]);
      fail(error);
      return (data ?? []) as unknown as { lead_id: string; version: number; leads: { name: string; property: string | null } | null }[];
    },
  });

export const useLeadProposals = (leadId: string | undefined) =>
  useQuery({
    queryKey: prKeys.lead(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals").select(COLS).eq("lead_id", leadId!).order("version", { ascending: false });
      fail(error);
      return (data ?? []).map(({ line_items, ...r }) => ({ ...r, doc: normalizeDoc(line_items) })) as ProposalRow[];
    },
  });

/** The latest design version the designer has shared (Submitted) or sales/GM accepted. */
export const useSharedDesign = (leadId: string | undefined) =>
  useQuery({
    queryKey: prKeys.design(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async (): Promise<SourceDesign | null> => {
      const { data, error } = await supabase.from("designs").select("id, version, status").eq("lead_id", leadId!)
        .in("status", ["Submitted", "Accepted"]).order("version", { ascending: false }).limit(1).maybeSingle();
      fail(error);
      if (!data) return null;
      const { data: imgs, error: iErr } = await supabase.from("design_images")
        .select("storage_path, caption, room, kind, file_name").eq("design_id", data.id).order("sort_order");
      fail(iErr);
      return { ...data, images: imgs ?? [] };
    },
  });

/** Client-facing item groups: room, item and qty only — never a cost or a supplier. Falls back to the brief checklist. */
export const useProposalItems = (leadId: string | undefined, briefFfe: unknown) =>
  useQuery({
    queryKey: [...prKeys.items(leadId ?? ""), !!briefFfe],
    enabled: !!leadId,
    queryFn: async (): Promise<ItemGroup[]> => {
      const { data, error } = await supabase.from("ffe_items").select("room, item, qty, sort_order").eq("lead_id", leadId!).order("sort_order");
      fail(error);
      if (data?.length) {
        const m = new Map<string, { item: string; qty: number }[]>();
        for (const i of data) if (i.item?.trim()) m.set(i.room, [...(m.get(i.room) ?? []), { item: i.item, qty: Number(i.qty) }]);
        return [...m.entries()].map(([room, items]) => ({ room, items }));
      }
      const ffe = (briefFfe as FfeSection[] | null) ?? [];
      return ffe.map((s) => ({
        room: cleanRoom(s.title),
        items: (s.items ?? []).filter((i) => i.included === "inc" && i.item?.trim()).map((i) => {
          const q = parseFloat(String(i.required || i.std).replace(/[^0-9.]/g, ""));
          return { item: i.item, qty: Number.isFinite(q) && q > 0 ? q : 1 };
        }),
      })).filter((g) => g.items.length);
    },
  });

const totalOf = (doc: ProposalDocument) => (doc.investment.options[0] ? Number(doc.investment.options[0].amount) : null);

/* ---------------- mutations ---------------- */

const invalidate = (qc: ReturnType<typeof useQueryClient>, leadId: string) => {
  qc.invalidateQueries({ queryKey: prKeys.lead(leadId) });
  qc.invalidateQueries({ queryKey: prKeys.list, exact: true });
};

export const useCreateProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; doc: ProposalDocument; by: string; nextVersion: number }) => {
      const { data, error } = await supabase.from("proposals").insert({
        lead_id: v.leadId, version: v.nextVersion, status: "Draft", design_id: v.doc.designId, created_by: v.by,
        line_items: v.doc as unknown as Json, total: totalOf(v.doc), terms: v.doc.investment.terms || null,
      }).select("id").single();
      fail(error);
      return data!.id as string;
    },
    onSettled: (_d, _e, v) => invalidate(qc, v.leadId),
  });
};

export const useSaveProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; leadId: string; doc: ProposalDocument }) => {
      const { error } = await supabase.from("proposals").update({
        line_items: v.doc as unknown as Json, design_id: v.doc.designId, total: totalOf(v.doc), terms: v.doc.investment.terms || null,
      }).eq("id", v.id);
      fail(error);
      return v;
    },
    onSuccess: (v) => {
      qc.setQueryData<ProposalRow[]>(prKeys.lead(v.leadId), (old) => old?.map((p) => (p.id === v.id ? { ...p, doc: v.doc } : p)));
      qc.invalidateQueries({ queryKey: prKeys.list, exact: true });
    },
  });
};

export const useProposalStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; leadId: string; status: ProposalStatus; acceptedOption?: AcceptedOption | null }) => {
      const now = new Date().toISOString();
      const patch: T["proposals"]["Update"] = { status: v.status };
      if (v.status === "Sent") patch.sent_at = now;
      if (v.status === "Accepted" || v.status === "Rejected") patch.decided_at = now;
      if (v.status === "Accepted") patch.accepted_option = (v.acceptedOption ?? null) as unknown as Json;
      const { error } = await supabase.from("proposals").update(patch).eq("id", v.id);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => invalidate(qc, v.leadId),
  });
};
