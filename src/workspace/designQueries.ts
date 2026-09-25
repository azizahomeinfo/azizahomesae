import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import type { Database } from "@/integrations/supabase/types";
import { keys, type NotifyTarget } from "./queries";
import { JPEG_QUALITY, MAX_EDGE, SIGNED_URL_TTL, kindForArea } from "./designSchema";

type T = Database["public"]["Tables"];
export type DesignRow = Pick<
  T["designs"]["Row"],
  "id" | "lead_id" | "version" | "designer_id" | "status" | "notes" | "feedback" | "reject_reason" | "submitted_at" | "decided_at" | "decided_by" | "created_at" | "updated_at"
>;
export type DesignImage = Pick<
  T["design_images"]["Row"],
  "id" | "design_id" | "storage_path" | "caption" | "room" | "sort_order" | "kind" | "file_name" | "width" | "height"
>;
export type BriefStatusValue = T["requirement_briefs"]["Row"]["status"];

const DESIGN_COLS = "id, lead_id, version, designer_id, status, notes, feedback, reject_reason, submitted_at, decided_at, decided_by, created_at, updated_at";
const IMAGE_COLS = "id, design_id, storage_path, caption, room, sort_order, kind, file_name, width, height";
const BUCKET = "workspace";

export const designKeys = {
  designs: (leadId: string) => ["ws", "designs", leadId] as const,
  images: (designId: string) => ["ws", "design-images", designId] as const,
  statuses: ["ws", "design-statuses"] as const,
  signed: (paths: string[]) => ["ws", "signed", ...paths] as const,
};

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Insert without .select(): rows addressed to others can't be read back by the author. */
const notify = async (targets: NotifyTarget[]) => {
  if (!targets.length) return;
  const { error } = await supabase.from("notifications").insert(targets);
  fail(error);
};

export const isPdf = (img: Pick<DesignImage, "storage_path">) => img.storage_path.toLowerCase().endsWith(".pdf");

/* ---------------- reads ---------------- */

export const useDesigns = (leadId: string | undefined) =>
  useQuery({
    queryKey: designKeys.designs(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("designs").select(DESIGN_COLS).eq("lead_id", leadId!).order("version", { ascending: false });
      fail(error);
      return (data ?? []) as DesignRow[];
    },
  });

export const useDesignImages = (designId: string | undefined) =>
  useQuery({
    queryKey: designKeys.images(designId ?? ""),
    enabled: !!designId,
    queryFn: async () => {
      const { data, error } = await supabase.from("design_images").select(IMAGE_COLS).eq("design_id", designId!).order("sort_order");
      fail(error);
      return (data ?? []) as DesignImage[];
    },
  });

/** Latest design status per lead the caller can see. */
export const useDesignStatuses = () =>
  useQuery({
    queryKey: designKeys.statuses,
    queryFn: async () => {
      const { data, error } = await supabase.from("designs").select("lead_id, version, status").order("version", { ascending: false });
      fail(error);
      const m = new Map<string, { version: number; status: DesignRow["status"] }>();
      for (const d of data ?? []) if (!m.has(d.lead_id)) m.set(d.lead_id, { version: d.version, status: d.status });
      return m;
    },
  });

/** Batch-signs private paths; cached below the URL expiry and re-signed when stale. */
export const useSignedUrls = (paths: string[]) => {
  const sorted = [...new Set(paths)].sort();
  return useQuery({
    queryKey: designKeys.signed(sorted),
    enabled: sorted.length > 0,
    staleTime: (SIGNED_URL_TTL - 600) * 1000,
    gcTime: (SIGNED_URL_TTL - 300) * 1000,
    refetchInterval: (SIGNED_URL_TTL - 600) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(sorted, SIGNED_URL_TTL);
      fail(error);
      const m = new Map<string, string>();
      for (const r of data ?? []) if (r.path && r.signedUrl) m.set(r.path, r.signedUrl);
      return m;
    },
  });
};

/* ---------------- upload helpers ---------------- */

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name}: this image format can't be read by the browser`)); };
    img.src = url;
  });

export const downscale = async (file: File) => {
  const img = await loadImage(file);
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) throw new Error(`${file.name}: image has no size`);
  const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
  const width = Math.round(w0 * scale), height = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.fillStyle = "#ffffff"; // JPEG has no alpha; flatten transparent PNGs onto white
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error(`${file.name}: could not compress image`);
  return { blob, width, height };
};

export type UploadStage = "compressing" | "uploading" | "saving";

/**
 * Shared upload to the private workspace bucket: images are downscaled to JPEG,
 * PDFs are stored as-is. Path is `<prefix>/<uuid>.<ext>` — never the raw filename.
 */
export const uploadToWorkspace = async (prefix: string, file: File, onStage?: (s: UploadStage) => void) => {
  const pdf = file.type === "application/pdf";
  if (!pdf && !file.type.startsWith("image/")) throw new Error(`${file.name}: only images and PDFs are accepted`);
  let body: Blob = file, width: number | null = null, height: number | null = null;
  if (!pdf) {
    onStage?.("compressing");
    const r = await downscale(file);
    body = r.blob; width = r.width; height = r.height;
  }
  const path = `${prefix}/${crypto.randomUUID()}.${pdf ? "pdf" : "jpg"}`;
  onStage?.("uploading");
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: pdf ? "application/pdf" : "image/jpeg",
    upsert: false,
  });
  fail(error);
  return { path, width, height };
};

/** Remove a storage object; storage returns an empty list (no error) when RLS blocks it. */
export const removeWorkspaceObject = async (path: string) => {
  const { data, error } = await supabase.storage.from(BUCKET).remove([path]);
  fail(error);
  if (!data?.length) throw new Error("You don't have permission to delete this file");
};

export const useUploadDesignFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; designId: string; area: string; file: File; sortOrder: number; onStage?: (s: UploadStage) => void }) => {
      const { path, width, height } = await uploadToWorkspace(`designs/${v.leadId}/${v.designId}`, v.file, v.onStage);
      v.onStage?.("saving");
      const { error } = await supabase.from("design_images").insert({
        design_id: v.designId, storage_path: path, room: v.area, kind: kindForArea(v.area),
        file_name: v.file.name.slice(0, 200), width, height, sort_order: v.sortOrder,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]); // best effort: don't leave an unreferenced upload
        throw new Error(error.message);
      }
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: designKeys.images(v.designId) }),
  });
};

/* ---------------- edits ---------------- */

export const useUpdateImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; designId: string; patch: T["design_images"]["Update"] }) => {
      const { error } = await supabase.from("design_images").update(v.patch).eq("id", v.id);
      fail(error);
      return v;
    },
    onSuccess: (v) =>
      qc.setQueryData<DesignImage[]>(designKeys.images(v.designId), (old) =>
        old?.map((i) => (i.id === v.id ? ({ ...i, ...v.patch } as DesignImage) : i)),
      ),
  });
};

export const useReorderImages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { designId: string; orderedIds: string[]; base: number }) => {
      const results = await Promise.all(
        v.orderedIds.map((id, i) => supabase.from("design_images").update({ sort_order: v.base + i }).eq("id", id)),
      );
      fail(results.find((r) => r.error)?.error ?? null);
    },
    onMutate: (v) =>
      qc.setQueryData<DesignImage[]>(designKeys.images(v.designId), (old) =>
        old
          ?.map((i) => {
            const idx = v.orderedIds.indexOf(i.id);
            return idx >= 0 ? { ...i, sort_order: v.base + idx } : i;
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      ),
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: designKeys.images(v.designId) }),
  });
};

export const useDeleteImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (img: DesignImage) => {
      // Another version may share the object (versions copy rows, not files).
      const { data: others, error: cErr } = await supabase
        .from("design_images").select("id").eq("storage_path", img.storage_path).neq("id", img.id).limit(1);
      fail(cErr);
      if (!others?.length) {
        const { data, error } = await supabase.storage.from(BUCKET).remove([img.storage_path]);
        if (error) throw new Error(`File could not be deleted, so the image was kept: ${error.message}`);
        // Storage returns an empty list (no error) when a policy silently blocked the delete.
        if (!data?.length) throw new Error("You don't have permission to delete this file (only the uploader or a GM can), so the image was kept.");
      }
      const { error } = await supabase.from("design_images").delete().eq("id", img.id);
      fail(error);
    },
    onSettled: (_d, _e, img) => qc.invalidateQueries({ queryKey: designKeys.images(img.design_id) }),
  });
};

export const useSaveDesignNotes = () =>
  useMutation({
    mutationFn: async (v: { id: string; notes: string }) => {
      const { error } = await supabase.from("designs").update({ notes: v.notes }).eq("id", v.id);
      fail(error);
    },
  });

/** Renames an area by rewriting `room` on every row in the group, so it stays one group. Matching another name merges them. */
export const useRenameArea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { designId: string; ids: string[]; to: string }) => {
      if (!v.ids.length) return v;
      const { error } = await supabase.from("design_images").update({ room: v.to, kind: kindForArea(v.to) }).in("id", v.ids);
      fail(error);
      return v;
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: designKeys.images(v.designId) }),
  });
};

const NOTIFY_WINDOW_MS = 10 * 60 * 1000;
const lastNotified = new Map<string, number>();

/**
 * After a designer changes a Submitted package: bump designs.updated_at (the touch trigger
 * sets it) so reviewers see it, and notify sales + GMs at most once per package per 10 minutes.
 * The debounce is per browser tab (memory + localStorage), not global.
 */
export const touchSubmittedDesign = async (v: { designId: string; leadId: string; notify: NotifyTarget[] }) => {
  const { error } = await supabase.from("designs").update({ updated_at: new Date().toISOString() }).eq("id", v.designId);
  fail(error);
  const key = `ws-design-notified:${v.designId}`;
  let last = lastNotified.get(v.designId) ?? 0;
  try { last = Math.max(last, Number(window.localStorage.getItem(key)) || 0); } catch { /* storage unavailable */ }
  if (Date.now() - last < NOTIFY_WINDOW_MS) return;
  lastNotified.set(v.designId, Date.now());
  try { window.localStorage.setItem(key, String(Date.now())); } catch { /* storage unavailable */ }
  await notify(v.notify);
};

/* ---------------- workflow ---------------- */

type BriefRef = { id: string; status: BriefStatusValue };

/** Walks the brief to In Design using only transitions the database guard allows. */
const briefToInDesign = async (b: BriefRef) => {
  if (b.status === "Assigned" || b.status === "Revision Requested" || b.status === "Design Approved") {
    const { error } = await supabase.from("requirement_briefs").update({ status: "In Design" }).eq("id", b.id);
    fail(error);
  }
};

const useInvalidateAll = () => {
  const qc = useQueryClient();
  return (leadId: string) => {
    qc.invalidateQueries({ queryKey: designKeys.designs(leadId) });
    qc.invalidateQueries({ queryKey: designKeys.statuses });
    qc.invalidateQueries({ queryKey: keys.brief(leadId) });
    qc.invalidateQueries({ queryKey: keys.briefs });
    qc.invalidateQueries({ queryKey: ["ws", "design-images"] });
  };
};

export const useStartDesign = () => {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: async (v: { leadId: string; designerId: string; brief: BriefRef; previous: DesignRow | null }) => {
      const version = (v.previous?.version ?? 0) + 1;
      const { data, error } = await supabase
        .from("designs").insert({ lead_id: v.leadId, version, designer_id: v.designerId, status: "Draft" }).select("id").single();
      fail(error);
      if (v.previous) {
        const { data: imgs, error: iErr } = await supabase.from("design_images").select(IMAGE_COLS).eq("design_id", v.previous.id);
        fail(iErr);
        if (imgs?.length) {
          const { error: cErr } = await supabase.from("design_images").insert(
            imgs.map((i) => ({
              design_id: data!.id, storage_path: i.storage_path, caption: i.caption, room: i.room,
              sort_order: i.sort_order, kind: i.kind, file_name: i.file_name, width: i.width, height: i.height,
            })),
          );
          fail(cErr);
        }
      }
      await briefToInDesign(v.brief);
      return v;
    },
    onSettled: (_d, _e, v) => inv(v.leadId),
  });
};

/**
 * One package: the design version goes to sales and the costed FF&E goes to the GM in a single
 * database transaction (ws_submit_design_package) — both or neither. The RPC names anything missing.
 */
export const useSubmitDesign = () => {
  const inv = useInvalidateAll();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; design: DesignRow; notify: NotifyTarget[] }) => {
      const { error } = await supabase.rpc("ws_submit_design_package", { _design: v.design.id });
      fail(error);
      await notify(v.notify);
      return v;
    },
    onSettled: (_d, _e, v) => { inv(v.leadId); qc.invalidateQueries({ queryKey: ["ws", "costing"] }); },
  });
};

export const useDecideDesign = () => {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: async (v: {
      leadId: string; designId: string; briefId: string; deciderId: string;
      accept: boolean; reason?: string; feedback?: string; notify: NotifyTarget[];
    }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("designs").update(
        v.accept
          ? { status: "Accepted", decided_at: now, decided_by: v.deciderId }
          : { status: "Rejected", decided_at: now, decided_by: v.deciderId, reject_reason: v.reason ?? null, feedback: v.feedback || null },
      ).eq("id", v.designId);
      fail(error);
      const { error: bErr } = await supabase.from("requirement_briefs").update(
        v.accept
          ? { status: "Design Approved", approved_at: now }
          : { status: "Revision Requested", revision_note: [v.reason, v.feedback].filter(Boolean).join(" — ") },
      ).eq("id", v.briefId);
      fail(bErr);
      await notify(v.notify);
      return v;
    },
    onSettled: (_d, _e, v) => inv(v.leadId),
  });
};
