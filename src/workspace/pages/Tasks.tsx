import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../WorkspaceProvider";
import { useMyTasks, useProjects, type Task } from "../projectQueries";
import { NewTaskForm, TaskRow, isOverdue } from "../TaskList";

const FILTERS = ["Open", "Overdue", "Done", "All"] as const;
type Filter = (typeof FILTERS)[number];
const match = (f: Filter, t: Task) =>
  f === "All" ? true : f === "Done" ? t.done : f === "Overdue" ? isOverdue(t) : !t.done;

const Tasks = () => {
  const { member } = useWorkspace();
  const { data: tasks = [], isLoading, error } = useMyTasks(member?.user_id);
  const { data: projects = [] } = useProjects();
  const [filter, setFilter] = useState<Filter>("Open");
  const [adding, setAdding] = useState(false);

  const list = tasks.filter((t) => match(filter, t));
  const groups = new Map<string, Task[]>();
  for (const t of list) {
    const k = t.project_id ?? "none";
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const proj = (id: string) => projects.find((p) => p.id === id);
  const openProjects = projects.filter((p) => p.stage !== "Closed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading uppercase text-2xl tracking-wide">My tasks</h2>
        <Button onClick={() => setAdding((a) => !a)} variant={adding ? "outline" : "default"}>{adding ? "Close" : "New task"}</Button>
      </div>
      {adding && (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          {openProjects.length ? <NewTaskForm projects={openProjects} onDone={() => setAdding(false)} /> : <p className="text-sm text-muted-foreground">No projects you can add tasks to.</p>}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs",
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {f} <span className="opacity-70">{tasks.filter((t) => match(f, t)).length}</span>
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-destructive">{(error as Error).message}</p>
      ) : list.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">Nothing here.</div>
      ) : (
        [...groups.entries()].map(([pid, items]) => {
          const p = proj(pid);
          return (
            <section key={pid} className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6">
              <h3 className="text-sm">{p ? <><span className="text-primary">{p.code}</span> · {p.name}</> : "Lead tasks"}</h3>
              <ul className="divide-y divide-border">{items.map((t) => <TaskRow key={t.id} task={t} projectCode={p?.code} />)}</ul>
            </section>
          );
        })
      )}
    </div>
  );
};

export default Tasks;
