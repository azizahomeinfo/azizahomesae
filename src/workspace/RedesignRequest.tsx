import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDesigns, useRequestRedesign, type DesignRow } from "./designQueries";
import { useMembers } from "./queries";
import { shortDate } from "./format";

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

/**
 * Sales records what the client said about the proposal or the design and sends it to the designer:
 * the next design version opens with this feedback on it (ws_request_redesign).
 */
export const RedesignDialog = ({ open, onOpenChange, leadId, leadName, proposalId, proposalVersion }: {
  open: boolean; onOpenChange: (o: boolean) => void; leadId: string; leadName: string; proposalId?: string | null; proposalVersion?: number | null;
}) => {
  const [feedback, setFeedback] = useState("");
  const req = useRequestRedesign();
  const send = () => req.mutate({ leadId, feedback, proposalId }, {
    onSuccess: () => { toast.success("Sent to the designer — you'll be notified when the new version is shared"); setFeedback(""); onOpenChange(false); },
    onError: (e) => toast.error(errMsg(e, "Could not send the redesign request")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client wants changes · {leadName}</DialogTitle>
          <DialogDescription>
            What did the client say{proposalVersion ? ` about proposal V${proposalVersion}` : ""}? The designer gets a new design version with your note,
            and a task. When they share it, accept it, then save the proposal as a new revision — the GM re-prices any FF&amp;E changes first.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={6} value={feedback} onChange={(e) => setFeedback(e.target.value.slice(0, 3000))} aria-label="Client feedback"
          placeholder={"e.g. Client prefers a lighter oak TV unit, wants the sofa in beige instead of grey, and asks to drop the balcony set."} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={req.isPending}>Cancel</Button>
          <Button onClick={send} disabled={!feedback.trim() || req.isPending}>{req.isPending ? "Sending…" : "Send to designer"}</Button>
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
