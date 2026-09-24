import { useCallback, useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase-ssr";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "../WorkspaceProvider";
import { ROLE_LABEL, type WorkspaceRole } from "../access";

type Member = Database["public"]["Tables"]["workspace_members"]["Row"];
type Invite = Database["public"]["Tables"]["workspace_invites"]["Row"];
const ROLES = Object.keys(ROLE_LABEL) as WorkspaceRole[];

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(320),
  full_name: z.string().trim().min(1, "Name is required").max(200),
  role: z.enum(["gm", "sales", "designer", "coordinator"]),
  title: z.string().trim().max(120).optional(),
});

const RoleSelect = ({ value, onChange, disabled }: { value: WorkspaceRole; onChange: (r: WorkspaceRole) => void; disabled?: boolean }) => (
  <Select value={value} onValueChange={(v) => onChange(v as WorkspaceRole)} disabled={disabled}>
    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
    <SelectContent>
      {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
    </SelectContent>
  </Select>
);

const Settings = () => {
  const { member: me } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [form, setForm] = useState({ email: "", full_name: "", role: "sales" as WorkspaceRole, title: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      supabase.from("workspace_members").select("user_id, email, full_name, role, title, active, is_demo, created_at").order("full_name"),
      supabase.from("workspace_invites").select("email, full_name, role, title, invited_by, created_at").order("created_at", { ascending: false }),
    ]);
    if (m.error) toast.error(m.error.message); else setMembers(m.data);
    if (i.error) toast.error(i.error.message); else setInvites(i.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateMember = async (id: string, patch: Partial<Pick<Member, "active" | "role">>) => {
    const { error } = await supabase.from("workspace_members").update(patch).eq("user_id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  const addInvite = async (e: FormEvent) => {
    e.preventDefault();
    const r = inviteSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.errors[0].message);
    setBusy(true);
    const { error } = await supabase.from("workspace_invites").insert({
      email: r.data.email,
      full_name: r.data.full_name,
      role: r.data.role,
      title: r.data.title || null,
      invited_by: me?.user_id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Invite added");
    setForm({ email: "", full_name: "", role: "sales", title: "" });
    load();
  };

  const deleteInvite = async (email: string) => {
    const { error } = await supabase.from("workspace_invites").delete().eq("email", email);
    if (error) toast.error(error.message); else load();
  };

  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const pending = invites.filter((i) => !memberEmails.has(i.email.toLowerCase()));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-heading uppercase text-xl tracking-wide">Team</h2>
        <div className="rounded-[var(--radius)] border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                <TableHead>Title</TableHead><TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const self = m.user_id === me?.user_id;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell className="whitespace-nowrap">{m.full_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.email}</TableCell>
                    <TableCell><RoleSelect value={m.role as WorkspaceRole} disabled={self} onChange={(role) => updateMember(m.user_id, { role })} /></TableCell>
                    <TableCell className="whitespace-nowrap">{m.title ?? "—"}</TableCell>
                    <TableCell><Switch checked={m.active} disabled={self} onCheckedChange={(active) => updateMember(m.user_id, { active })} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading uppercase text-xl tracking-wide">Invites</h2>
        <p className="text-sm text-muted-foreground">
          Add someone here, then ask them to sign up at /workspace with that exact email address. Their role is applied automatically.
        </p>
        <form onSubmit={addInvite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="space-y-2"><Label htmlFor="inv-email">Email</Label>
            <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="inv-name">Full name</Label>
            <Input id="inv-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Role</Label>
            <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} /></div>
          <div className="space-y-2"><Label htmlFor="inv-title">Title</Label>
            <Input id="inv-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <Button type="submit" disabled={busy}>Add invite</Button>
        </form>
        <div className="rounded-[var(--radius)] border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Title</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending invites.</TableCell></TableRow>
              )}
              {pending.map((i) => (
                <TableRow key={i.email}>
                  <TableCell className="whitespace-nowrap">{i.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{i.full_name}</TableCell>
                  <TableCell>{ROLE_LABEL[i.role as WorkspaceRole]}</TableCell>
                  <TableCell>{i.title ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Delete invite for ${i.email}`} onClick={() => deleteInvite(i.email)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default Settings;
