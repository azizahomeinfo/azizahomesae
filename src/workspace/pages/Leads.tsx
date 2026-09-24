import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "../WorkspaceProvider";
import { useLeads, useMembers, type Lead } from "../queries";
import { isClosed } from "../constants";
import { aed, isDue, shortDate } from "../format";
import StatusPill from "../StatusPill";
import LeadForm from "../LeadForm";

type Tab = "active" | "due" | "won" | "lost" | "all";
const ALL = "__all";

export const FollowUp = ({ lead }: { lead: Lead }) => {
  const overdue = !isClosed(lead.status) && isDue(lead.next_follow);
  return (
    <span className={overdue ? "text-destructive" : undefined}>
      {shortDate(lead.next_follow)}
      {overdue && <span className="ml-1.5 text-[10px] uppercase tracking-wider">Overdue</span>}
    </span>
  );
};

const Leads = () => {
  const navigate = useNavigate();
  const { member } = useWorkspace();
  const isGm = member?.role === "gm";
  const canCreate = isGm || member?.role === "sales";
  const { data: leads = [], isLoading, error } = useLeads();
  const { data: members = [] } = useMembers();
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const nameOf = useMemo(() => new Map(members.map((m) => [m.user_id, m.full_name])), [members]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (tab === "active" && isClosed(l.status)) return false;
      if (tab === "due" && (isClosed(l.status) || !isDue(l.next_follow))) return false;
      if (tab === "won" && l.status !== "Won") return false;
      if (tab === "lost" && l.status !== "Lost") return false;
      if (isGm && owner !== ALL && l.sales_id !== owner) return false;
      if (needle && ![l.name, l.property, l.ref].some((v) => v?.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [leads, tab, q, owner, isGm]);

  const open = (id: string) => navigate(`/workspace/leads/${id}`);
  const newBtn = canCreate && (
    <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" />New lead</Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="flex w-full overflow-x-auto justify-start lg:w-auto">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="due">Follow-up due</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, property, ref" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isGm && (
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All owners</SelectItem>
                {members.filter((m) => m.role === "sales" || m.role === "gm").map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {newBtn}
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-border p-6 text-destructive">{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border p-10 text-center space-y-4">
          <p className="text-muted-foreground">No leads yet.</p>
          {newBtn}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">No leads match these filters.</div>
      ) : (
        <>
          <div className="hidden md:block rounded-[var(--radius)] border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead><TableHead>Client</TableHead><TableHead>Property</TableHead>
                  <TableHead>Area</TableHead><TableHead>Budget</TableHead><TableHead>Status</TableHead>
                  <TableHead>Next follow-up</TableHead><TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => open(l.id)}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{l.ref}</TableCell>
                    <TableCell className="whitespace-nowrap">{l.name}</TableCell>
                    <TableCell>{l.property ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{l.location ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{aed(l.budget)}</TableCell>
                    <TableCell><StatusPill status={l.status} /></TableCell>
                    <TableCell className="whitespace-nowrap"><FollowUp lead={l} /></TableCell>
                    <TableCell className="whitespace-nowrap">{(l.sales_id && nameOf.get(l.sales_id)) || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {rows.map((l) => (
              <button
                key={l.id}
                onClick={() => open(l.id)}
                className="w-full text-left rounded-[var(--radius)] border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.ref} · {l.location ?? "—"}</p>
                  </div>
                  <StatusPill status={l.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{l.property ?? "—"}</span>
                  <span className="text-right">{aed(l.budget)}</span>
                  <span className="text-muted-foreground truncate">{(l.sales_id && nameOf.get(l.sales_id)) || "—"}</span>
                  <span className="text-right"><FollowUp lead={l} /></span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <LeadForm open={formOpen} onOpenChange={setFormOpen} onSaved={(l) => open(l.id)} />
    </div>
  );
};

export default Leads;
