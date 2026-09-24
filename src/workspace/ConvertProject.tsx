import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMembers, type Lead } from "./queries";
import { useConvertLead } from "./projectQueries";
import { inheritLeadFfe } from "./ffeQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { todayISO } from "./format";

const NONE = "__none";

const MemberPick = ({ label, role, value, onChange }: { label: string; role: string; value: string; onChange: (v: string) => void }) => {
  const { data: members = [] } = useMembers();
  const list = members.filter((m) => m.active && (m.role === role || m.role === "gm"));
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Unassigned</SelectItem>
          {list.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};

const ConvertProject = ({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const navigate = useNavigate();
  const { member } = useWorkspace();
  const convert = useConvertLead();
  const [start, setStart] = useState(todayISO());
  const [handover, setHandover] = useState(lead.target_date ?? "");
  const [value, setValue] = useState(lead.budget ? String(lead.budget) : "");
  const [sales, setSales] = useState(lead.sales_id ?? "");
  const [designer, setDesigner] = useState(lead.designer_id ?? "");
  const [coordinator, setCoordinator] = useState("");

  useEffect(() => {
    if (!open) return;
    setSales(lead.sales_id ?? "");
    setDesigner(lead.designer_id ?? "");
  }, [open, lead.sales_id, lead.designer_id]);

  const submit = async () => {
    if (!member) return;
    if (handover && start && handover < start) return toast.error("Handover can't be before the start date");
    const v = value.trim() === "" ? null : Number(value);
    if (v !== null && (Number.isNaN(v) || v < 0)) return toast.error("Contract value must be a positive number");
    try {
      const res = await convert.mutateAsync({
        leadId: lead.id,
        actorId: member.user_id,
        actorName: member.full_name,
        values: {
          name: lead.name, client: lead.name, property: lead.property, unit: lead.building,
          unit_type: lead.unit_type, location: lead.location, drive_url: lead.drive_url,
          start_date: start || null, handover_date: handover || null, value: v,
          sales_id: sales || null, designer_id: designer || null, coordinator_id: coordinator || null,
          created_by: member.user_id,
        },
      });
      try {
        await inheritLeadFfe(lead.id, res.id);
      } catch (e) {
        toast.error(`Project created, but its FF&E list was not linked: ${e instanceof Error ? e.message : "unknown error"}`);
      }
      toast.success("Project created");
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
          <DialogDescription>{lead.name} becomes a live job starting at Contract / Deposit.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label htmlFor="cp-start">Start date</Label><Input id="cp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="cp-hand">Handover date</Label><Input id="cp-hand" type="date" value={handover} onChange={(e) => setHandover(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cp-val">Contract value (AED)</Label><Input id="cp-val" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <MemberPick label="Sales" role="sales" value={sales} onChange={setSales} />
          <MemberPick label="Designer" role="designer" value={designer} onChange={setDesigner} />
          <MemberPick label="Coordinator" role="coordinator" value={coordinator} onChange={setCoordinator} />
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
