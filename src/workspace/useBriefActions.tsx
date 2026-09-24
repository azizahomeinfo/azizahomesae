import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./WorkspaceProvider";
import { useAssignBrief, useBriefTransition, useMembers, type NotifyTarget } from "./queries";
import { availableActions, type Actor, type BriefAction, type BriefStatus } from "./briefWorkflow";
import type { WorkspaceRole } from "./access";

export interface BriefRef {
  id: string;
  leadId: string;
  leadName: string;
  status: BriefStatus;
  designerId: string | null;
  salesId: string | null;
}

export const useActor = (salesId: string | null, designerId: string | null): Actor | null => {
  const { member } = useWorkspace();
  if (!member) return null;
  return {
    userId: member.user_id,
    role: member.role as WorkspaceRole,
    isSalesOwner: !!salesId && salesId === member.user_id,
    isAssignedDesigner: !!designerId && designerId === member.user_id,
  };
};

/** Action buttons for a brief plus the dialogs they need (assign designer, revision note). */
export const BriefActionBar = ({
  brief,
  beforeAction,
  size = "default",
}: {
  brief: BriefRef;
  beforeAction?: () => Promise<void>;
  size?: "default" | "sm";
}) => {
  const { member } = useWorkspace();
  const actor = useActor(brief.salesId, brief.designerId);
  const { data: members = [] } = useMembers();
  const transition = useBriefTransition();
  const assign = useAssignBrief();
  const [assignOpen, setAssignOpen] = useState(false);
  const [designer, setDesigner] = useState("");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!actor || !member) return null;
  const actions = availableActions(brief.status, actor);
  if (!actions.length) return null;

  const me = member.user_id;
  const busy = transition.isPending || assign.isPending;
  const now = () => new Date().toISOString();
  const n = (user_id: string | null | undefined, title: string, body?: string): NotifyTarget[] =>
    user_id && user_id !== me ? [{ user_id, title, body: body ?? null, lead_id: brief.leadId, kind: "brief" }] : [];
  const gms = members.filter((m) => m.active && m.role === "gm").map((m) => m.user_id);
  const designers = members.filter((m) => m.active && m.role === "designer");
  const lead = brief.leadName;

  const run = async (a: BriefAction, extra?: { designerId?: string; note?: string }) => {
    try {
      await beforeAction?.();
      if (a.kind === "claim" || a.kind === "assign") {
        const d = a.kind === "claim" ? me : extra?.designerId;
        if (!d) return toast.error("Choose a designer");
        await assign.mutateAsync({
          id: brief.id, leadId: brief.leadId, designerId: d,
          notify: n(d, `Brief assigned to you: ${lead}`, `${member.full_name} assigned you the requirement brief.`),
        });
      } else {
        let patch: Record<string, unknown> = { status: a.to };
        let notify: NotifyTarget[] = [];
        if (a.kind === "submit") {
          patch = { ...patch, submitted_at: now() };
          notify = brief.designerId
            ? n(brief.designerId, `Brief submitted: ${lead}`)
            : designers.flatMap((d) => n(d.user_id, `New brief awaiting a designer: ${lead}`));
        } else if (a.kind === "ready") {
          patch = { ...patch, ready_at: now() };
          const targets = Array.from(new Set([brief.salesId, ...gms].filter(Boolean) as string[]));
          notify = targets.flatMap((u) => n(u, `Design ready for review: ${lead}`, `${member.full_name} marked the design ready.`));
        } else if (a.kind === "approve") {
          patch = { ...patch, approved_at: now() };
          notify = n(brief.designerId, `Design approved: ${lead}`);
        } else if (a.kind === "revise") {
          const text = extra?.note?.trim();
          if (!text) return toast.error("A revision note is required");
          patch = { ...patch, revision_note: text.slice(0, 2000) };
          notify = n(brief.designerId, `Revision requested: ${lead}`, text.slice(0, 140));
        }
        await transition.mutateAsync({ id: brief.id, leadId: brief.leadId, patch, notify });
      }
      toast.success(a.label);
      setAssignOpen(false);
      setReviseOpen(false);
      setNote("");
      setDesigner("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the brief");
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <Button
            key={a.kind}
            size={size}
            variant={i === 0 ? "default" : "outline"}
            disabled={busy}
            onClick={() => (a.kind === "assign" ? setAssignOpen(true) : a.kind === "revise" ? setReviseOpen(true) : run(a))}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign designer</DialogTitle>
            <DialogDescription>{lead}</DialogDescription>
          </DialogHeader>
          {designers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active designers. Invite one in Settings first.</p>
          ) : (
            <Select value={designer || undefined} onValueChange={setDesigner}>
              <SelectTrigger><SelectValue placeholder="Choose a designer" /></SelectTrigger>
              <SelectContent>
                {designers.map((d) => <SelectItem key={d.user_id} value={d.user_id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!designer || busy}
              onClick={() => run({ kind: "assign", label: "Designer assigned", to: "Assigned" }, { designerId: designer })}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request revision</DialogTitle>
            <DialogDescription>Tell the designer what needs to change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rev-note">Revision note</Label>
            <Textarea id="rev-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseOpen(false)}>Cancel</Button>
            <Button
              disabled={!note.trim() || busy}
              onClick={() => run({ kind: "revise", label: "Revision requested", to: "Revision Requested" }, { note })}
            >
              Send back to design
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
