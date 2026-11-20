import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { hasRole } from "./access";
import { useMembers } from "./queries";
import { useAssignCoordinator } from "./projectQueries";
import { useWorkspace } from "./WorkspaceProvider";

const NONE = "__none";

/**
 * Who buys and runs this site. The GM picks; ws_assign_project_coordinator refuses everyone else and
 * notifies the person chosen. Anyone who can do a coordinator job is listed — a designer with
 * second_role "coordinator" (Suha) included, which is the same test the database applies.
 */
const AssignCoordinator = ({ projectId, coordinatorId }: { projectId: string; coordinatorId: string | null }) => {
  const { member } = useWorkspace();
  const { data: members = [] } = useMembers();
  const assign = useAssignCoordinator();
  const isGm = member?.role === "gm";
  const options = members.filter((m) => hasRole(m, "coordinator") && (m.active || m.user_id === coordinatorId));
  const current = members.find((m) => m.user_id === coordinatorId)?.full_name;
  const missing = !coordinatorId;

  const set = (v: string) => {
    const next = v === NONE ? null : v;
    if (next === coordinatorId) return;
    assign.mutate({ projectId, coordinatorId: next }, {
      onSuccess: () => toast.success(next ? `Coordinator set to ${members.find((m) => m.user_id === next)?.full_name ?? "coordinator"}` : "Coordinator cleared"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign the coordinator"),
    });
  };

  return (
    <section className={cn("rounded-[var(--radius)] border p-4 md:p-6 space-y-2",
      missing ? "border-destructive/60 bg-destructive/5" : "border-border bg-card")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Coordinator</p>
          {missing ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden /> No coordinator assigned — nobody is buying or running this site.
            </p>
          ) : <p className="text-sm text-foreground">{current ?? "Assigned"}</p>}
        </div>
        {isGm ? (
          <Select value={coordinatorId ?? NONE} onValueChange={set} disabled={assign.isPending}>
            <SelectTrigger className="sm:w-60" aria-label="Assign coordinator"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No coordinator assigned</SelectItem>
              {options.map((c) => <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <span className="text-xs text-muted-foreground">The GM assigns the coordinator.</span>}
      </div>
    </section>
  );
};

export default AssignCoordinator;
