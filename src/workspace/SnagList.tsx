import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMembers } from "./queries";
import { useSignedUrls } from "./designQueries";
import { DESIGN_AREAS } from "./designSchema";
import type { Project } from "./projectQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { todayISO } from "./format";
import { useAddSnag, useUpdateSnag, type Snag } from "./ffeQueries";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);
const NONE = "__none";
const TONE: Record<Snag["status"], string> = {
  Open: "bg-destructive/10 text-destructive", Fixed: "bg-secondary/30 text-foreground", Verified: "bg-primary/10 text-primary",
};

export const SnagList = ({ project, snags }: { project: Project; snags: Snag[] }) => {
  const { member } = useWorkspace();
  const { data: members = [] } = useMembers();
  const { data: urls } = useSignedUrls(snags.map((s) => s.photo_path).filter(Boolean) as string[]);
  const add = useAddSnag();
  const upd = useUpdateSnag();
  const [area, setArea] = useState("");
  const [desc, setDesc] = useState("");
  const [owner, setOwner] = useState(NONE);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const team = [...new Set([project.sales_id, project.designer_id, project.coordinator_id].filter(Boolean) as string[])]
    .map((id) => members.find((m) => m.user_id === id)).filter(Boolean) as typeof members;
  // Sign-off must come from someone other than the fixer: GM or this project's coordinator.
  const canVerify = member?.role === "gm" || member?.user_id === project.coordinator_id;
  const open = snags.filter((s) => s.status !== "Verified").length;

  const submit = () => {
    if (!area.trim() || !desc.trim()) return;
    add.mutate({ projectId: project.id, area: area.trim(), description: desc.trim(), ownerId: owner === NONE ? null : owner, photo }, {
      onSuccess: () => { setArea(""); setDesc(""); setOwner(NONE); setPhoto(null); if (fileRef.current) fileRef.current.value = ""; },
      onError: (e) => toast.error(errMsg(e, "Could not add snag")),
    });
  };
  const setStatus = (s: Snag, status: Snag["status"]) =>
    upd.mutate({ projectId: project.id, id: s.id, values: { status, fixed_on: status === "Open" ? null : s.fixed_on ?? todayISO() } },
      { onError: (e) => toast.error(errMsg(e, "Failed")) });

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Snag list · {open} open of {snags.length}</h3>
      <div className="grid gap-2 md:grid-cols-[10rem_1fr_10rem_auto_auto]">
        <Input list="snag-areas" placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" />
        <datalist id="snag-areas">{DESIGN_AREAS.map((a) => <option key={a} value={a} />)}</datalist>
        <Input placeholder="Describe the snag" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Snag" />
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger aria-label="Owner"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No owner</SelectItem>
            {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>{photo ? "Photo ✓" : "Photo"}</Button>
        <Button onClick={submit} disabled={!area.trim() || !desc.trim() || add.isPending}>{add.isPending ? "Adding…" : "Add snag"}</Button>
      </div>
      {snags.length === 0 ? <p className="text-sm text-muted-foreground">No snags logged.</p> : (
        <ul className="divide-y divide-border">
          {snags.map((s) => {
            const url = s.photo_path ? urls?.get(s.photo_path) : undefined;
            return (
              <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                {url && <a href={url} target="_blank" rel="noreferrer" className="shrink-0"><img src={url} alt={`Snag ${s.ref}`} className="h-14 w-14 rounded object-cover" /></a>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="text-primary">{s.ref}</span> · {s.area}</p>
                  <p className="text-sm break-words">{s.description}</p>
                  <p className="text-xs text-muted-foreground">{members.find((m) => m.user_id === s.owner_id)?.full_name ?? "No owner"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs", TONE[s.status])}>{s.status}</span>
                  {s.status === "Open" && <Button size="sm" variant="outline" onClick={() => setStatus(s, "Fixed")}>Mark fixed</Button>}
                  {s.status === "Fixed" && canVerify && <Button size="sm" onClick={() => setStatus(s, "Verified")}>Verify</Button>}
                  {s.status === "Fixed" && <Button size="sm" variant="ghost" onClick={() => setStatus(s, "Open")}>Reopen</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!canVerify && <p className="text-xs text-muted-foreground">Only the GM or the project coordinator can verify a fix.</p>}
    </section>
  );
};
