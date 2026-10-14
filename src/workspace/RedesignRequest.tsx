import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDesignImages, useDesigns, useRequestRedesign, useSignedUrls, type DesignRow } from "./designQueries";
import { useMembers } from "./queries";
import { shortDate } from "./format";
import { isCatalogPath } from "./packageCatalog";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

type RoomRef = { title: string; paths: string[] };

/** Rooms in the order the client saw them: the proposal's pages, else the latest shared design's areas. */
const useRooms = (leadId: string, pages: RoomRef[] | undefined, enabled: boolean): RoomRef[] => {
  const { data: designs = [] } = useDesigns(enabled && !pages ? leadId : undefined);
  const shared = designs.find((d) => d.status !== "Draft");
  const { data: images = [] } = useDesignImages(enabled && !pages ? shared?.id : undefined);
  return useMemo(() => {
    if (pages) return pages.filter((p) => p.title.trim());
    const m = new Map<string, string[]>();
    for (const i of images) m.set(i.room || "Other", [...(m.get(i.room || "Other") ?? []), i.storage_path]);
    return [...m.entries()].map(([title, paths]) => ({ title, paths }));
  }, [pages, images]);
};

/**
 * Sales records what the client said, room by room in the order the client saw the renders, and sends it
 * to the designer: the next design version opens with this feedback on it (ws_request_redesign).
 */
export const RedesignDialog = ({ open, onOpenChange, leadId, leadName, proposalId, proposalVersion, pages }: {
  open: boolean; onOpenChange: (o: boolean) => void; leadId: string; leadName: string;
  proposalId?: string | null; proposalVersion?: number | null; pages?: RoomRef[];
}) => {
  const rooms = useRooms(leadId, pages, open);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [overall, setOverall] = useState("");
  const paths = rooms.flatMap((r) => r.paths).filter((p) => !p.toLowerCase().endsWith(".pdf") && !isCatalogPath(p));
  const { data: urls } = useSignedUrls(open ? paths : []);
  const req = useRequestRedesign();
  // The designer reads it as one note, organised by room, in the client's order.
  const feedback = [
    ...rooms.map((r) => [r.title, notes[r.title]?.trim()] as const).filter(([, n]) => n).map(([title, n]) => `${title}:\n${n}`),
    ...(overall.trim() ? [`Overall:\n${overall.trim()}`] : []),
  ].join("\n\n");
  const send = () => req.mutate({ leadId, feedback, proposalId }, {
    onSuccess: () => { toast.success("Sent to the designer — you'll be notified when the new version is shared"); setNotes({}); setOverall(""); onOpenChange(false); },
    onError: (e) => toast.error(errMsg(e, "Could not send the redesign request")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client wants changes · {leadName}</DialogTitle>
          <DialogDescription>
            Go through the renders the client saw{proposalVersion ? ` in proposal V${proposalVersion}` : ""} and note what should change in each room — leave a room empty if it's fine.
            The designer gets a new design version with your notes and a task; when they share it, accept it and save the proposal as a new revision (the GM re-prices FF&amp;E changes first).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {rooms.map((r, i) => (
            <section key={`${r.title}-${i}`} className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-primary">{String(i + 1).padStart(2, "0")} · {r.title}</h3>
              {r.paths.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {r.paths.map((p) => {
                    const u = isCatalogPath(p) ? p : urls?.get(p);
                    return u
                      ? <a key={p} href={u} target="_blank" rel="noreferrer" className="shrink-0"><img src={u} alt={r.title} className="h-28 w-auto rounded-[var(--radius)] border border-border object-cover" /></a>
                      : <div key={p} className="h-28 w-40 shrink-0 animate-pulse rounded-[var(--radius)] bg-muted" />;
                  })}
                </div>
              )}
              <Textarea rows={2} value={notes[r.title] ?? ""} aria-label={`Changes for ${r.title}`}
                onChange={(e) => setNotes((n) => ({ ...n, [r.title]: e.target.value.slice(0, 1500) }))}
                placeholder={`What should change in the ${r.title}? e.g. lighter oak TV unit, sofa in beige`} />
            </section>
          ))}
          {!rooms.length && <p className="text-sm text-muted-foreground">No renders to show yet — write the client's feedback below.</p>}
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.22em] text-primary">Anything else</h3>
            <Textarea rows={3} value={overall} onChange={(e) => setOverall(e.target.value.slice(0, 3000))} aria-label="Other feedback"
              placeholder="Overall style, layout, budget, items to add or drop…" />
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={req.isPending}>Cancel</Button>
          <Button onClick={send} disabled={!feedback || req.isPending}>{req.isPending ? "Sending…" : "Send to designer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Where a redesign stands, relative to the design version a proposal was made from. */
export const RedesignStatus = ({ leadId, basedOn }: { leadId: string; basedOn: number | null }) => {
  const { data: designs = [] } = useDesigns(leadId);
  const { data: members = [] } = useMembers();
  const latest: DesignRow | undefined = designs[0];
  if (!latest || basedOn == null || latest.version <= basedOn) return null;
  const who = members.find((m) => m.user_id === latest.revision_requested_by)?.full_name;
  const link = <Link to={`/workspace/leads/${leadId}?design=${leadId}`} className="font-medium text-primary underline">Open the design</Link>;
  if (latest.status === "Draft") {
    return (
      <div className="space-y-1 rounded-[var(--radius)] border border-warning/50 bg-warning/10 p-3 text-sm">
        <p className="font-medium">Redesign in progress — V{latest.version} is with the designer{latest.revision_requested_at ? ` since ${shortDate(latest.revision_requested_at)}` : ""}.</p>
        {latest.revision_request && <p className="whitespace-pre-wrap text-muted-foreground">Client feedback{who ? ` (sent by ${who})` : ""}: {latest.revision_request}</p>}
        <p className="text-xs text-muted-foreground">You'll be notified when it's shared. {link}</p>
      </div>
    );
  }
  if (latest.status === "Submitted") {
    return (
      <div className="rounded-[var(--radius)] border border-primary/40 bg-primary/5 p-3 text-sm">
        <p className="font-medium">The designer shared V{latest.version}. Review and accept it, then save this proposal as a new revision. {link}</p>
      </div>
    );
  }
  if (latest.status === "Accepted") {
    return (
      <div className="rounded-[var(--radius)] border border-primary/40 bg-primary/5 p-3 text-sm">
        <p className="font-medium">Design V{latest.version} is accepted — this proposal still shows V{basedOn}. Save as new revision to put the new design (and the GM's new price) in, then finalise and send.</p>
      </div>
    );
  }
  return null;
};
