import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lead } from "./queries";
import { useConvertLead } from "./projectQueries";
import { todayISO } from "./format";

/** Fast path for deals agreed outside the system. Everything else (coordinator, FF&E, tasks, notifications) happens in ws_convert_lead. */
const ConvertProject = ({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const navigate = useNavigate();
  const convert = useConvertLead();
  const [handover, setHandover] = useState(lead.target_date ?? "");

  const submit = async () => {
    if (!handover) return toast.error("Enter the handover date to convert this lead into a project");
    if (handover < todayISO()) return toast.error("Handover can't be in the past");
    try {
      const res = await convert.mutateAsync({ leadId: lead.id, handover });
      if (res.items > 0) toast.success(`Project created — ${res.items} FF&E items handed to the coordinator`);
      else toast.warning("Project created, but it has no FF&E list yet. The coordinator won't start buying until the list is added.", { duration: 10000 });
      onOpenChange(false);
      navigate(res.code ? `/workspace/projects/${res.code}` : "/workspace/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to project</DialogTitle>
          <DialogDescription>
            {lead.name} becomes a live job at Contract / Deposit. The coordinator is assigned and notified, and the FF&E list from the brief is carried over.
            Upload the signed contract and proposal on the project afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cp-hand">Handover date</Label>
          <Input id="cp-hand" type="date" value={handover} onChange={(e) => setHandover(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={convert.isPending}>Create project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertProject;
