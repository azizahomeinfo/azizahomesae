import { cn } from "@/lib/utils";
import { DESIGN_STATUS_LABEL, type DesignStatus } from "./designSchema";

const DesignStatusPill = ({ status, version, className }: { status: DesignStatus; version?: number; className?: string }) => {
  const tone =
    status === "Accepted"
      ? "bg-primary text-primary-foreground border-transparent"
      : status === "Draft"
        ? "bg-muted text-muted-foreground border-transparent"
        : status === "Rejected"
          ? "bg-transparent text-destructive border-destructive/50"
          : "bg-primary/10 text-primary border-transparent";
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", tone, className)}>
      {version ? `V${version} · ` : "Design · "}{DESIGN_STATUS_LABEL[status]}
    </span>
  );
};

export default DesignStatusPill;
