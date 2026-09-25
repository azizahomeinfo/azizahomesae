import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "../WorkspaceProvider";
import { useBriefList, useMembers, type BriefListRow } from "../queries";
import { BRIEF_LABEL, BRIEF_STATUSES, type BriefStatus } from "../briefWorkflow";
import { BriefActionBar } from "../useBriefActions";
import BriefStatusPill from "../BriefStatusPill";
import { aed, shortDate } from "../format";
import { Button } from "@/components/ui/button";
import DesignPackage from "../DesignPackage";
import DesignStatusPill from "../DesignStatusPill";
import { useDesignStatuses } from "../designQueries";
import type { DesignStatus } from "../designSchema";

const DESIGN_STAGES: BriefStatus[] = ["Assigned", "In Design", "Revision Requested", "Design Ready", "Design Approved"];

/** Design status chip + button that opens the design package for a lead. */
const DesignLink = ({ leadId, briefStatus }: { leadId: string; briefStatus: BriefStatus }) => {
  const { data: statuses } = useDesignStatuses();
  const [open, setOpen] = useState(false);
  if (!DESIGN_STAGES.includes(briefStatus)) return null;
  const d = statuses?.get(leadId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {d ? <DesignStatusPill status={d.status as DesignStatus} version={d.version} /> : <span className="text-xs text-muted-foreground">No design yet</span>}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Design package</Button>
      <DesignPackage leadId={leadId} open={open} onOpenChange={setOpen} />
    </div>
  );
};

interface CardData {
  leadId: string; name: string; property: string | null; unitType: string | null;
  budget: number | null; targetDate: string | null; status: BriefStatus;
}

const BriefCard = ({ d }: { d: CardData }) => (
  <Link
    to={`/workspace/leads/${d.leadId}`}
    className="block rounded-[var(--radius)] border border-border bg-card p-4 space-y-2 hover:border-primary/50"
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-foreground min-w-0 truncate">{d.name}</p>
      <BriefStatusPill status={d.status} />
    </div>
    <p className="text-sm text-muted-foreground truncate">{[d.property, d.unitType].filter(Boolean).join(" · ") || "—"}</p>
    <div className="flex justify-between text-sm">
      <span>{aed(d.budget)}</span>
      <span className="text-muted-foreground">Target {shortDate(d.targetDate)}</span>
    </div>
  </Link>
);

const Group = ({ title, empty, children, count }: { title: string; empty: string; children: React.ReactNode; count: number }) => (
  <section className="space-y-3">
    <h2 className="font-heading uppercase text-xl tracking-wide">{title} <span className="text-muted-foreground text-base">({count})</span></h2>
    {count === 0 ? (
      <div className="rounded-[var(--radius)] border border-border p-8 text-center text-muted-foreground">{empty}</div>
    ) : (
      children
    )}
  </section>
);

const fromRow = (b: BriefListRow): CardData => ({
  leadId: b.lead_id, name: b.leads?.name ?? "—", property: b.leads?.property ?? null, unitType: b.leads?.unit_type ?? null,
  budget: b.leads?.budget ?? null, targetDate: b.leads?.target_date ?? null, status: b.status as BriefStatus,
});

/** Designers see only briefs the GM assigned to them — there is no unassigned queue for them. */
const DesignerView = () => {
  const { member } = useWorkspace();
  const { data: list = [], isLoading: lLoading, error: lErr } = useBriefList();
  const mine = list.filter((b) => b.designer_id === member?.user_id && b.status !== "Design Approved");

  if (lErr) return <p className="text-destructive">{(lErr as Error).message}</p>;
  if (lLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <Group title="My briefs" empty="Nothing assigned to you." count={mine.length}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((b) => (
            <div key={b.id} className="space-y-2">
              <BriefCard d={fromRow(b)} />
              <DesignLink leadId={b.lead_id} briefStatus={b.status as BriefStatus} />
            </div>
          ))}
        </div>
      </Group>
    </div>
  );
};

const GmView = () => {
  const { data: list = [], isLoading, error } = useBriefList();
  const { data: members = [] } = useMembers();
  const nameOf = useMemo(() => new Map(members.map((m) => [m.user_id, m.full_name])), [members]);

  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (list.length === 0) {
    return <div className="rounded-[var(--radius)] border border-border p-8 text-center text-muted-foreground">No briefs waiting.</div>;
  }

  const waiting = list.filter((b) => b.status === "Submitted").length;
  return (
    <div className="space-y-8">
      <p className={waiting ? "rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground" : "text-sm text-muted-foreground"}>
        {waiting ? `${waiting} brief${waiting === 1 ? "" : "s"} waiting for a designer — assign below.` : "No briefs waiting for a designer."}
      </p>
      {/* The assignment queue leads, oldest first; everything else follows in workflow order. */}
      {(["Submitted", ...BRIEF_STATUSES.filter((x) => x !== "Submitted")] as BriefStatus[]).map((st) => {
        const rows = list.filter((b) => b.status === st);
        if (st === "Submitted") rows.sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));
        if (!rows.length) return null;
        return (
          <section key={st} className="space-y-3">
            <h2 className="font-heading uppercase text-xl tracking-wide">{BRIEF_LABEL[st]} <span className="text-muted-foreground text-base">({rows.length})</span></h2>
            <div className="hidden md:block rounded-[var(--radius)] border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead><TableHead>Property</TableHead><TableHead>Budget</TableHead>
                    <TableHead>Target</TableHead><TableHead>Owner</TableHead><TableHead>Designer</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link to={`/workspace/leads/${b.lead_id}`} className="hover:text-primary">{b.leads?.name ?? "—"}</Link>
                      </TableCell>
                      <TableCell>{[b.leads?.property, b.leads?.unit_type].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{aed(b.leads?.budget)}</TableCell>
                      <TableCell className="whitespace-nowrap">{shortDate(b.leads?.target_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">{(b.leads?.sales_id && nameOf.get(b.leads.sales_id)) || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{(b.designer_id && nameOf.get(b.designer_id)) || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end"><DesignLink leadId={b.lead_id} briefStatus={st} /></div>
                        {st === "Submitted" && (
                          <BriefActionBar
                            size="sm"
                            brief={{ id: b.id, leadId: b.lead_id, leadName: b.leads?.name ?? "", status: st, designerId: b.designer_id, salesId: b.leads?.sales_id ?? null, driveUrl: b.leads?.drive_url ?? null }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-3">
              {rows.map((b) => (
                <div key={b.id} className="space-y-2">
                  <BriefCard d={fromRow(b)} />
                  <DesignLink leadId={b.lead_id} briefStatus={st} />
                  <p className="px-1 text-xs text-muted-foreground">
                    Owner: {(b.leads?.sales_id && nameOf.get(b.leads.sales_id)) || "—"} · Designer: {(b.designer_id && nameOf.get(b.designer_id)) || "—"}
                  </p>
                  {st === "Submitted" && (
                    <BriefActionBar
                      size="sm"
                      brief={{ id: b.id, leadId: b.lead_id, leadName: b.leads?.name ?? "", status: st, designerId: b.designer_id, salesId: b.leads?.sales_id ?? null, driveUrl: b.leads?.drive_url ?? null }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const Briefs = () => {
  const { member } = useWorkspace();
  return member?.role === "gm" ? <GmView /> : <DesignerView />;
};

export default Briefs;
