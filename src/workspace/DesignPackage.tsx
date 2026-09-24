import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";
import { useBrief, useLead, useMembers, type NotifyTarget } from "./queries";
import {
  isPdf, useDecideDesign, useDeleteImage, useDesignImages, useDesigns, useReorderImages, useSaveDesignNotes,
  touchSubmittedDesign, useRenameArea, useSignedUrls, useStartDesign, useSubmitDesign, useUpdateImage, useUploadDesignFile,
  type DesignImage, type DesignRow, type UploadStage,
} from "./designQueries";
import { DESIGN_AREAS, REJECT_REASONS, type DesignStatus } from "./designSchema";
import DesignStatusPill from "./DesignStatusPill";

interface Props {
  leadId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Read-only: no uploads, review or version actions. */
  viewOnly?: boolean;
}

const areaOf = (i: DesignImage) => i.room || "Other";
const STD_RANK = new Map((DESIGN_AREAS as readonly string[]).map((a, i) => [a.toLowerCase(), i]));
const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/* ---------------- debounced autosave ---------------- */

function useAutosave(value: string, initial: string, enabled: boolean, save: (v: string) => Promise<void>) {
  const last = useRef(initial);
  useEffect(() => { last.current = initial; }, [initial]);
  useEffect(() => {
    if (!enabled || value === last.current) return;
    const t = setTimeout(() => {
      save(value).then(() => { last.current = value; }).catch((e) => toast.error(errMsg(e, "Could not save")));
    }, 800);
    return () => clearTimeout(t);
  }, [value, enabled, save]);
}

/* ---------------- thumbnail ---------------- */

const Thumb = ({
  img, url, editable, onOpen, onMove, canLeft, canRight, onDragStartId, onDropOn, onChanged,
}: {
  img: DesignImage; url?: string; editable: boolean; onOpen: () => void; onChanged: () => void;
  onMove: (dir: -1 | 1) => void; canLeft: boolean; canRight: boolean;
  onDragStartId: (id: string) => void; onDropOn: (id: string) => void;
}) => {
  const update = useUpdateImage();
  const del = useDeleteImage();
  const [caption, setCaption] = useState(img.caption ?? "");
  const saveCaption = useCallback(
    async (v: string) => { await update.mutateAsync({ id: img.id, designId: img.design_id, patch: { caption: v || null } }); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [img.id, img.design_id],
  );
  useAutosave(caption, img.caption ?? "", editable, saveCaption);
  const pdf = isPdf(img);

  const remove = async () => {
    try {
      await del.mutateAsync(img);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not remove the file"));
    }
  };

  return (
    <div
      className="rounded-[var(--radius)] border border-border bg-card overflow-hidden flex flex-col"
      draggable={editable}
      onDragStart={(e) => { e.dataTransfer.setData("application/x-ws-image", img.id); onDragStartId(img.id); }}
      onDragOver={(e) => { if (editable && e.dataTransfer.types.includes("application/x-ws-image")) e.preventDefault(); }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("application/x-ws-image")) return;
        e.preventDefault(); e.stopPropagation(); onDropOn(img.id);
      }}
    >
      {pdf ? (
        <a
          href={url} target="_blank" rel="noreferrer"
          className="aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-muted p-3 text-center text-sm hover:text-primary"
        >
          <FileText className="h-8 w-8" />
          <span className="break-all line-clamp-2">{img.file_name || "PDF"}</span>
        </a>
      ) : (
        <button type="button" onClick={onOpen} className="aspect-[4/3] bg-muted block w-full">
          {url ? (
            <img src={url} alt={img.caption || img.room || "Design"} className="h-full w-full object-cover" loading="lazy" draggable={false} />
          ) : (
            <span className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></span>
          )}
        </button>
      )}
      <div className="p-2 space-y-2">
        {editable ? (
          <>
            <Input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} placeholder="Caption" className="h-8 text-sm" />
            <div className="flex items-center justify-between gap-1">
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!canLeft} onClick={() => onMove(-1)} aria-label="Move earlier">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!canRight} onClick={() => onMove(1)} aria-label="Move later">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={remove} disabled={del.isPending} aria-label="Remove file">
                {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground min-h-5 break-words">{img.caption || "\u00a0"}</p>
        )}
      </div>
    </div>
  );
};

/* ---------------- lightbox ---------------- */

const Lightbox = ({
  items, index, urls, onIndex, onClose,
}: { items: DesignImage[]; index: number | null; urls: Map<string, string>; onIndex: (i: number) => void; onClose: () => void }) => {
  useEffect(() => {
    if (index === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, items.length, onIndex]);
  const img = index !== null ? items[index] : null;
  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-2 sm:p-4 bg-background">
        <DialogTitle className="sr-only">Design image</DialogTitle>
        {img && (
          <div className="space-y-2">
            <div className="relative flex items-center justify-center bg-muted rounded-[var(--radius)] overflow-hidden">
              {urls.get(img.storage_path) && (
                <img src={urls.get(img.storage_path)} alt={img.caption || img.room || "Design"} className="max-h-[75vh] w-auto object-contain" />
              )}
              {items.length > 1 && (
                <>
                  <Button size="icon" variant="secondary" className="absolute left-2" onClick={() => onIndex((index! - 1 + items.length) % items.length)} aria-label="Previous">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="absolute right-2" onClick={() => onIndex((index! + 1) % items.length)} aria-label="Next">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-sm"><span className="text-muted-foreground">{areaOf(img)}</span>{img.caption ? ` · ${img.caption}` : ""}</p>
            <p className="text-xs text-muted-foreground">{index! + 1} of {items.length}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- request-changes dialog ---------------- */

const RejectDialog = ({
  open, onOpenChange, onConfirm, pending,
}: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (reason: string, feedback: string) => void; pending: boolean }) => {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (open) { setReason(""); setFeedback(""); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>The designer will see this at the top of the next version.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="design-feedback">Feedback (optional)</Label>
            <Textarea id="design-feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value.slice(0, 2000))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(reason, feedback.trim())} disabled={!reason || pending}>Request changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- area section ---------------- */

interface QueueItem { key: string; name: string; area: string; stage: UploadStage | "error" }

const AreaSection = ({
  area, images, urls, editable, uploads, onFiles, onOpen, onReorder, onRename, onChanged,
}: {
  area: string; images: DesignImage[]; urls: Map<string, string>; editable: boolean; uploads: QueueItem[];
  onRename: (from: string, to: string) => void; onChanged: () => void;
  onFiles: (area: string, files: File[]) => void; onOpen: (img: DesignImage) => void;
  onReorder: (area: string, ordered: string[]) => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(area);
  useEffect(() => setName(area), [area]);
  const commitName = () => {
    const to = name.trim().slice(0, 60);
    if (!to) return setName(area); // empty names are not allowed; revert
    if (to !== area) onRename(area, to);
  };
  const ids = images.map((i) => i.id);

  const move = (id: string, dir: -1 | 1) => {
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(area, next);
  };
  const dropOn = (targetId: string) => {
    const src = dragId.current;
    dragId.current = null;
    if (!src || src === targetId || !ids.includes(src)) return; // only within this area
    const next = ids.filter((x) => x !== src);
    next.splice(next.indexOf(targetId), 0, src);
    onReorder(area, next);
  };

  return (
    <section
      className={cn("space-y-3 rounded-[var(--radius)] p-2 -m-2", over && "ring-2 ring-primary")}
      onDragOver={(e) => { if (editable && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        if (!editable || !e.dataTransfer.files.length) return;
        e.preventDefault();
        onFiles(area, Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {editable ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={name} aria-label="Area name" placeholder="Area name"
              className="h-9 max-w-xs font-heading uppercase tracking-wide"
              onChange={(e) => setName(e.target.value)} onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                if (e.key === "Escape") setName(area);
              }}
            />
            <span className="shrink-0 text-muted-foreground text-sm">({images.length})</span>
          </div>
        ) : (
          <h3 className="font-heading uppercase text-lg tracking-wide">{area} <span className="text-muted-foreground text-sm">({images.length})</span></h3>
        )}
        {editable && (
          <>
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Add files
            </Button>
            <input
              ref={input} type="file" multiple accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) onFiles(area, f); }}
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <Thumb
            key={img.id} img={img} url={urls.get(img.storage_path)} editable={editable}
            onOpen={() => onOpen(img)} onMove={(d) => move(img.id, d)} canLeft={i > 0} canRight={i < images.length - 1}
            onDragStartId={(id) => { dragId.current = id; }} onDropOn={dropOn} onChanged={onChanged}
          />
        ))}
        {uploads.map((u) => (
          <div key={u.key} className="rounded-[var(--radius)] border border-dashed border-border aspect-[4/3] flex flex-col items-center justify-center gap-1 p-2 text-center text-xs">
            {u.stage === "error" ? <X className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            <span className="break-all line-clamp-2">{u.name}</span>
            <span className={cn("text-muted-foreground", u.stage === "error" && "text-destructive")}>
              {u.stage === "compressing" ? "Compressing…" : u.stage === "uploading" ? "Uploading…" : u.stage === "saving" ? "Saving…" : "Failed"}
            </span>
          </div>
        ))}
        {editable && images.length === 0 && uploads.length === 0 && (
          <button
            type="button" onClick={() => input.current?.click()}
            className="col-span-full rounded-[var(--radius)] border border-dashed border-border p-8 text-sm text-muted-foreground hover:border-primary"
          >
            Drop renders or PDFs here, or tap to choose files
          </button>
        )}
      </div>
    </section>
  );
};

/* ---------------- version body ---------------- */

const VersionView = ({
  design, previous, editable, leadId, onChanged,
}: { design: DesignRow; previous: DesignRow | undefined; editable: boolean; leadId: string; onChanged: () => void }) => {
  const { data: images = [], isLoading, error } = useDesignImages(design.id);
  const { data: urls = new Map<string, string>() } = useSignedUrls(images.map((i) => i.storage_path));
  const upload = useUploadDesignFile();
  const reorder = useReorderImages();
  const saveNotes = useSaveDesignNotes();
  const rename = useRenameArea();
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [notes, setNotes] = useState(design.notes ?? "");
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => { setNotes(design.notes ?? ""); setExtraAreas([]); setQueue([]); }, [design.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const persistNotes = useCallback(async (v: string) => { await saveNotes.mutateAsync({ id: design.id, notes: v }); onChanged(); }, [design.id, onChanged]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutosave(notes, design.notes ?? "", editable, persistNotes);

  const byArea = useMemo(() => {
    const m = new Map<string, DesignImage[]>();
    for (const i of images) m.set(areaOf(i), [...(m.get(areaOf(i)) ?? []), i]);
    for (const a of extraAreas) if (!m.has(a)) m.set(a, []);
    for (const q of queue) if (!m.has(q.area)) m.set(q.area, []);
    // Standard areas in canonical order; custom ones after, in the order they were added
    // (first file's sort_order is a global running counter; empty new areas go last in click order).
    const rank = (area: string, list: DesignImage[]) => {
      const std = STD_RANK.get(area.toLowerCase());
      if (std !== undefined) return std;
      if (list.length) return DESIGN_AREAS.length + Math.min(...list.map((i) => i.sort_order));
      return 1e9 + Math.max(0, extraAreas.indexOf(area));
    };
    return [...m.entries()].sort((a, b) => rank(a[0], a[1]) - rank(b[0], b[1]));
  }, [images, extraAreas, queue]);
  const findArea = (n: string) => byArea.find(([k]) => k.toLowerCase() === n.toLowerCase())?.[0];
  const addArea = (raw: string) => {
    const n = raw.trim().slice(0, 60);
    if (!n) return;
    if (!findArea(n)) setExtraAreas((x) => [...x, n]);
    setCustomOpen(false); setCustomName("");
  };
  const onRename = (from: string, raw: string) => {
    const to = findArea(raw) && findArea(raw) !== from ? findArea(raw)! : raw; // same name as another group → merge into it
    const ids = images.filter((i) => areaOf(i) === from).map((i) => i.id);
    setExtraAreas((x) => [...new Set(x.map((a) => (a === from ? to : a)))]);
    if (ids.length) rename.mutate({ designId: design.id, ids, to }, { onError: (e) => toast.error(errMsg(e, "Could not rename the area")) });
  };
  const viewable = byArea.flatMap(([, list]) => list).filter((i) => !isPdf(i));
  const unused = DESIGN_AREAS.filter((a) => !byArea.some(([k]) => k === a));

  const onFiles = async (area: string, files: File[]) => {
    let next = images.reduce((m, i) => Math.max(m, i.sort_order), 0) + 1;
    const items = files.map((f) => ({ key: crypto.randomUUID(), name: f.name, area, stage: "compressing" as QueueItem["stage"], file: f, order: next++ }));
    setQueue((q) => [...q, ...items.map(({ key, name, area: a, stage }) => ({ key, name, area: a, stage }))]);
    const setStage = (key: string, stage: QueueItem["stage"]) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, stage } : x)));
    for (const it of items) {
      try {
        await upload.mutateAsync({ leadId, designId: design.id, area, file: it.file, sortOrder: it.order, onStage: (s) => setStage(it.key, s) });
        setQueue((q) => q.filter((x) => x.key !== it.key));
        onChanged();
      } catch (e) {
        toast.error(errMsg(e, `${it.name}: upload failed`));
        setStage(it.key, "error");
        setTimeout(() => setQueue((q) => q.filter((x) => x.key !== it.key)), 6000);
      }
    }
  };

  const onReorder = (area: string, ordered: string[]) => {
    const current = images.filter((i) => areaOf(i) === area);
    const base = Math.min(...current.map((i) => i.sort_order));
    reorder.mutate({ designId: design.id, orderedIds: ordered, base }, { onError: (e) => toast.error(errMsg(e, "Could not reorder")) });
  };

  const rejection = design.status === "Rejected" ? design : design.status === "Draft" && previous?.status === "Rejected" ? previous : null;

  return (
    <div className="space-y-6">
      {rejection && (
        <div className="rounded-[var(--radius)] border-2 border-destructive/60 bg-destructive/5 p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-destructive">Changes requested on V{rejection.version}</p>
          <p className="text-foreground font-medium">{rejection.reject_reason || "No reason given"}</p>
          {rejection.feedback && <p className="text-sm whitespace-pre-wrap">{rejection.feedback}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="design-notes">What changed in this version</Label>
        {editable ? (
          <Textarea id="design-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} />
        ) : (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{design.notes || "No notes."}</p>
        )}
      </div>

      {error ? (
        <p className="text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {byArea.length === 0 && !editable && <p className="text-muted-foreground">No files in this version.</p>}
          {byArea.map(([area, list]) => (
            <AreaSection
              key={area} area={area} images={list} urls={urls} editable={editable}
              uploads={queue.filter((q) => q.area === area)} onFiles={onFiles} onReorder={onReorder}
              onRename={onRename} onChanged={onChanged}
              onOpen={(img) => setLightbox(viewable.findIndex((v) => v.id === img.id))}
            />
          ))}
          {editable && (customOpen ? (
            <div className="flex max-w-md flex-col gap-2 sm:flex-row">
              <Input
                autoFocus value={customName} placeholder="Area name, e.g. Study" aria-label="Custom area name"
                onChange={(e) => setCustomName(e.target.value.slice(0, 60))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addArea(customName); }
                  if (e.key === "Escape") { setCustomOpen(false); setCustomName(""); }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addArea(customName)} disabled={!customName.trim()}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setCustomOpen(false); setCustomName(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="max-w-xs">
              <Select value="" onValueChange={(a) => (a === CUSTOM ? setCustomOpen(true) : addArea(a))}>
                <SelectTrigger><SelectValue placeholder="+ Add area" /></SelectTrigger>
                <SelectContent>
                  {unused.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  <SelectItem value={CUSTOM}><span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add custom area…</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </>
      )}

      <Lightbox items={viewable} index={lightbox} urls={urls} onIndex={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  );
};

/* ---------------- package shell ---------------- */

const DesignPackage = ({ leadId, open, onOpenChange, viewOnly = false }: Props) => {
  const isMobile = useIsMobile();
  const { member } = useWorkspace();
  const { data: lead } = useLead(open ? leadId : undefined);
  const { data: brief } = useBrief(open ? leadId : undefined);
  const { data: designs = [], isLoading } = useDesigns(open ? leadId : undefined);
  const { data: members = [] } = useMembers();
  const { data: currentImages = [] } = useDesignImages(open ? designs[0]?.id : undefined);
  const start = useStartDesign();
  const submit = useSubmitDesign();
  const decide = useDecideDesign();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const latest = designs[0];
  useEffect(() => { setSelectedId(latest?.id ?? null); }, [latest?.id, open]);
  const selected = designs.find((d) => d.id === selectedId) ?? latest;
  const previous = selected ? designs.find((d) => d.version === selected.version - 1) : undefined;

  const me = member?.user_id;
  const isGm = member?.role === "gm";
  const isAssignedDesigner = !!me && (brief?.designer_id === me || lead?.designer_id === me);
  const isLatest = !!selected && selected.id === latest?.id;
  const editable = !viewOnly && isLatest && selected.status === "Draft" && !!me && (selected.designer_id === me || isAssignedDesigner);
  const canReview = !viewOnly &&
    isLatest && selected.status === "Submitted" && member?.role !== "designer" && (isGm || (!!lead && lead.sales_id === me));
  const canStartFirst = !viewOnly && !latest && isAssignedDesigner && !!brief && ["Assigned", "In Design", "Revision Requested"].includes(brief.status);
  const canStartNext = !viewOnly && isAssignedDesigner && latest?.status === "Rejected" && !!brief;
  const nameOf = (id: string | null | undefined) => members.find((m) => m.user_id === id)?.full_name ?? "Someone";

  const doStart = async () => {
    if (!me || !brief) return;
    try {
      await start.mutateAsync({ leadId, designerId: me, brief: { id: brief.id, status: brief.status }, previous: latest ?? null });
    } catch (e) {
      toast.error(errMsg(e, "Could not start the design"));
    }
  };

  const doSubmit = async () => {
    if (!selected || !brief || !lead || !member) return;
    const targets = new Set<string>(members.filter((m) => m.role === "gm" && m.active).map((m) => m.user_id));
    if (lead.sales_id) targets.add(lead.sales_id);
    targets.delete(member.user_id);
    const title = `${member.full_name} submitted design V${selected.version} for ${lead.name}`;
    const notify: NotifyTarget[] = [...targets].map((user_id) => ({ user_id, kind: "design", title, lead_id: lead.id }));
    try {
      await submit.mutateAsync({ leadId, design: selected, brief: { id: brief.id, status: brief.status }, notify });
      toast.success(`V${selected.version} sent to sales`);
    } catch (e) {
      toast.error(errMsg(e, "Could not submit"));
    }
  };

  const doDecide = async (accept: boolean, reason?: string, feedback?: string) => {
    if (!selected || !brief || !lead || !member) return;
    const designer = selected.designer_id ?? brief.designer_id;
    const notify: NotifyTarget[] =
      designer && designer !== member.user_id
        ? [{
            user_id: designer, kind: "design", lead_id: lead.id,
            title: accept
              ? `${member.full_name} accepted design V${selected.version} for ${lead.name}`
              : `${member.full_name} requested changes to design V${selected.version} for ${lead.name}`,
            body: accept ? null : [reason, feedback].filter(Boolean).join(" — "),
          }]
        : [];
    try {
      await decide.mutateAsync({
        leadId, designId: selected.id, briefId: brief.id, deciderId: member.user_id, accept, reason, feedback, notify,
      });
      setRejectOpen(false);
      toast.success(accept ? "Design accepted" : "Changes requested");
    } catch (e) {
      toast.error(errMsg(e, "Could not save the decision"));
    }
  };

  const zeroFiles = currentImages.length === 0;
  const close = () => onOpenChange(false);

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Design package</p>
          <p className="truncate font-heading text-xl">{lead?.name ?? "…"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close"><X className="h-5 w-5" /></Button>
      </header>

      {designs.length > 0 && (
        <nav className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2 md:px-6">
          {designs.slice().reverse().map((d) => (
            <button
              key={d.id} type="button" onClick={() => setSelectedId(d.id)}
              className={cn(
                "shrink-0 rounded-[var(--radius)] border px-3 py-1.5 text-left",
                d.id === selected?.id ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <span className="block text-sm font-medium">V{d.version}</span>
              <DesignStatusPill status={d.status as DesignStatus} className="mt-0.5" />
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !selected ? (
            <div className="rounded-[var(--radius)] border border-border p-8 text-center space-y-3">
              <p className="text-muted-foreground">No design uploaded yet.</p>
              {canStartFirst ? (
                <Button onClick={doStart} disabled={start.isPending}>Start V1</Button>
              ) : (
                <p className="text-xs text-muted-foreground">The assigned designer starts the design package once the brief is assigned.</p>
              )}
            </div>
          ) : (
            <>
              {!isLatest && <p className="text-sm text-muted-foreground">V{selected.version} is a past version and is read-only.</p>}
              {selected.status === "Submitted" && isLatest && !canReview && (
                <p className="text-sm text-muted-foreground">Submitted {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : ""} — waiting for sales to review.</p>
              )}
              {selected.status === "Accepted" && selected.decided_by && (
                <p className="text-sm text-muted-foreground">Accepted by {nameOf(selected.decided_by)}.</p>
              )}
              <VersionView key={selected.id} design={selected} previous={previous} editable={editable} leadId={leadId} />
            </>
          )}
        </div>
      </div>

      {(editable || canReview || canStartNext) && (
        <footer className="border-t border-border px-4 py-3 md:px-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {editable && (
            <>
              {zeroFiles && <span className="text-xs text-muted-foreground sm:mr-auto">Add at least one file before submitting.</span>}
              <Button onClick={doSubmit} disabled={zeroFiles || submit.isPending}>Submit to sales</Button>
            </>
          )}
          {canReview && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={decide.isPending}>Request changes</Button>
              <Button onClick={() => doDecide(true)} disabled={decide.isPending}>Accept design</Button>
            </>
          )}
          {canStartNext && isLatest && (
            <Button onClick={doStart} disabled={start.isPending}>Start V{(latest?.version ?? 0) + 1}</Button>
          )}
        </footer>
      )}

      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} pending={decide.isPending} onConfirm={(r, f) => doDecide(false, r, f)} />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {/* Flex and overflow containment keep the inner package bounded and scrollable. */}
        <SheetContent side="bottom" className="h-[100dvh] p-0 bg-background [&>button]:hidden flex flex-col overflow-hidden">
          <SheetTitle className="sr-only">Design package</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Flex and overflow containment override DialogContent's grid so the package can scroll. */}
      <DialogContent className="max-w-none w-screen h-[100dvh] p-0 gap-0 sm:rounded-none bg-background [&>button]:hidden flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Design package</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default DesignPackage;
