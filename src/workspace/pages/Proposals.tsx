import { Link } from "react-router-dom";
import { aed, shortDate } from "../format";
import { ProposalPill } from "../ProposalDoc";
import { useAcceptedLeads, useProposalList, type ProposalStatus } from "../proposalQueries";

const ORDER: ProposalStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];

const Proposals = () => {
  const { data: rows = [], isLoading, error } = useProposalList();
  const { data: accepted = [] } = useAcceptedLeads();
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  const withProposal = new Set(rows.map((r) => r.lead_id));
  const ready = [...new Map(accepted.filter((a) => !withProposal.has(a.lead_id)).map((a) => [a.lead_id, a])).values()];

  return (
    <div className="space-y-6">
      {ready.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Design accepted · ready for a proposal</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ready.map((a) => (
              <li key={a.lead_id}>
                <Link to={`/workspace/proposals/${a.lead_id}`} className="block rounded-[var(--radius)] border border-dashed border-border p-3 hover:border-primary">
                  <p className="text-sm font-medium">{a.leads?.name ?? "Lead"}</p>
                  <p className="text-xs text-muted-foreground">{a.leads?.property ?? "—"} · design V{a.version}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {rows.length === 0 && ready.length === 0 && (
        <p className="rounded-[var(--radius)] border border-dashed border-border p-10 text-center text-muted-foreground">No proposals yet. Accept a design package to generate one.</p>
      )}
      {ORDER.map((s) => {
        const list = rows.filter((r) => r.status === s);
        if (!list.length) return null;
        return (
          <section key={s} className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{s} · {list.length}</h3>
            <ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
              {list.map((r) => (
                <li key={r.id}>
                  <Link to={`/workspace/proposals/${r.lead_id}`} className="flex flex-col gap-1 p-3 hover:bg-muted/10 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{r.leads?.name ?? "Lead"}</p>
                      <p className="text-xs text-muted-foreground">{[r.leads?.property, r.leads?.unit_type].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    <span className="text-xs">V{r.version}</span>
                    <span className="text-sm">{aed(r.total)}</span>
                    <span className="text-xs text-muted-foreground">{shortDate(r.created_at)}</span>
                    <ProposalPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default Proposals;
