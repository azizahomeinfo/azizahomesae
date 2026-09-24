import { cn } from "@/lib/utils";
import { BRIEF_LABEL, type BriefStatus } from "./briefWorkflow";

const BriefStatusPill = ({ status, className }: { status: BriefStatus; className?: string }) => {
  const tone =
    status === "Design Approved"
      ? "bg-primary text-primary-foreground border-transparent"
      : status === "Draft"
        ? "bg-muted text-muted-foreground border-transparent"
        : status === "Revision Requested"
          ? "bg-transparent text-destructive border-destructive/50"
          : "bg-primary/10 text-primary border-transparent";
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", tone, className)}>
      {BRIEF_LABEL[status]}
    </span>
  );
};

export default BriefStatusPill;
