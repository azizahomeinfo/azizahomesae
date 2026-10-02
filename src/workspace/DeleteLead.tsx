import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteLead, useLeadDeletePreview, type Lead, type LeadDeletePreview } from "./queries";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Only what actually exists, in plain words. */
export const lossList = (p: LeadDeletePreview): string[] => {
  const out: string[] = [];
  if (p.brief) out.push("the requirement brief");
  if (p.ffe_items) out.push(plural(p.ffe_items, "FF&E item"));
  if (p.designs) out.push(`${plural(p.designs, "design version")}${p.design_images ? ` with ${plural(p.design_images, "image")}` : ""}`);
  if (p.documents) out.push(plural(p.documents, "uploaded document"));
  if (p.proposals) out.push(plural(p.proposals, "proposal"));
  if (p.contracts) out.push(plural(p.contracts, "contract draft"));
  if (p.tasks) out.push(plural(p.tasks, "task"));
  if (p.comments) out.push(plural(p.comments, "comment"));
  return out;
};

const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const DeleteLead = ({ lead }: { lead: Lead }) => {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: p, isLoading, error } = useLeadDeletePreview(lead.id, open);
  const del = useDeleteLead();
  const losses = p ? lossList(p) : [];

  const go = async () => {
    setErr(null);
    try {
      await del.mutateAsync(lead.id);
      toast.success(`Deleted ${lead.name}`);
      setOpen(false);
      navigate("/workspace/leads");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete the lead");
    }
  };

  return (
    <>
      <Button variant="outline" className="text-destructive" onClick={() => { setErr(null); setOpen(true); }}>Delete lead</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-words">Delete “{lead.name}”?</DialogTitle>
            <DialogDescription>{lead.ref}</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Checking what's attached…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : p?.blocked ? (
            <p className="text-sm text-destructive">{p.blocked}</p>
          ) : losses.length ? (
            <div className="rounded-[var(--radius)] border border-destructive/60 bg-destructive/10 p-3 text-sm space-y-1">
              <p className="text-foreground">This also deletes <strong>{join(losses)}</strong>.</p>
              <p className="text-destructive">This cannot be undone.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing else is attached to this lead. This cannot be undone.</p>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={go} disabled={!p || !!p.blocked || del.isPending}>
              {del.isPending ? "Deleting…" : "Delete lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteLead;
