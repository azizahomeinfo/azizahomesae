import { Link } from "react-router-dom";
import { useBriefList } from "./queries";
import { BriefActionBar } from "./useBriefActions";

/** "3 days" / "5 hours" since the brief was submitted. */
const waited = (iso: string | null) => {
  if (!iso) return "—";
  const h = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (h < 1) return "under an hour";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
};

/** GM-only: submitted briefs waiting for a designer, oldest first, with the assign control inline. */
export const useAssignQueue = (enabled: boolean) => {
  const { data = [], isLoading } = useBriefList();
  const rows = enabled
    ? data.filter((b) => b.status === "Submitted").sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""))
    : [];
  return { rows, isLoading };
};

const AssignQueue = ({ rows }: { rows: ReturnType<typeof useAssignQueue>["rows"] }) => (
  <ul className="divide-y divide-border">
    {rows.map((b) => (
      <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to={`/workspace/leads/${b.lead_id}`} className="min-w-0 hover:text-primary">
          <p className="truncate">{b.leads?.name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[b.leads?.property, b.leads?.unit_type].filter(Boolean).join(" · ") || "—"} · <span className="text-destructive">waiting {waited(b.submitted_at)}</span>
          </p>
        </Link>
        <BriefActionBar
          size="sm"
          brief={{ id: b.id, leadId: b.lead_id, leadName: b.leads?.name ?? "", status: "Submitted", designerId: b.designer_id, salesId: b.leads?.sales_id ?? null, driveUrl: b.leads?.drive_url ?? null }}
        />
      </li>
    ))}
  </ul>
);

export default AssignQueue;
