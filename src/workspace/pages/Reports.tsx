import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-ssr";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../WorkspaceProvider";
import { useLeads } from "../queries";
import { useProjects } from "../projectQueries";
import { LEAD_STATUSES } from "../constants";
import { PROJECT_STAGES } from "../projectConstants";
import { aed, todayISO } from "../format";

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-4">
    <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</h3>
    {children}
  </section>
);
const Empty = () => <p className="text-sm text-muted-foreground">No data yet</p>;
const Bar = ({ label, value, max, right, tone = "bg-primary" }: { label: string; value: number; max: number; right: ReactNode; tone?: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between gap-2 text-sm"><span>{label}</span><span className="text-muted-foreground">{right}</span></div>
    <div className="h-2 rounded-full bg-muted/20"><div className={cn("h-2 rounded-full", tone)} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
  </div>
);
const Stat = ({ k, v, className }: { k: string; v: ReactNode; className?: string }) => (
  <div><p className="text-xs text-muted-foreground">{k}</p><p className={cn("text-xl", className)}>{v}</p></div>
);

const DAY = 86400000;

const Reports = () => {
  const { member } = useWorkspace();
  const isGm = member?.role === "gm";
  const { data: leads = [], isLoading: l1 } = useLeads();
  const { data: projects = [], isLoading: l2 } = useProjects();
  const { data: approvedCr = 0 } = useQuery({
    queryKey: ["ws", "report-crs"],
    enabled: isGm,
    queryFn: async () => {
      const { data, error } = await supabase.from("change_requests").select("cost_delta").eq("status", "Approved");
      if (error) throw new Error(error.message);
      return (data ?? []).reduce((s, r) => s + Number(r.cost_delta), 0);
    },
  });
  if (l1 || l2) return <p className="text-muted-foreground">Loading…</p>;

  const pipe = LEAD_STATUSES.map((s) => {
    const rows = leads.filter((l) => l.status === s);
    return { s, n: rows.length, budget: rows.reduce((t, l) => t + Number(l.budget ?? 0), 0) };
  });
  const maxN = Math.max(...pipe.map((p) => p.n), 0);

  // closed_at is stamped by the database the moment a lead is won or lost; leads closed before
  // that shipped have a null closed_at and are excluded rather than counted as day zero.
  const closedAll = leads.filter((l) => l.status === "Won" || l.status === "Lost");
  const unstamped = closedAll.filter((l) => !l.closed_at).length;
  const since = Date.now() - 90 * DAY;
  const closed = closedAll.filter((l) => l.closed_at && new Date(l.closed_at).getTime() >= since);
  const won = closed.filter((l) => l.status === "Won");
  const avgDays = won.length ? Math.round(won.reduce((t, l) => t + (new Date(l.closed_at!).getTime() - new Date(l.created_at).getTime()) / DAY, 0) / won.length) : null;

  const byStage = PROJECT_STAGES.map((s) => ({ s, n: projects.filter((p) => p.stage === s).length }));
  const maxStage = Math.max(...byStage.map((b) => b.n), 0);
  const active = projects.filter((p) => p.stage !== "Closed");
  const red = active.filter((p) => p.risk === "Red").length;
  const yellow = active.filter((p) => p.risk === "Yellow").length;
  const late = active.filter((p) => p.handover_date && p.handover_date < todayISO()).length;
  const value = active.reduce((t, p) => t + Number(p.value ?? 0), 0);
  const received = active.reduce((t, p) => t + Number(p.received ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Pipeline · all leads by status">
        {leads.length === 0 ? <Empty /> : pipe.map((p) => (
          <Bar key={p.s} label={p.s} value={p.n} max={maxN} tone={p.s === "Lost" ? "bg-destructive" : "bg-primary"} right={`${p.n} · ${aed(p.budget)}`} />
        ))}
      </Block>
      <Block title="Conversion · last 90 days">
        {closed.length === 0 ? <Empty /> : (
          <div className="grid grid-cols-2 gap-4">
            <Stat k="Won ÷ closed" v={`${Math.round((won.length / closed.length) * 100)}%`} />
            <Stat k="Won / lost" v={`${won.length} / ${closed.length - won.length}`} />
            <Stat k="Avg days lead → won" v={avgDays ?? "—"} />
          </div>
        )}
        {unstamped > 0 && (
          <p className="text-xs text-muted-foreground">Leads closed before 24 September 2026 are not included — their close date was not recorded.</p>
        )}
      </Block>
      <Block title="Delivery · all projects">
        {projects.length === 0 ? <Empty /> : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Stat k="At risk (Red)" v={red} className={cn(red > 0 && "text-destructive")} />
              <Stat k="Watch (Yellow)" v={yellow} />
              <Stat k="Past handover" v={late} className={cn(late > 0 && "text-destructive")} />
            </div>
            <div className="space-y-2">{byStage.filter((b) => b.n > 0).map((b) => <Bar key={b.s} label={b.s} value={b.n} max={maxStage} right={b.n} />)}</div>
          </>
        )}
      </Block>
      {isGm && (
        <Block title="Commercials · active projects">
          {active.length === 0 ? <Empty /> : (
            <div className="grid grid-cols-2 gap-4">
              <Stat k="Contract value" v={aed(value)} />
              <Stat k="Received" v={aed(received)} />
              <Stat k="Outstanding" v={aed(value - received)} className={cn(value - received > 0 && "text-destructive")} />
              <Stat k="Approved change requests (all projects)" v={aed(approvedCr)} />
            </div>
          )}
        </Block>
      )}
    </div>
  );
};

export default Reports;
