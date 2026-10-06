import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { pKeys, useUpdateProject, type Project, type Task } from "./projectQueries";
import { shortDate } from "./format";
import { calendarDays, daysBefore, dubaiDay, noRectificationDay, taskCountdown } from "./countdownDates";

const ORDERING = ["order_cab_furn", "curtains", "order_drawing", "order_online_appl", "pickup_dragon", "order_household", "order_wallpaper", "switches"];
const ON_SITE = ["wallwork", "visit_walls", "hanging_drawings", "delivered", "handyman", "wallpaper", "operations", "qc"];
const useClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  return now;
};

export const ProjectSiteDetails = ({ project }: { project: Project }) => {
  const now = useClock();
  const update = useUpdateProject();
  const qc = useQueryClient();
  const [contractor, setContractor] = useState(project.contractor_in ?? "");
  useEffect(() => setContractor(project.contractor_in ?? ""), [project.contractor_in]);
  const days = project.handover_date ? calendarDays(dubaiDay(now), project.handover_date) : null;
  const handover = days === null ? "" : days < 0 ? `handover overdue by ${-days} ${days === -1 ? "day" : "days"}` : days === 0 ? "handover today" : days === 1 ? "handover tomorrow" : `handover in ${days} days`;
  const save = async () => {
    try {
      await update.mutateAsync({ id: project.id, values: { contractor_in: contractor || null } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: pKeys.project(project.code) }),
        qc.invalidateQueries({ queryKey: pKeys.tasks(project.id) }),
        qc.invalidateQueries({ queryKey: ["ws", "my-tasks"] }),
      ]);
      toast.success("Contractor date saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save contractor date"); }
  };
  return (
    <section aria-label="Delivery address and deadlines" className="space-y-4 border-y border-border py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-medium">Delivery address</h3>
          <p className="break-words text-sm text-muted-foreground">{[project.property, project.unit, project.location].filter(Boolean).join(" · ") || "Address not set"}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Handover deadline</h3>
          <p className="text-sm">{shortDate(project.handover_date)}</p>
          {handover && <p className={cn("text-sm", days !== null && days < 0 ? "text-destructive" : days !== null && days <= 1 ? "text-warning" : "text-muted-foreground")}>{handover}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contractor-in">Contractor goes in</Label>
        <p id="contractor-in-help" className="max-w-2xl text-sm text-muted-foreground">Set this once the factory confirms the cabinetry date — the contractor can only start the walls when the cabinetry is in. The switch run follows this date; until it is set the system assumes day 8.</p>
        <div className="flex flex-wrap gap-2">
          <Input id="contractor-in" type="date" aria-describedby="contractor-in-help" value={contractor} onChange={(e) => setContractor(e.target.value)} className="w-full sm:w-44" disabled={update.isPending} />
          <Button onClick={save} disabled={update.isPending || contractor === (project.contractor_in ?? "")}>{update.isPending ? "Saving…" : "Save"}</Button>
          {contractor && <Button variant="outline" disabled={update.isPending} onClick={() => setContractor("")}>Clear</Button>}
        </div>
      </div>
    </section>
  );
};

export const CoordinatorCountdown = ({ project, tasks, loading, error }: { project: Project; tasks: Task[]; loading: boolean; error: unknown }) => {
  const now = useClock();
  const operations = tasks.find((t) => t.auto_kind === "operations");
  const warning = noRectificationDay(operations?.due_at ?? null, project.handover_date);
  const groups = [["Ordering", ORDERING], ["On site", ON_SITE]] as const;
  return (
    <section aria-label="Project countdown" className="space-y-4">
      <h3 className="text-lg font-medium">Your countdown</h3>
      {warning && operations?.due_at && project.handover_date && <p role="alert" className="break-words text-sm text-warning">Operations clean is due {shortDate(dubaiDay(new Date(operations.due_at)))}; handover is {shortDate(project.handover_date)}. The clean must finish by {shortDate(daysBefore(project.handover_date, 2))} — there is no day left to rectify.</p>}
      {loading ? <p className="text-sm text-muted-foreground">Loading countdown…</p> : error ? <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not load countdown"}</p> : groups.map(([label, kinds]) => {
        const list = tasks.filter((t) => t.auto_kind && kinds.includes(t.auto_kind)).sort((a, b) => (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity) || a.title.localeCompare(b.title));
        return <div key={label} className="space-y-2">
          <h4 className="text-sm font-medium">{label}</h4>
          {!list.length ? <p className="text-sm text-muted-foreground">No {label.toLowerCase()} deadlines yet.</p> : <ul className="divide-y divide-border">{list.map((task) => {
            const countdown = task.due_at ? taskCountdown(task.due_at, task.done, now) : { text: task.done ? "Done" : "No deadline", tone: "muted" };
            return <li key={task.id} className={cn("flex items-start gap-3 py-3", task.done && "opacity-50")}>
              {task.done ? <Check aria-label="Completed" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1 space-y-1">
                <p className={cn("break-words text-sm", task.done && "line-through")}>{task.title}</p>
                <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                  {task.due_at && <span>Due {shortDate(dubaiDay(new Date(task.due_at)))} (Dubai)</span>}
                  <span className={cn(countdown.tone === "overdue" ? "text-destructive" : countdown.tone === "soon" ? "text-warning" : "text-muted-foreground")}>{countdown.text}</span>
                </p>
                {task.detail && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.detail}</p>}
              </div>
            </li>;
          })}</ul>}
        </div>;
      })}
    </section>
  );
};