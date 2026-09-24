import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMembers } from "../queries";
import { useProjects, type Project } from "../projectQueries";
import { PROJECT_STAGES, RiskDot, StagePill } from "../projectConstants";
import { initials, shortDate, todayISO } from "../format";

type Filter = "Active" | "All" | (typeof PROJECT_STAGES)[number];
const FILTERS: Filter[] = ["Active", "All", ...PROJECT_STAGES];

export const handoverLate = (p: Pick<Project, "handover_date" | "stage">) =>
  !!p.handover_date && p.stage !== "Closed" && p.handover_date < todayISO();

export const Team = ({ ids }: { ids: (string | null)[] }) => {
  const { data: members = [] } = useMembers();
  const people = ids.filter(Boolean).map((id) => members.find((m) => m.user_id === id)).filter(Boolean);
  if (!people.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex -space-x-1.5">
      {people.map((m) => (
        <span key={m!.user_id} title={`${m!.full_name} (${m!.role})`}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground">
          {initials(m!.full_name)}
        </span>
      ))}
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, error } = useProjects();
  const [filter, setFilter] = useState<Filter>("Active");

  const list = projects.filter((p) =>
    filter === "All" ? true : filter === "Active" ? p.stage !== "Closed" : p.stage === filter,
  );
  const count = (f: Filter) =>
    projects.filter((p) => (f === "All" ? true : f === "Active" ? p.stage !== "Closed" : p.stage === f)).length;

  return (
    <div className="space-y-4">
      <h2 className="font-heading uppercase text-2xl tracking-wide">Projects</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs",
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {f} <span className="opacity-70">{count(f)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-destructive">{(error as Error).message}</p>
      ) : list.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">
          {projects.length === 0 ? "No projects yet. Win a lead and convert it." : "No projects at this stage."}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  {["Code", "Project", "Client", "Stage", "Handover date", "Risk", "Payment", "Team"].map((h) => (
                    <th key={h} className="px-4 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/workspace/projects/${p.code}`)}>
                    <td className="px-4 py-3"><Link to={`/workspace/projects/${p.code}`} className="text-primary">{p.code}</Link></td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.client ?? "—"}</td>
                    <td className="px-4 py-3"><StagePill stage={p.stage} /></td>
                    <td className={cn("px-4 py-3 whitespace-nowrap", handoverLate(p) && "text-destructive")}>{shortDate(p.handover_date)}</td>
                    <td className="px-4 py-3"><RiskDot risk={p.risk} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.pay_status}</td>
                    <td className="px-4 py-3"><Team ids={[p.sales_id, p.designer_id, p.coordinator_id]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <Link to={`/workspace/projects/${p.code}`} className="block rounded-[var(--radius)] border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-primary">{p.code}</p>
                      <p className="truncate">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.client ?? "—"}</p>
                    </div>
                    <StagePill stage={p.stage} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className={cn(handoverLate(p) ? "text-destructive" : "text-muted-foreground")}>Handover {shortDate(p.handover_date)}</span>
                    <RiskDot risk={p.risk} />
                    <span className="text-muted-foreground">{p.pay_status}</span>
                  </div>
                  <Team ids={[p.sales_id, p.designer_id, p.coordinator_id]} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Projects;
