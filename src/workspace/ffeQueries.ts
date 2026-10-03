import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database, Json } from "@/integrations/supabase/types";
import { pKeys } from "./projectQueries";
import { removeWorkspaceObject, uploadToWorkspace } from "./designQueries";

type T = Database["public"]["Tables"];
export type Supplier = Pick<
  T["suppliers"]["Row"],
  "id" | "name" | "category" | "contact" | "phone" | "email" | "lead_time" | "payment_terms" | "rating" | "status" | "notes"
>;
export type FfeRow = Pick<
  T["ffe_items"]["Row"],
  | "id" | "project_id" | "lead_id" | "ref" | "room" | "category" | "item" | "dims" | "spec" | "qty" | "unit"
  | "supplier_id" | "supplier_name" | "supplier_contact" | "product_url" | "stage" | "po_ref" | "ordered_on" | "eta" | "delivered_on" | "installed_on" | "notes" | "sort_order" | "priority_band"
  | "review" | "review_note" | "review_by" | "review_at" | "review_prev" | "internal"
> & { unit_cost?: number | null; from_price_book?: boolean };
export type ProcStage = T["ffe_items"]["Row"]["stage"];
export type CostingStatus = T["ffe_costings"]["Row"]["status"];
export interface QuoteOption { label: string; desc: string; amount: number }
export type Costing = Pick<
  T["ffe_costings"]["Row"],
  "id" | "project_id" | "lead_id" | "status" | "version" | "submitted_at" | "quoted_at" | "quoted_by" | "purpose"
> & { markup_pct?: number; gm_notes?: string | null; return_note?: string | null; options: QuoteOption[] };
export type Snag = Pick<
  T["snags"]["Row"],
  "id" | "project_id" | "ref" | "ref_seq" | "area" | "description" | "owner_id" | "status" | "photo_path" | "fixed_on" | "created_at"
>;

const SUPPLIER_COLS = "id, name, category, contact, phone, email, lead_time, payment_terms, rating, status, notes";
// Sales never receive cost price: the column is not even requested for them.
const FFE_BASE =
  "id, project_id, lead_id, ref, room, category, item, dims, spec, qty, unit, supplier_id, supplier_name, supplier_contact, product_url, stage, po_ref, ordered_on, eta, delivered_on, installed_on, notes, sort_order, priority_band, review, review_note, review_by, review_at, review_prev, internal";
// options (the quoted client price) is not directly selectable; ws_costing_options withholds it from coordinators.
const COSTING_BASE = "id, project_id, lead_id, status, version, submitted_at, quoted_at, quoted_by, purpose";
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

/* ---------------- purchasing priority ---------------- */

/** Buying runs for the coordinator; index + 1 is the band number defined by ws_ffe_band. A work queue, not a taxonomy. */
export const PRIORITY_BANDS = ["Cabinetry", "Furniture", "Online furniture", "Appliances", "Dragon Mart pick-up", "Household"] as const;
/** 1–6. Derived in the database on write (ws_ffe_band; supplier decides online vs pick-up; hand overrides stick); 6 (the unsorted end) only covers a row not yet saved. */
export const bandOf = (r: Pick<FfeRow, "priority_band">): number => r.priority_band ?? PRIORITY_BANDS.length;

/* ---------------- online retailers (GM-maintained; feeds ws_ffe_online_supplier) ---------------- */

export const useOnlineRetailers = (enabled = true) =>
  useQuery({
    queryKey: ["ws", "online-retailers"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("ffe_online_retailers").select("name").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.name);
    },
  });

const useRetailerSettled = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["ws", "online-retailers"] });
    qc.invalidateQueries({ queryKey: ["ws", "ffe"] });
  };
};

export const useAddOnlineRetailer = () => {
  const settled = useRetailerSettled();
  return useMutation({
    mutationFn: async (v: { name: string; existing: string[]; by: string | null }) => {
      const name = v.name.trim().replace(/\s+/g, " ");
      if (!name) throw new Error("Enter a retailer name");
      if (name.length > 120) throw new Error("Name is too long");
      if (v.existing.some((n) => n.toLowerCase() === name.toLowerCase())) throw new Error(`${name} is already on the list`);
      const { error } = await supabase.from("ffe_online_retailers").insert({ name, added_by: v.by });
      if (error) throw new Error(error.message);
      return name;
    },
    onSettled: settled,
  });
};

export const useRemoveOnlineRetailer = () => {
  const settled = useRetailerSettled();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("ffe_online_retailers").delete().eq("name", name).select("name");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("You don't have permission to remove retailers");
    },
    onSettled: settled,
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
      const { data: costs, error: cErr } = await supabase.from("ffe_item_costs").select("item_id, unit_cost, from_price_book").in("item_id", rows.map((r) => r.id));
      fail(cErr);
      const m = new Map((costs ?? []).map((c) => [c.item_id, c]));
      return rows.map((r) => ({ ...r, unit_cost: m.get(r.id)?.unit_cost ?? null, from_price_book: !!m.get(r.id)?.from_price_book }));
    },
  });

// projects.proc_pct is derived in the database (trigger ffe_items_proc_pct); the app never writes it.


// Lead and project views can show the same rows, so refresh all FF&E lists.
const invalidateFfe = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["ws", "ffe"] });
  qc.invalidateQueries({ queryKey: fKeys.supplierOpen });
};

/** Builds the list from the brief in the database (ws_seed_ffe), which splits cross-band bundles and derives bands. */
export const useSeedFfe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; leadId: string | null; projectId: string | null }) => {
      const { data, error } = await supabase.rpc("ws_seed_ffe", { _lead: v.leadId as string, _project: v.projectId ?? undefined });
      fail(error);
      return data as number;
    },
    onSettled: () => invalidateFfe(qc),
  });
};

/** GM only (enforced by ws_price_book_fill_from_lead): this lead's costed list becomes the standard price book. */
export const useSetStandardPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("ws_price_book_fill_from_lead", { _lead: leadId });
      fail(error);
      return (data as number) ?? 0;
    },
    onSettled: () => invalidateFfe(qc),
  });
};

/** GM or designer: fills standard prices into rows with no cost; never overwrites a cost. */
export const useApplyStandardPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; projectId: string | null }) => {
      const { data, error } = await supabase.rpc("ws_price_book_apply", { _lead: v.leadId, _project: v.projectId ?? undefined });
      fail(error);
      return (data as number) ?? 0;
    },
    onSettled: () => invalidateFfe(qc),
  });
};

export const useAddFfeItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { owner: FfeOwner; room: string; existing: FfeRow[] }) => {
      const { data, error } = await supabase.from("ffe_items").insert({
        [v.owner.col]: v.owner.id, room: v.room, item: "New item", category: categoryForRoom(v.room),
        ref: nextRef(v.room, v.existing.map((r) => r.ref)),
        sort_order: v.existing.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1,
      }).select("id").single();
      fail(error);
      return data!.id as string;
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
      // Moving a row to another section changes ONLY its room, never its ref — same decision as
      // renames (FfeTab.tsx): a ref is an identifier, not a location, and may already be on a PO
      // or in a supplier email. nextRef issues refs at creation only; updates never re-issue one.
      const { error } = await supabase.from("ffe_items").update(values).in("id", v.ids);
      fail(error);
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
    mutationFn: async (v: { owner: FfeOwner; id?: string; ids?: string[] }) => {
      const ids = v.ids ?? (v.id ? [v.id] : []);
      if (!ids.length) return v;
      const { error } = await supabase.from("ffe_items").delete().in("id", ids);
      fail(error);
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
      const { data: opts, error: oErr } = await supabase.rpc("ws_costing_options", { _costing: data.id });
      fail(oErr);
      const d = data as unknown as Costing;
      const out = { ...d, options: Array.isArray(opts) ? (opts as unknown as QuoteOption[]) : [] } as Costing;
      if (!withCost) return out;
      const { data: p, error: pErr } = await supabase.from("ffe_costing_private")
        .select("markup_pct, gm_notes, return_note").eq("costing_id", d.id).maybeSingle();
      fail(pErr);
      return { ...out, markup_pct: p?.markup_pct ?? undefined, gm_notes: p?.gm_notes ?? null, return_note: p?.return_note ?? null };
    },
  });

export type CostingValues = Pick<T["ffe_costings"]["Update"], "status" | "options" | "version" | "submitted_at" | "quoted_at" | "quoted_by"> &
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

/* ---------------- budget approval (route 2: contract signed outside the system) ---------------- */

/** An item the coordinator can't buy yet: no supplier. A purchase link is optional, and the unit cost may be filled in when it's bought — neither blocks. */
export const missingBuyability = (r: Pick<FfeRow, "supplier_id" | "supplier_name">) =>
  !r.supplier_id && !r.supplier_name?.trim();

/** True when the project has no contract signed in the system, so its FF&E list needs a GM budget approval. */
export const useNeedsBudget = (projectId: string | null | undefined) =>
  useQuery({
    queryKey: ["ws", "needs-budget", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ws_needs_budget", { _project: projectId! });
      fail(error);
      return !!data;
    },
  });

export const useSubmitBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc("ws_submit_budget", { _project: projectId });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ws", "costing"] }),
  });
};

export const useDecideBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; approve: boolean; note: string }) => {
      const { error } = await supabase.rpc("ws_decide_budget", { _project: v.projectId, _approve: v.approve, _note: v.note });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ws", "costing"] }),
  });
};

/** Designer (or GM) confirms the converted FF&E list; releases procurement once any budget approval is in. */
export const useConfirmFfe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc("ws_confirm_ffe_list", { _project: projectId });
      fail(error);
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["ws", "project"] }); qc.invalidateQueries({ queryKey: pKeys.projects }); },
  });
};

/** GM only: send a confirmed list back to the designer to re-check. */
export const useReturnFfe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { projectId: string; note: string }) => {
      const { error } = await supabase.rpc("ws_return_ffe_list", { _project: v.projectId, _note: v.note });
      fail(error);
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["ws", "project"] }); qc.invalidateQueries({ queryKey: pKeys.projects }); },
  });
};

/* ---------------- out of stock / GM review (state moves only through these RPCs) ---------------- */

export const BUILDING_MATERIAL = "Building Material";
export const isInternal = (r: Pick<FfeRow, "internal">) => !!r.internal;
export const REVIEW_LABEL = { "Out of stock": "Out of stock — designer re-choosing", "Awaiting GM approval": "Waiting for GM approval" } as const;
export interface ReviewPrev { item?: string; supplier_name?: string | null; product_url?: string | null; qty?: number; unit_cost?: number | null; line_total?: number | null }

const invalidateReview = (qc: ReturnType<typeof useQueryClient>) => {
  invalidateFfe(qc);
  qc.invalidateQueries({ queryKey: ["ws", "project"] });
  qc.invalidateQueries({ queryKey: pKeys.projects });
};

export const useFfeOutOfStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { ids: string[]; note: string }) => {
      const { data, error } = await supabase.rpc("ws_ffe_out_of_stock", { _items: v.ids, _note: v.note });
      fail(error);
      return (data as number) ?? v.ids.length;
    },
    onSettled: () => invalidateReview(qc),
  });
};

export const useFfeReselected = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("ws_ffe_reselected", { _item: id });
      fail(error);
      return (data as string) ?? "Handed back";
    },
    onSettled: () => invalidateReview(qc),
  });
};

export const useFfeDecideChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; approve: boolean; note: string }) => {
      const { error } = await supabase.rpc("ws_ffe_decide_change", { _item: v.id, _approve: v.approve, _note: v.note });
      fail(error);
    },
    onSettled: () => invalidateReview(qc),
  });
};
