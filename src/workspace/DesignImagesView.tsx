import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESIGN_AREAS, type DesignStatus } from "./designSchema";
import { isPdf, useDesignImages, useDesigns, useSignedUrls, type DesignImage } from "./designQueries";
import DesignStatusPill from "./DesignStatusPill";
import { Lightbox } from "./DesignPackage";

const STD_RANK = new Map((DESIGN_AREAS as readonly string[]).map((a, i) => [a.toLowerCase(), i]));
const areaOf = (i: DesignImage) => i.room || "Other";
/** Only what the coordinator checks the FF&E list against: 3D renders and mood boards (no floor plans, PDFs). */
const isShown = (i: DesignImage) => !isPdf(i) && (/render/i.test(i.kind) || /mood/i.test(i.kind));

/**
 * Read-only, images-only design view (coordinator). No FF&E tab, no review/submit/upload/version actions,
 * no notes editor. RLS limits it to the coordinator's own projects (ws_coordinator_on_lead).
 */
const DesignImagesView = ({ leadId }: { leadId: string }) => {
  const { data: designs = [], isLoading } = useDesigns(leadId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const preferred = designs.find((d) => d.status === "Accepted") ?? designs[0];
  useEffect(() => { setSelectedId(preferred?.id ?? null); }, [preferred?.id]);
  const selected = designs.find((d) => d.id === selectedId) ?? preferred;

  const { data: all = [], isLoading: imgLoading } = useDesignImages(selected?.id);
  const images = useMemo(() => all.filter(isShown), [all]);
  const { data: urls = new Map<string, string>() } = useSignedUrls(images.map((i) => i.storage_path));
  const [lightbox, setLightbox] = useState<number | null>(null);

  const byArea = useMemo(() => {
    const m = new Map<string, DesignImage[]>();
    for (const i of images) m.set(areaOf(i), [...(m.get(areaOf(i)) ?? []), i]);
    const rank = (a: string, l: DesignImage[]) => STD_RANK.get(a.toLowerCase()) ?? DESIGN_AREAS.length + Math.min(...l.map((i) => i.sort_order));
    return [...m.entries()].sort((a, b) => rank(a[0], a[1]) - rank(b[0], b[1]));
  }, [images]);
  const ordered = byArea.flatMap(([, l]) => l);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!selected) return <p className="text-sm text-muted-foreground">No design uploaded yet.</p>;

  return (
    <div className="space-y-5">
      {designs.length > 1 && (
        <nav className="flex gap-2 overflow-x-auto" aria-label="Design versions">
          {designs.slice().reverse().map((d) => (
            <button key={d.id} type="button" onClick={() => setSelectedId(d.id)}
              className={cn("shrink-0 rounded-[var(--radius)] border px-3 py-1.5 text-left", d.id === selected.id ? "border-primary bg-primary/5" : "border-border")}>
              <span className="block text-sm font-medium">V{d.version}</span>
              <DesignStatusPill status={d.status as DesignStatus} className="mt-0.5" />
            </button>
          ))}
        </nav>
      )}
      <p className="text-sm text-muted-foreground">
        Showing V{selected.version}{selected.status === "Accepted" ? " — the accepted design you are buying against" : ""}.
        {selected.notes ? <> What changed: {selected.notes}</> : null}
      </p>

      {imgLoading ? <p className="text-muted-foreground">Loading…</p>
        : byArea.length === 0 ? <p className="text-sm text-muted-foreground">No renders or mood board in this version.</p>
        : byArea.map(([area, list]) => (
          <section key={area} className="space-y-3">
            <h3 className="font-heading uppercase text-lg tracking-wide">{area} <span className="text-muted-foreground text-sm">({list.length})</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {list.map((img) => (
                <button key={img.id} type="button" onClick={() => setLightbox(ordered.findIndex((x) => x.id === img.id))}
                  className="overflow-hidden rounded-[var(--radius)] border border-border bg-card text-left">
                  <span className="block aspect-[4/3] bg-muted">
                    {urls.get(img.storage_path)
                      ? <img src={urls.get(img.storage_path)} alt={img.caption || area} className="h-full w-full object-cover" loading="lazy" />
                      : <span className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></span>}
                  </span>
                  <span className="block p-2 text-[11px] text-muted-foreground">{img.kind}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

      <Lightbox items={ordered} index={lightbox} urls={urls} onIndex={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  );
};

export default DesignImagesView;
