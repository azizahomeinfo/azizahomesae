import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AREAS, HANDOVER_STATUSES, LEAD_STATUSES, SCOPES, SOURCES, UNIT_TYPES, USES, type LeadStatus } from "./constants";
import { useCreateLead, useMembers, useUpdateLead, type Lead } from "./queries";
import { useWorkspace } from "./WorkspaceProvider";

const NONE = "__none";

const FIELDS = [
  "name", "phone", "email", "property", "building", "location", "unit_type", "size", "handover_status",
  "exp_handover", "use_type", "budget", "target_date", "scope", "style", "refs", "floor_plan", "source",
  "status", "last_contact", "next_follow", "notes", "sales_id",
] as const;
type Field = (typeof FIELDS)[number];
type FormState = Record<Field, string>;

const schema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(200),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email").max(320)]),
  phone: z.string().trim().max(40),
  budget: z.union([z.literal(""), z.coerce.number().min(0, "Budget cannot be negative").max(1e10)]),
  notes: z.string().max(5000),
});

const fromLead = (l?: Lead | null): FormState => {
  const s = {} as FormState;
  for (const f of FIELDS) {
    const v = l ? (l as unknown as Record<string, unknown>)[f] : null;
    s[f] = v === null || v === undefined ? "" : String(v);
  }
  if (!l) s.status = "New Lead";
  return s;
};

const Legend = ({ children }: { children: ReactNode }) => (
  <legend className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{children}</legend>
);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead?: Lead | null;
  onSaved?: (lead: Lead) => void;
}

const LeadForm = ({ open, onOpenChange, lead, onSaved }: Props) => {
  const isMobile = useIsMobile();
  const { member } = useWorkspace();
  const isGm = member?.role === "gm";
  const { data: members = [] } = useMembers();
  const create = useCreateLead();
  const update = useUpdateLead();
  const [f, setF] = useState<FormState>(() => fromLead(lead));

  useEffect(() => {
    if (open) setF(fromLead(lead));
  }, [open, lead]);

  const set = (k: Field) => (v: string) => setF((p) => ({ ...p, [k]: v === NONE ? "" : v }));
  const inp = (k: Field) => ({ value: f[k], onChange: (e: { target: { value: string } }) => set(k)(e.target.value) });

  const sel = (k: Field, label: string, options: readonly string[] | { value: string; label: string }[], disabled = false) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={f[k] || undefined} onValueChange={set(k)} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {k !== "status" && <SelectItem value={NONE}>—</SelectItem>}
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );

  const text = (k: Field, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lf-${k}`}>{label}</Label>
      <Input id={`lf-${k}`} type={type} {...inp(k)} {...extra} />
    </div>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) return toast.error(r.error.errors[0].message);
    const n = (v: string) => (v.trim() === "" ? null : v.trim());
    const values = {
      name: f.name.trim(),
      phone: n(f.phone), email: n(f.email), property: n(f.property), building: n(f.building),
      location: n(f.location), unit_type: n(f.unit_type), size: n(f.size), handover_status: n(f.handover_status),
      exp_handover: f.handover_status === "Pending handover" ? n(f.exp_handover) : null,
      use_type: n(f.use_type), budget: f.budget === "" ? null : Number(f.budget), target_date: n(f.target_date),
      scope: n(f.scope), style: n(f.style), refs: n(f.refs), floor_plan: n(f.floor_plan), source: n(f.source),
      status: (f.status || "New Lead") as LeadStatus, last_contact: n(f.last_contact), next_follow: n(f.next_follow),
      notes: n(f.notes),
    };
    try {
      let saved: Lead;
      if (lead) {
        saved = await update.mutateAsync({ id: lead.id, values: isGm ? { ...values, sales_id: n(f.sales_id) } : values });
        toast.success("Lead updated");
      } else {
        const sales_id = isGm ? n(f.sales_id) : member?.user_id ?? null;
        saved = await create.mutateAsync({ ...values, sales_id, created_by: member?.user_id ?? null });
        toast.success(`Lead ${saved.ref} created`);
      }
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save lead");
    }
  };

  const busy = create.isPending || update.isPending;
  const owners = members.filter((m) => m.active && (m.role === "sales" || m.role === "gm")).map((m) => ({ value: m.user_id, label: m.full_name }));
  const title = lead ? `Edit ${lead.ref}` : "New lead";

  const body = (
    <form onSubmit={submit} className="space-y-6 font-body">
      <fieldset>
        <Legend>Client</Legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("name", "Name *", "text", { autoFocus: !lead })}
          {text("phone", "Phone", "tel")}
          {text("email", "Email", "email")}
        </div>
      </fieldset>
      <fieldset>
        <Legend>Property</Legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("property", "Property")}
          {text("building", "Building")}
          {sel("location", "Area", AREAS)}
          {sel("unit_type", "Unit type", UNIT_TYPES)}
          {text("size", "Size")}
          {sel("handover_status", "Handover", HANDOVER_STATUSES)}
          {text("exp_handover", "Expected handover", "date", { disabled: f.handover_status !== "Pending handover" })}
        </div>
      </fieldset>
      <fieldset>
        <Legend>Requirement</Legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {sel("use_type", "Use", USES)}
          {text("budget", "Budget (AED)", "number", { min: 0, step: 500, inputMode: "numeric" })}
          {text("target_date", "Target date", "date")}
          {sel("scope", "Scope", SCOPES)}
          {text("style", "Style")}
          {text("refs", "References")}
          {sel("floor_plan", "Floor plan", ["Yes", "No"])}
          {sel("source", "Source", SOURCES)}
        </div>
      </fieldset>
      <fieldset>
        <Legend>Pipeline</Legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {sel("status", "Status", LEAD_STATUSES)}
          {text("last_contact", "Last contact", "date")}
          {text("next_follow", "Next follow-up", "date")}
          {isGm && sel("sales_id", "Owner", owners)}
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="lf-notes">Notes</Label>
          <Textarea id="lf-notes" rows={4} {...inp("notes")} />
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pb-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={busy}>{lead ? "Save changes" : "Create lead"}</Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto bg-background">
          <SheetHeader><SheetTitle className="font-heading uppercase tracking-wide">{title}</SheetTitle></SheetHeader>
          <div className="pt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading uppercase tracking-wide">{title}</DialogTitle></DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default LeadForm;
