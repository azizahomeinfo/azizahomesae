import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../WorkspaceProvider";
import { useSaveSupplier, useSupplierOpenCounts, useSuppliers, type Supplier } from "../ffeQueries";

const STATUSES: Supplier["status"][] = ["Preferred", "Approved", "On Watch", "Blocked"];
const TONE: Record<Supplier["status"], string> = {
  Preferred: "bg-primary/10 text-primary", Approved: "bg-primary/10 text-primary",
  "On Watch": "bg-secondary/30 text-foreground", Blocked: "bg-destructive/10 text-destructive",
};
const StatusPill = ({ s }: { s: Supplier["status"] }) => <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs", TONE[s])}>{s}</span>;

type Form = { name: string; category: string; contact: string; phone: string; email: string; lead_time: string; payment_terms: string; rating: string; status: Supplier["status"]; notes: string };
const blank: Form = { name: "", category: "", contact: "", phone: "", email: "", lead_time: "", payment_terms: "", rating: "", status: "Approved", notes: "" };

const SupplierDialog = ({ supplier, open, onOpenChange }: { supplier: Supplier | null; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const save = useSaveSupplier();
  const [f, setF] = useState<Form>(blank);
  const [seeded, setSeeded] = useState<string | null>(null);
  const key = supplier?.id ?? "new";
  if (open && seeded !== key) {
    setSeeded(key);
    setF(supplier ? {
      name: supplier.name, category: supplier.category ?? "", contact: supplier.contact ?? "", phone: supplier.phone ?? "",
      email: supplier.email ?? "", lead_time: supplier.lead_time ?? "", payment_terms: supplier.payment_terms ?? "",
      rating: supplier.rating != null ? String(supplier.rating) : "", status: supplier.status, notes: supplier.notes ?? "",
    } : blank);
  }
  const rating = f.rating === "" ? null : Math.max(0, Math.min(5, Math.round(Number(f.rating))));
  const submit = () => {
    const t = (s: string) => s.trim() || null;
    save.mutate({
      id: supplier?.id,
      values: { name: f.name.trim(), category: t(f.category), contact: t(f.contact), phone: t(f.phone), email: t(f.email),
        lead_time: t(f.lead_time), payment_terms: t(f.payment_terms), rating, status: f.status, notes: t(f.notes) },
    }, { onSuccess: () => { toast.success("Supplier saved"); onOpenChange(false); setSeeded(null); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  };
  const field = (k: keyof Form, label: string, type = "text") => (
    <div className="space-y-1"><Label htmlFor={`sup-${k}`}>{label}</Label>
      <Input id={`sup-${k}`} type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSeeded(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Name")}{field("category", "Category")}{field("contact", "Contact")}{field("phone", "Phone")}
          {field("email", "Email", "email")}{field("lead_time", "Lead time")}{field("payment_terms", "Payment terms")}
          {field("rating", "Rating (0–5)", "number")}
          <div className="space-y-1"><Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as Supplier["status"] })}>
              <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1 sm:col-span-2"><Label htmlFor="sup-notes">Notes</Label>
            <Textarea id="sup-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={!f.name.trim() || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Suppliers = () => {
  const { member } = useWorkspace();
  // Designers source FF&E, so they add and edit suppliers too. Delete (and blocking) stays with the GM.
  const canEdit = member?.role === "gm" || member?.role === "coordinator" || member?.role === "designer";
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const { data: openCounts } = useSupplierOpenCounts();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const edit = (s: Supplier | null) => { setEditing(s); setOpen(true); };

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      {canEdit && suppliers.length > 0 && <div className="flex justify-end"><Button onClick={() => edit(null)}>Add supplier</Button></div>}
      {suppliers.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-10 text-center space-y-3">
          <p className="text-muted-foreground">No suppliers yet.</p>
          {canEdit && <Button onClick={() => edit(null)}>Add supplier</Button>}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-[var(--radius)] border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/10 text-left text-xs text-muted-foreground">
                <tr><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Contact</th><th className="p-3">Lead time</th><th className="p-3">Payment terms</th><th className="p-3">Rating</th><th className="p-3">Status</th><th className="p-3">Open items</th></tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className={cn("border-t border-border", canEdit && "cursor-pointer hover:bg-muted/10")} onClick={canEdit ? () => edit(s) : undefined}>
                    <td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.category ?? "—"}</td>
                    <td className="p-3">{s.contact ?? "—"}{s.phone && <span className="block text-xs text-muted-foreground">{s.phone}</span>}</td>
                    <td className="p-3">{s.lead_time ?? "—"}</td><td className="p-3">{s.payment_terms ?? "—"}</td>
                    <td className="p-3">{s.rating != null ? `${s.rating}/5` : "—"}</td><td className="p-3"><StatusPill s={s.status} /></td>
                    <td className="p-3">{openCounts?.get(s.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {suppliers.map((s) => (
              <li key={s.id} className="rounded-[var(--radius)] border border-border bg-card p-4 space-y-1">
                <div className="flex items-start justify-between gap-2"><p className="font-medium">{s.name}</p><StatusPill s={s.status} /></div>
                <p className="text-xs text-muted-foreground">{[s.category, s.contact, s.phone].filter(Boolean).join(" · ") || "—"}</p>
                <p className="text-xs">Lead time {s.lead_time ?? "—"} · {s.payment_terms ?? "—"} · {s.rating != null ? `${s.rating}/5` : "Unrated"} · {openCounts?.get(s.id) ?? 0} open items</p>
                {canEdit && <Button size="sm" variant="outline" onClick={() => edit(s)}>Edit</Button>}
              </li>
            ))}
          </ul>
        </>
      )}
      {canEdit && <SupplierDialog supplier={editing} open={open} onOpenChange={setOpen} />}
    </div>
  );
};

export default Suppliers;
