import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database, Json } from "@/integrations/supabase/types";
import type { ContractDocument } from "./contractModel";
import type { FfeSyncPlan } from "./proposalQueries";

export type ContractStatus = Database["public"]["Enums"]["contract_status"];
/** source is set by the database from proposal_id: "proposal" = GM-quoted price, "direct" = price typed by sales. */
export type ContractSource = "proposal" | "direct";
export interface ContractRow { id: string; lead_id: string; proposal_id: string | null; version: number; status: ContractStatus; source: ContractSource; created_at: string; updated_at: string; doc: ContractDocument }

const COLS = "id, lead_id, proposal_id, version, status, source, created_at, updated_at, doc";
const key = (leadId: string) => ["ws", "contracts", leadId] as const;
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export const useLeadContracts = (leadId: string | undefined) =>
  useQuery({
    queryKey: key(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select(COLS).eq("lead_id", leadId!).order("version", { ascending: false });
      fail(error);
      return (data ?? []) as unknown as ContractRow[];
    },
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    /** proposalId null = direct contract (no proposal, no GM quotation). */
    mutationFn: async (v: { leadId: string; proposalId: string | null; doc: ContractDocument; by: string; version: number }) => {
      const { data, error } = await supabase.from("contracts").insert({
        lead_id: v.leadId, proposal_id: v.proposalId, version: v.version, doc: v.doc as unknown as Json, created_by: v.by,
      }).select("id").single();
      fail(error);
      return data!.id as string;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: key(v.leadId) }),
  });
};

/** Agreement item changes → FF&E list → designer checks costs → GM re-quotes (ws_sync_ffe_from_contract). */
export const useSyncFfeFromContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { contractId: string; leadId: string; dry: boolean }): Promise<FfeSyncPlan> => {
      const { data, error } = await supabase.rpc("ws_sync_ffe_from_contract" as never, { _contract: v.contractId, _dry: v.dry } as never);
      fail(error);
      return data as unknown as FfeSyncPlan;
    },
    onSuccess: (plan) => {
      if (!plan.applied) return;
      qc.invalidateQueries({ queryKey: ["ws", "ffe"] });
      qc.invalidateQueries({ queryKey: ["ws", "costing"] });
      qc.invalidateQueries({ queryKey: ["ws", "notifications"] });
      qc.invalidateQueries({ queryKey: ["ws", "proposal-items"] });
    },
  });
};

export const useSaveContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string; leadId: string; doc?: ContractDocument; status?: ContractStatus; proposalId?: string;
      notify?: { user_id: string; title: string; body?: string }[];
    }) => {
      const patch: Database["public"]["Tables"]["contracts"]["Update"] = {};
      if (v.doc) patch.doc = v.doc as unknown as Json;
      if (v.status) patch.status = v.status;
      // Re-pointed to a newer accepted proposal (the database checks it is Accepted and this lead's).
      if (v.proposalId) patch.proposal_id = v.proposalId;
      const { error } = await supabase.from("contracts").update(patch).eq("id", v.id);
      fail(error);
      if (v.notify?.length) {
        const { error: nErr } = await supabase.from("notifications").insert(
          v.notify.map((n) => ({ ...n, kind: "contract", lead_id: v.leadId })),
        );
        fail(nErr);
      }
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: key(v.leadId) }),
  });
};

/** Signing is one database transaction: project, lead → Won, FF&E handed to the project, drawing tasks, notifications. */
export const useSignContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; leadId: string; handover: string; doc?: ContractDocument }) => {
      if (v.doc) { const { error } = await supabase.from("contracts").update({ doc: v.doc as unknown as Json }).eq("id", v.id); fail(error); }
      const { data, error } = await supabase.rpc("ws_sign_contract", { _contract: v.id, _handover: v.handover });
      fail(error);
      const { data: p } = await supabase.from("projects").select("code").eq("id", data as string).maybeSingle();
      return { projectId: data as string, code: p?.code ?? null };
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: key(v.leadId) });
      qc.invalidateQueries({ queryKey: ["ws"] });
    },
  });
};
