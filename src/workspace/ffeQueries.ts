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
  | "id" | "project_id" | "ref" | "room" | "category" | "item" | "sku" | "dims" | "finish" | "spec" | "qty" | "unit"
  | "supplier_id" | "stage" | "po_ref" | "ordered_on" | "eta" | "delivered_on" | "installed_on" | "notes" | "sort_order"
> & { unit_cost?: number | null };
export type ProcStage = T["ffe_items"]["Row"]["stage"];
export type CostingStatus = T["ffe_costings"]["Row"]["status"];
export interface QuoteOption { label: string; desc: string; amount: number }
export type Costing = Pick<
  T["ffe_costings"]["Row"],
  "id" | "project_id" | "status" | "version" | "gm_notes" | "return_note" | "submitted_at" | "quoted_at"
> & { markup_pct?: number; options: QuoteOption[] };
export type Snag = Pick<
  T["snags"]["Row"],
  "id" | "project_id" | "ref" | "ref_seq" | "area" | "description" | "owner_id" | "status" | "photo_path" | "fixed_on" | "created_at"
>;

const SUPPLIER_COLS = "id, name, category, contact, phone, email, lead_time, payment_terms, rating, status, notes";
// Sales never receive cost price: the column is not even requested for them.
const FFE_BASE =
  "id, project_id, ref, room, category, item, sku, dims, finish, spec, qty, unit, supplier_id, stage, po_ref, ordered_on, eta, delivered_on, installed_on, notes, sort_order";
const ffeCols = (withCost: boolean) => (withCost ? `${FFE_BASE}, unit_cost` : FFE_BASE);
const COSTING_BASE = "id, project_id, status, version, gm_notes, return_note, submitted_at, quoted_at, options";
const costingCols = (withCost: boolean) => (withCost ? `${COSTING_BASE}, markup_pct` : COSTING_BASE);
const SNAG_COLS = "id, project_id, ref, ref_seq, area, description, owner_id, status, photo_path, fixed_on, created_at";

export const fKeys = {
  suppliers: ["ws", "suppliers"] as const,
  supplierOpen: ["ws", "supplier-open"] as const,
  ffe: (projectId: string) => ["ws", "ffe", projectId] as const,
  costing: (projectId: string) => ["ws", "costing", projectId] as const,
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
  Bedrooms: "BED",
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

export const useFfeItems = (projectId: string | undefined, withCost: boolean) =>
  useQuery({
    queryKey: [...fKeys.ffe(projectId ?? ""), withCost],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_items").select(ffeCols(withCost)).eq("project_id", projectId!).order("sort_order");
      fail(error);
      return (data ?? []) as unknown as FfeRow[];
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

const invalidateFfe = (qc: ReturnType<typeof useQueryClient>, projectId: string) => {
  qc.invalidateQueries({ queryKey: fKeys.ffe(projectId) });
  qc.invalidateQueries({ queryKey: fKeys.supplierOpen });
};

export const useSeedFfe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; ffe: FfeSection[] }) => {
      const rows: T["ffe_items"]["Insert"][] = [];
      const refs: string[] = [];
      for (const s of v.ffe ?? []) {
        const room = cleanRoom(s.title);
        for (const i of s.items ?? []) {
          if (i.included !== "inc") continue;
          const ref = nextRef(room, refs);
          refs.push(ref);
          rows.push({
            project_id: v.projectId, room, item: i.item, ref,
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
    onSettled: (_d, _e, v) => invalidateFfe(qc, v.projectId),
  });
};

export const useAddFfeItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; room: string; existing: FfeRow[] }) => {
      const { error } = await supabase.from("ffe_items").insert({
        project_id: v.projectId, room: v.room, item: "New item", category: categoryForRoom(v.room),
        ref: nextRef(v.room, v.existing.map((r) => r.ref)),
        sort_order: v.existing.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1,
      });
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => invalidateFfe(qc, v.projectId),
  });
};

export const useUpdateFfeItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; ids: string[]; values: T["ffe_items"]["Update"]; existing?: FfeRow[] }) => {
      if (!v.ids.length) return v;
      const values = { ...v.values };
      // Moving a single row to another room re-issues its ref under that room's prefix.
      if (values.room && v.ids.length === 1 && v.existing) values.ref = nextRef(values.room, v.existing.map((r) => r.ref));
      const { error } = await supabase.from("ffe_items").update(values).in("id", v.ids);
      fail(error);
      if (values.stage) await recomputeProcPct(v.projectId);
      return v;
    },
    onSettled: (_d, _e, v) => {
      invalidateFfe(qc, v.projectId);
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
    mutationFn: async (v: { projectId: string; id: string }) => {
      const { error } = await supabase.from("ffe_items").delete().eq("id", v.id);
      fail(error);
      await recomputeProcPct(v.projectId);
      return v;
    },
    onSettled: (_d, _e, v) => {
      invalidateFfe(qc, v.projectId);
      qc.invalidateQueries({ queryKey: ["ws", "project"] });
    },
  });
};

/* ---------------- costing ---------------- */

export const useCosting = (projectId: string | undefined, withCost: boolean) =>
  useQuery({
    queryKey: [...fKeys.costing(projectId ?? ""), withCost],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_costings").select(costingCols(withCost)).eq("project_id", projectId!).maybeSingle();
      fail(error);
      if (!data) return null;
      const d = data as unknown as Costing & { options: Json };
      return { ...d, options: Array.isArray(d.options) ? (d.options as unknown as QuoteOption[]) : [] } as Costing;
    },
  });

export const useCostingTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      projectId: string;
      exists: boolean;
      values: T["ffe_costings"]["Update"];
      notify?: T["notifications"]["Insert"][];
    }) => {
      const { error } = v.exists
        ? await supabase.from("ffe_costings").update(v.values).eq("project_id", v.projectId)
        : await supabase.from("ffe_costings").insert({ ...(v.values as T["ffe_costings"]["Insert"]), project_id: v.projectId });
      fail(error);
      await notify(v.notify ?? []);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: fKeys.costing(v.projectId) }),
  });
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
