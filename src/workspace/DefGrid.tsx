import type { ReactNode } from "react";

/** Read-only definition grid; empty values render as "—". */
const DefGrid = ({ title, items }: { title?: string; items: [string, ReactNode][] }) => (
  <div>
    {title && <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</p>}
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="text-sm text-foreground break-words">{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default DefGrid;
