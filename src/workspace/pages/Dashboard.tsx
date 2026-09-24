import { useWorkspace } from "../WorkspaceProvider";

const STATS = ["Active leads", "Live projects", "Tasks due", "Awaiting design"];

const Dashboard = () => {
  const { member } = useWorkspace();
  const first = member?.full_name.split(" ")[0] ?? "";
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl">Welcome, {first}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s} className="rounded-[var(--radius)] border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s}</p>
            <p className="mt-2 font-heading text-3xl">0</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
