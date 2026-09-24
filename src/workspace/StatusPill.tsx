import { cn } from "@/lib/utils";

export const StatusPill = ({ status, className }: { status: string; className?: string }) => {
  const tone =
    status === "Won"
      ? "bg-primary text-primary-foreground border-transparent"
      : status === "Lost"
        ? "bg-transparent text-muted-foreground border-border"
        : status === "New Lead"
          ? "bg-muted text-muted-foreground border-transparent"
          : "bg-primary/10 text-primary border-transparent";
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", tone, className)}>
      {status}
    </span>
  );
};

export default StatusPill;
