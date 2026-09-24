import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database, Json } from "@/integrations/supabase/types";
import { pKeys } from "./projectQueries";
import { removeWorkspaceObject, uploadToWorkspace } from "./designQueries";
import type { FfeSection } from "./briefSchema";

type T = Database["public"]["Tables"];
export type Supplier = Pick<
  T["suppliers"]["Row"],
  "id" | "name" | "category" | "contact" | "phone" | "email" | "lead_time" | "payment_terms" | "rating" | "status" | "notes"
>;
export type FfeRow = Pick<
  T["ffe_items"]["Row"],
  | "id" | "project_id" | "lead_id" | "ref" | "room" | "category" | "item" | "sku" | "dims" | "finish" | "spec" | "qty" | "unit"
  | "supplier_id" | "stage" | "po_ref" | "ordered_on" | "eta" | "delivered_on" | "installed_on" | "notes" | "sort_order"
> & { unit_cost?: number | null };
export type ProcStage = T["ffe_items"]["Row"]["stage"];
export type CostingStatus = T["ffe_costings"]["Row"]["status"];
export interface QuoteOption { label: string; desc: string; amount: number }
export type Costing = Pick<
  T["ffe_costings"]["Row"],
  "id" | "project_id" | "lead_id" | "status" | "version" | "submitted_at" | "quoted_at"
> & { markup_pct?: number; gm_notes?: string | null; return_note?: string | null; options: QuoteOption[] };
...
const COSTING_BASE = "id, project_id, lead_id, status, version, submitted_at, quoted_at, options";
const SNAG_COLS = "id, project_id, ref, ref_seq, area, description, owner_id, status, photo_path, fixed_on, created_at";

/**
 * FF&E belongs to a lead (designer specs it beside the renders) and is inherited by the
 * project on conversion (same rows, project_id stamped). Screens address it by either owner.
 */
export interface FfeOwner { col: "lead_id" | "project_id"; id: string }
export const leadOwner = (id: string): FfeOwner => ({ col: "lead_id", id });
export const projectOwner = (id: string): FfeOwner => ({ col: "project_id", id });
const ownerKey = (o: FfeOwner | undefined) => (o ? `${o.col}:${o.id}` : "");

export const fKeys = {
  suppliers: ["ws", "suppliers"] as const,
  supplierOpen: ["ws", "supplier-open"] as const,
  ffe: (owner: string) => ["ws", "ffe", owner] as const,
  costing: (owner: string) => ["ws", "costing", owner] as const,
  snags: (projectId: string) => ["ws", "snags", projectId] as const,
};

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};
const notify = async (targets: T["notifications"]["Insert"][]) => {
  if (!targets.length) return;
  const { error } = await supabase.from("notifications").insert(targets);
  fail(error);
};

/* ---------------- helpers ---------------- */

const PREFIX: Record<string, string> = {
  Entrance: "ENT", "Living Room": "LIV", "Living Area": "LIV", "Living / Dining": "LIV", Dining: "DIN",
  Kitchen: "KIT", "Kitchen & Tabletop": "KIT", "Master Bedroom": "MBR", "Bedroom 2": "BR2", "Bedroom 3": "BR3",
  "Bedroom 4": "BR4", "Maid's Room": "MAD", Bathroom: "BTH", Bathrooms: "BTH", Balcony: "BAL", Appliances: "APP",
  Bedrooms: "BED", "Living & Dining": "LIV", "Kitchenware & Tabletop": "KIT", "Sleeping Area": "SLP",
  "Guest Bedroom": "GBR", "Guest Bedroom 1": "GB1", "Guest Bedroom 2": "GB2", "Guest Bedroom 3": "GB3",
  "Safety, Access & Compliance": "SAF",
};
export const roomPrefix = (room: string) =>
  PREFIX[room.trim()] ?? (room.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "ITM");

/** Next `<PREFIX>-<n>` for a room given the refs already on the project. */
const nextRef = (room: string, taken: (string | null)[]) => {
  const p = roomPrefix(room);
  let max = 0;
  for (const r of taken) {
    const m = r?.match(new RegExp(`^${p}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${p}-${max + 1}`;
};

export const cleanRoom = (title: string) => title.replace(/^\s*\d+(\.\d+)*\s+/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
export const categoryForRoom = (room: string) =>
  /appliance/i.test(room) ? "Appliance" : /kitchen|tabletop/i.test(room) ? "Accessories" : "Furniture";
const qtyOf = (s: string | undefined) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const DONE_STAGES: ProcStage[] = ["Delivered", "Installed", "Closed"];

/* ---------------- suppliers ---------------- */

export const useSuppliers = () =>
  useQuery({
    queryKey: fKeys.suppliers,
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select(SUPPLIER_COLS).order("name");
      fail(error);
      return (data ?? []) as Supplier[];
    },
  });

export const useSupplierOpenCounts = () =>
  useQuery({
    queryKey: fKeys.supplierOpen,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_items").select("supplier_id").not("supplier_id", "is", null).neq("stage", "Closed");
      fail(error);
      const m = new Map<string, number>();
      for (const r of data ?? []) if (r.supplier_id) m.set(r.supplier_id, (m.get(r.supplier_id) ?? 0) + 1);
      return m;
    },
  });

export const useSaveSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id?: string; values: T["suppliers"]["Insert"] }) => {
      if (v.id) {
        const { error } = await supabase.from("suppliers").update(v.values).eq("id", v.id);
        fail(error);
        return v.id;
      }
      const id = crypto.randomUUID();
      const { error } = await supabase.from("suppliers").insert({ ...v.values, id });
      fail(error);
      return id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fKeys.suppliers }),
  });
};

/* ---------------- ffe items ---------------- */

export const useFfeItems = (owner: FfeOwner | undefined, withCost: boolean) =>
  useQuery({
    queryKey: [...fKeys.ffe(ownerKey(owner)), withCost],
    enabled: !!owner?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_items").select(FFE_BASE).eq(owner!.col, owner!.id).order("sort_order");
      fail(error);
      const rows = (data ?? []) as unknown as FfeRow[];
      // Cost price lives in ffe_item_costs, which RLS hides from sales entirely.
      if (!withCost || !rows.length) return rows;
      const { data: costs, error: cErr } = await supabase.from("ffe_item_costs").select("item_id, unit_cost").in("item_id", rows.map((r) => r.id));
      fail(cErr);
      const m = new Map((costs ?? []).map((c) => [c.item_id, c.unit_cost]));
      return rows.map((r) => ({ ...r, unit_cost: m.get(r.id) ?? null }));
    },
  });

const recomputeProcPct = async (projectId: string) => {
  const { data, error } = await supabase.from("ffe_items").select("stage").eq("project_id", projectId);
  fail(error);
  const rows = data ?? [];
  const pct = rows.length ? Math.round((rows.filter((r) => DONE_STAGES.includes(r.stage)).length / rows.length) * 100) : 0;
  const { error: uErr } = await supabase.from("projects").update({ proc_pct: pct }).eq("id", projectId);
  fail(uErr);
};

const recomputeIfProject = async (o: FfeOwner) => { if (o.col === "project_id") await recomputeProcPct(o.id); };

// Lead and project views can show the same rows, so refresh all FF&E lists.
const invalidateFfe = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["ws", "ffe"] });
  qc.invalidateQueries({ queryKey: fKeys.supplierOpen });
};

export const useSeedFfe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; ffe: FfeSection[] }) => {
      const rows: T["ffe_items"]["Insert"][] = [];
      const refs: string[] = [];
      for (const s of v.ffe ?? []) {
        const room = cleanRoom(s.title);
        for (const i of s.items ?? []) {
          if (i.included !== "inc" || !i.item?.trim()) continue;
          const ref = nextRef(room, refs);
          refs.push(ref);
          rows.push({
            [v.owner.col]: v.owner.id, room, item: i.item.trim(), ref,
            qty: qtyOf(i.required) ?? qtyOf(i.std) ?? 1,
            finish: i.notes?.trim() || null, category: categoryForRoom(room), sort_order: rows.length,
          });
        }
      }
      if (!rows.length) throw new Error("The brief has no included FF&E items");
      const { error } = await supabase.from("ffe_items").insert(rows);
      fail(error);
      return rows.length;
    },
    onSettled: () => invalidateFfe(qc),
  });
};

export const useAddFfeItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; room: string; existing: FfeRow[] }) => {
      const { error } = await supabase.from("ffe_items").insert({
        [v.owner.col]: v.owner.id, room: v.room, item: "New item", category: categoryForRoom(v.room),
        ref: nextRef(v.room, v.existing.map((r) => r.ref)),
        sort_order: v.existing.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1,
      });
      fail(error);
      return v;
    },
    onSettled: () => invalidateFfe(qc),
  });
};

export const useUpdateFfeItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; ids: string[]; values: Omit<T["ffe_items"]["Update"], "unit_cost"> & { unit_cost?: number | null }; existing?: FfeRow[] }) => {
      if (!v.ids.length) return v;
      const { unit_cost, ...values } = v.values;
      if (unit_cost !== undefined) {
        const { error } = await supabase.from("ffe_item_costs").upsert(v.ids.map((item_id) => ({ item_id, unit_cost })));
        fail(error);
        if (!Object.keys(values).length) return v;
      }
      // Moving a single row to another room re-issues its ref under that room's prefix.
      if (values.room && v.ids.length === 1 && v.existing) values.ref = nextRef(values.room, v.existing.map((r) => r.ref));
      const { error } = await supabase.from("ffe_items").update(values).in("id", v.ids);
      fail(error);
      if (values.stage) await recomputeIfProject(v.owner);
      return v;
    },
    onSettled: (_d, _e, v) => {
      invalidateFfe(qc);
      if (v.values.stage) {
        qc.invalidateQueries({ queryKey: ["ws", "project"] });
        qc.invalidateQueries({ queryKey: pKeys.projects });
      }
    },
  });
};

export const useDeleteFfeItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; id: string }) => {
      const { error } = await supabase.from("ffe_items").delete().eq("id", v.id);
      fail(error);
      await recomputeIfProject(v.owner);
      return v;
    },
    onSettled: () => {
      invalidateFfe(qc);
      qc.invalidateQueries({ queryKey: ["ws", "project"] });
    },
  });
};

/* ---------------- costing ---------------- */

/**
 * Markup and GM/return notes live in ffe_costing_private, which RLS hides from sales:
 * markup beside the client-facing option amount would reveal the cost price.
 */
export const useCosting = (owner: FfeOwner | undefined, withCost: boolean) =>
  useQuery({
    queryKey: [...fKeys.costing(ownerKey(owner)), withCost],
    enabled: !!owner?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_costings").select(COSTING_BASE).eq(owner!.col, owner!.id).maybeSingle();
      fail(error);
      if (!data) return null;
      const d = data as unknown as Costing & { options: Json };
      const out = { ...d, options: Array.isArray(d.options) ? (d.options as unknown as QuoteOption[]) : [] } as Costing;
      if (!withCost) return out;
      const { data: p, error: pErr } = await supabase.from("ffe_costing_private")
        .select("markup_pct, gm_notes, return_note").eq("costing_id", d.id).maybeSingle();
      fail(pErr);
      return { ...out, markup_pct: p?.markup_pct ?? undefined, gm_notes: p?.gm_notes ?? null, return_note: p?.return_note ?? null };
    },
  });

export type CostingValues = Pick<T["ffe_costings"]["Update"], "status" | "options" | "version" | "submitted_at" | "quoted_at"> &
  Pick<T["ffe_costing_private"]["Update"], "markup_pct" | "gm_notes" | "return_note">;

export const useCostingTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      owner: FfeOwner;
      costingId?: string;
      values: CostingValues;
      notify?: T["notifications"]["Insert"][];
    }) => {
      const { markup_pct, gm_notes, return_note, ...pub } = v.values;
      const priv = Object.fromEntries(
        Object.entries({ markup_pct, gm_notes, return_note }).filter(([, x]) => x !== undefined),
      ) as T["ffe_costing_private"]["Update"];
      let id = v.costingId;
      if (id) {
        const { error } = await supabase.from("ffe_costings").update(pub).eq("id", id);
        fail(error);
      } else {
        id = crypto.randomUUID();
        const { error } = await supabase.from("ffe_costings").insert({ ...pub, id, [v.owner.col]: v.owner.id });
        fail(error);
      }
      // Every costing gets its private row; sales never reach this path (no costing controls).
      if (!v.costingId || Object.keys(priv).length) {
        const { error } = await supabase.from("ffe_costing_private").upsert({ ...priv, costing_id: id });
        fail(error);
      }
      await notify(v.notify ?? []);
      return v;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ws", "costing"] }),
  });
};

/** On conversion the project inherits the lead's FF&E: the same rows get project_id stamped, nothing is copied. */
export const inheritLeadFfe = async (leadId: string, projectId: string) => {
  const { error } = await supabase.from("ffe_items").update({ project_id: projectId }).eq("lead_id", leadId).is("project_id", null);
  fail(error);
  const { error: cErr } = await supabase.from("ffe_costings").update({ project_id: projectId }).eq("lead_id", leadId).is("project_id", null);
  fail(cErr);
};

/* ---------------- snags ---------------- */

export const useSnags = (projectId: string | undefined) =>
  useQuery({
    queryKey: fKeys.snags(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("snags").select(SNAG_COLS).eq("project_id", projectId!)
        .order("ref_seq", { ascending: true, nullsFirst: false }).order("created_at");
      fail(error);
      return (data ?? []) as Snag[];
    },
  });

export const useAddSnag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; area: string; description: string; ownerId: string | null; photo: File | null }) => {
      const { data: top, error: qErr } = await supabase.from("snags").select("ref_seq").eq("project_id", v.projectId)
        .not("ref_seq", "is", null).order("ref_seq", { ascending: false }).limit(1);
      fail(qErr);
      const seq = (top?.[0]?.ref_seq ?? 0) + 1;
      let photo_path: string | null = null;
      if (v.photo) photo_path = (await uploadToWorkspace(`snags/${v.projectId}`, v.photo)).path;
      const { error } = await supabase.from("snags").insert({
        project_id: v.projectId, area: v.area, description: v.description, owner_id: v.ownerId,
        ref_seq: seq, ref: `S-${String(seq).padStart(2, "0")}`, photo_path,
      });
      if (error) {
        if (photo_path) await removeWorkspaceObject(photo_path).catch(() => undefined);
        throw new Error(error.message);
      }
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: fKeys.snags(v.projectId) }),
  });
};

export const useUpdateSnag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; id: string; values: T["snags"]["Update"] }) => {
      const { error } = await supabase.from("snags").update(v.values).eq("id", v.id);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: fKeys.snags(v.projectId) }),
  });
};
