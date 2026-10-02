import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMembers } from "./queries";
import { useAssignDesigner } from "./projectQueries";
import { useWorkspace } from "./WorkspaceProvider";

const NONE = "__none";

/** Always-available designer assignment (any lead/brief status). GM picks; the DB function also refuses non-GMs. */
const AssignDesigner = ({ leadId, projectId, designerId }: { leadId?: string; projectId?: string; designerId: string | null }) => {
  const { member } = useWorkspace();
  const { data: members = [] } = useMembers();
  const assign = useAssignDesigner();
  const isGm = member?.role === "gm";
  const designers = members.filter((m) => m.role === "designer" && (m.active || m.user_id === designerId));
  const current = members.find((m) => m.user_id === designerId)?.full_name;
  const missing = !designerId;

  const set = (v: string) => {
    const next = v === NONE ? null : v;
    if (next === designerId) return;
    assign.mutate({ leadId, projectId, designerId: next }, {
      onSuccess: () => toast.success(next ? `Designer set to ${members.find((m) => m.user_id === next)?.full_name ?? "designer"}` : "Designer cleared"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign the designer"),
    });
  };

  return (
    <section className={cn("rounded-[var(--radius)] border p-4 md:p-6 space-y-2",
      missing ? "border-destructive/60 bg-destructive/5" : "border-border bg-card")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Designer</p>
          {missing ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden /> No designer assigned — design and drawings can't start.
            </p>
          ) : <p className="text-sm text-foreground">{current ?? "Assigned"}</p>}
        </div>
        {isGm ? (
          <Select value={designerId ?? NONE} onValueChange={set} disabled={assign.isPending}>
            <SelectTrigger className="sm:w-60" aria-label="Assign designer"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No designer assigned</SelectItem>
              {designers.map((d) => <SelectItem key={d.user_id} value={d.user_id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : missing && <span className="text-xs text-muted-foreground">The GM assigns the designer.</span>}
      </div>
    </section>
  );
};

export default AssignDesigner;
