import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMembers } from "./queries";
import { useCreateTask, useToggleTask, type Project, type Task } from "./projectQueries";
import { useWorkspace } from "./WorkspaceProvider";
import { isDue, shortDate, todayISO } from "./format";

const PRIORITIES = ["Low", "Medium", "High"] as const;
type Priority = (typeof PRIORITIES)[number];
const NONE = "__none";

export const isOverdue = (t: Pick<Task, "done" | "due_date">) => !t.done && !!t.due_date && t.due_date < todayISO();

export const TaskRow = ({ task, projectCode }: { task: Task; projectCode?: string }) => {
  const toggle = useToggleTask();
  const { data: members = [] } = useMembers();
  const who = members.find((m) => m.user_id === task.assignee_id)?.full_name;
  const overdue = isOverdue(task);
  return (
    <li className="flex items-start gap-3 py-3">
      <Checkbox
        className="mt-0.5"
        checked={task.done}
        // Drawing tasks follow the uploads on the project; the database refuses a hand tick.
        disabled={!!task.drawing_kind}
        title={task.drawing_kind ? "Closes when the drawing is uploaded to the project" : undefined}
        aria-label={task.drawing_kind ? "Closes on upload" : task.done ? "Mark as not done" : "Mark as done"}
        onCheckedChange={(c) =>
          toggle.mutate({ id: task.id, done: c === true }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update task") })
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cn("break-words text-sm", task.done && "line-through text-muted-foreground")}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {projectCode && <Link to={`/workspace/projects/${projectCode}`} className="text-primary hover:underline">{projectCode}</Link>}
          {task.due_date && <span className={cn(overdue && "text-destructive")}>Due {shortDate(task.due_date)}{overdue && " · overdue"}</span>}
          <span className={cn(task.priority === "High" && "text-destructive")}>{task.priority} priority</span>
          {who && <span>{who}</span>}
        </p>
      </div>
    </li>
  );
};

/** Inline new-task form. Pass `project` to fix it, or `projects` to let the user pick. */
export const NewTaskForm = ({
  project, projects, onDone,
}: { project?: Pick<Project, "id" | "name">; projects?: Pick<Project, "id" | "name" | "code">[]; onDone?: () => void }) => {
  const { member } = useWorkspace();
  const { data: members = [] } = useMembers();
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(project?.id ?? "");
  const [assignee, setAssignee] = useState(member?.user_id ?? "");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");

  const submit = async () => {
    const t = title.trim();
    if (!t) return toast.error("Give the task a title");
    if (t.length > 300) return toast.error("Title is too long");
    const target = project ?? projects?.find((p) => p.id === projectId);
    if (!target || !member) return toast.error("Pick a project");
    try {
      await create.mutateAsync({
        project_id: target.id, title: t, assignee_id: assignee || null, due_date: due || null, priority,
        created_by: member.user_id, actorName: member.full_name, projectName: target.name,
      });
      setTitle(""); setDue(""); setPriority("Medium");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add task");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
      <Input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label="Task title" />
      {!project && (
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="md:w-44" aria-label="Project"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>{(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Select value={assignee || NONE} onValueChange={(v) => setAssignee(v === NONE ? "" : v)}>
        <SelectTrigger className="md:w-40" aria-label="Assignee"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Unassigned</SelectItem>
          {members.filter((m) => m.active).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" className="md:w-40" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
      <div className="flex gap-2">
        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger className="flex-1 md:w-28" aria-label="Priority"><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={submit} disabled={create.isPending}>Add</Button>
      </div>
    </div>
  );
};

export const openTaskCount = (tasks: Task[]) => tasks.filter((t) => !t.done).length;
export const dueTaskCount = (tasks: Task[]) => tasks.filter((t) => !t.done && isDue(t.due_date)).length;
