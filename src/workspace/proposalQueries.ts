import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database, Json } from "@/integrations/supabase/types";
import type { FfeSection } from "./briefSchema";
import type { QuoteOption } from "./ffeQueries";
import { cleanRoom } from "./ffeQueries";

type T = Database["public"]["Tables"];
export type ProposalStatus = T["proposals"]["Row"]["status"];

export interface DocImage { path: string; caption: string | null }
export interface DocArea { area: string; title: string; desc: string; images: DocImage[] }
export interface ProposalDocument {
  designId: string | null;
  designVersion: number | null;
  cover: { client: string; property: string; unit: string; date: string; hero: string | null };
  areas: DocArea[];
  floorPlan: { path: string; name: string | null } | null;
  moodBoard: { path: string; name: string | null }[];
  itemList: { room: string; items: { item: string; qty: number }[] }[];
  itemSource: "project" | "brief";
  investment: { options: QuoteOption[]; vat: number; downpayment: number; terms: string };
  toggles: { floorPlan: boolean; moodBoard: boolean; itemList: boolean; investment: boolean; combine: boolean };
}
export interface ProposalRow {
  id: string; lead_id: string; version: number; status: ProposalStatus; design_id: string | null;
  total: number | null; sent_at: string | null; decided_at: string | null; created_at: string; updated_at: string;
  doc: ProposalDocument;
}
export interface ProposalListRow {
  id: string; lead_id: string; version: number; status: ProposalStatus; total: number | null; created_at: string;
  leads: { name: string; property: string | null; unit_type: string | null } | null;
}

const COLS = "id, lead_id, version, status, design_id, total, sent_at, decided_at, created_at, updated_at, line_items";

export const prKeys = {
  list: ["ws", "proposals"] as const,
  lead: (leadId: string) => ["ws", "proposals", leadId] as const,
  accepted: (leadId: string) => ["ws", "accepted-design", leadId] as const,
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

/** Leads with an accepted design — candidates for a proposal. */
export const useAcceptedLeads = () =>
  useQuery({
    queryKey: ["ws", "accepted-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("designs").select("lead_id, version, leads(name, property)").eq("status", "Accepted");
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
      return (data ?? []).map(({ line_items, ...r }) => ({ ...r, doc: line_items as unknown as ProposalDocument })) as ProposalRow[];
    },
  });

export interface AcceptedDesign {
  id: string; version: number;
  images: { storage_path: string; caption: string | null; room: string | null; kind: string; file_name: string | null; sort_order: number }[];
}

export const useAcceptedDesign = (leadId: string | undefined) =>
  useQuery({
    queryKey: prKeys.accepted(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async (): Promise<AcceptedDesign | null> => {
      const { data, error } = await supabase.from("designs").select("id, version").eq("lead_id", leadId!).eq("status", "Accepted")
        .order("version", { ascending: false }).limit(1).maybeSingle();
      fail(error);
      if (!data) return null;
      const { data: imgs, error: iErr } = await supabase.from("design_images")
        .select("storage_path, caption, room, kind, file_name, sort_order").eq("design_id", data.id).order("sort_order");
      fail(iErr);
      return { ...data, images: imgs ?? [] };
    },
  });

/* ---------------- document assembly ---------------- */

const isPdfPath = (p: string) => p.toLowerCase().endsWith(".pdf");
const isFloor = (i: AcceptedDesign["images"][number]) => i.kind === "Floor plan" || i.room === "Floor Plan";
const isMood = (i: AcceptedDesign["images"][number]) => i.kind === "Mood board" || i.room === "Mood Board";

export const defaultDesc = (style: string, area: string) =>
  `${style} ${area.toLowerCase()} designed around the client brief — furniture, lighting and finishes selected to match the renders shown.`;

/** Design-derived parts; existing titles/descriptions are kept for areas that still exist. */
export const fromDesign = (design: AcceptedDesign, style: string, previous?: DocArea[]) => {
  const renders = design.images.filter((i) => !isFloor(i) && !isMood(i) && !isPdfPath(i.storage_path));
  const order: string[] = [];
  const map = new Map<string, DocImage[]>();
  for (const i of renders) {
    const a = i.room ?? "Other";
    if (!map.has(a)) { map.set(a, []); order.push(a); }
    map.get(a)!.push({ path: i.storage_path, caption: i.caption });
  }
  const areas: DocArea[] = order.map((area) => {
    const prev = previous?.find((p) => p.area === area);
    return { area, title: prev?.title ?? area, desc: prev?.desc ?? defaultDesc(style, area), images: map.get(area)! };
  });
  const floor = design.images.find(isFloor);
  return {
    designId: design.id,
    designVersion: design.version,
    hero: renders[0]?.storage_path ?? null,
    areas,
    floorPlan: floor ? { path: floor.storage_path, name: floor.file_name } : null,
    moodBoard: design.images.filter(isMood).map((i) => ({ path: i.storage_path, name: i.file_name })),
  };
};

export const buildDocument = async (v: {
  lead: { id: string; name: string; property: string | null; building: string | null; unit_type: string | null; style: string | null; converted_project_id: string | null };
  brief: { style: unknown; ffe: unknown } | null;
  design: AcceptedDesign;
}): Promise<ProposalDocument> => {
  const briefStyle = (v.brief?.style as { primaryStyle?: string } | null)?.primaryStyle?.trim();
  const style = briefStyle || v.lead.style?.trim() || "Contemporary";
  const d = fromDesign(v.design, style);

  let itemList: ProposalDocument["itemList"] = [];
  let itemSource: ProposalDocument["itemSource"] = "brief";
  let options: QuoteOption[] = [];
  // FF&E belongs to the lead (the project inherits the same rows), so read it by lead.
  {
    // item + qty only — cost price is never read here.
    const { data: items, error } = await supabase.from("ffe_items").select("room, item, qty, sort_order").eq("lead_id", v.lead.id).order("sort_order");
    fail(error);
    if (items?.length) {
      itemSource = "project";
      const m = new Map<string, { item: string; qty: number }[]>();
      for (const i of items) m.set(i.room, [...(m.get(i.room) ?? []), { item: i.item, qty: Number(i.qty) }]);
      itemList = [...m.entries()].map(([room, list]) => ({ room, items: list }));
    }
    const { data: c, error: cErr } = await supabase.from("ffe_costings").select("status, options").eq("lead_id", v.lead.id).maybeSingle();
    fail(cErr);
    // Only a quotation the GM has set is client-facing.
    if (c?.status === "Quoted" && Array.isArray(c.options)) options = c!.options as unknown as QuoteOption[];
  }
  if (itemSource === "brief") {
    const ffe = (v.brief?.ffe as FfeSection[] | null) ?? [];
    itemList = ffe.map((s) => ({
      room: cleanRoom(s.title),
      items: (s.items ?? []).filter((i) => i.included === "inc").map((i) => {
        const q = parseFloat(String(i.required || i.std).replace(/[^0-9.]/g, ""));
        return { item: i.item, qty: Number.isFinite(q) && q > 0 ? q : 1 };
      }),
    })).filter((g) => g.items.length);
  }

  return {
    designId: d.designId,
    designVersion: d.designVersion,
    cover: {
      client: v.lead.name, property: v.lead.property ?? v.lead.building ?? "", unit: v.lead.unit_type ?? "",
      date: new Date().toISOString().slice(0, 10), hero: d.hero,
    },
    areas: d.areas,
    floorPlan: d.floorPlan,
    moodBoard: d.moodBoard,
    itemList,
    itemSource,
    investment: { options, vat: 5, downpayment: 50, terms: "" },
    toggles: { floorPlan: !!d.floorPlan, moodBoard: d.moodBoard.length > 0, itemList: itemList.length > 0, investment: true, combine: false },
  };
};

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
      const { error } = await supabase.from("proposals").insert({
        lead_id: v.leadId, version: v.nextVersion, status: "Draft", design_id: v.doc.designId, created_by: v.by,
        line_items: v.doc as unknown as Json, total: totalOf(v.doc), terms: v.doc.investment.terms || null,
      });
      fail(error);
      return v;
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
    mutationFn: async (v: { id: string; leadId: string; status: ProposalStatus }) => {
      const now = new Date().toISOString();
      const patch: T["proposals"]["Update"] = { status: v.status };
      if (v.status === "Sent") patch.sent_at = now;
      if (v.status === "Accepted" || v.status === "Rejected") patch.decided_at = now;
      const { error } = await supabase.from("proposals").update(patch).eq("id", v.id);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => invalidate(qc, v.leadId),
  });
};
