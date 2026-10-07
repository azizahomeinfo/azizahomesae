import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Collapsed FF&E / procurement section headings, remembered in localStorage per surface, owner (project/lead)
 * and grouping — so collapsing suppliers never collapses rooms. Every access is guarded (Safari private mode
 * throws); unavailable or corrupt storage just means "everything expanded". Never in the URL (dozens of suppliers).
 */
const read = (key: string): Set<string> => {
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch { return new Set(); }
};
const write = (key: string, s: Set<string>) => {
  try {
    if (s.size) window.localStorage.setItem(key, JSON.stringify([...s]));
    else window.localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
};

/** e.g. `ws.ffe.collapsed.proc.project_id:<uuid>.supplier` */
export const collapseKey = (surface: "sheet" | "proc", owner: { col: string; id: string }, groupBy: string) =>
  `ws.ffe.collapsed.${surface}.${owner.col}:${owner.id}.${groupBy}`;

/**
 * `isOpen(group, rows)`: a collapsed section is still forced open while a search has matches in it, or while it
 * holds the `?item=` row (so useReturnToItem's jump has a visible target — computed during render, before its rAF).
 */
export const useCollapsedGroups = (key: string, opts: { searching: boolean; itemId: string | null }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => read(key));
  useEffect(() => { setCollapsed(read(key)); }, [key]);
  const set = (s: Set<string>) => { setCollapsed(s); write(key, s); };
  const forced = (rows: { id: string }[]) =>
    (opts.searching && rows.length > 0) || (!!opts.itemId && rows.some((r) => r.id === opts.itemId));
  return {
    isOpen: (g: string, rows: { id: string }[]) => !collapsed.has(g) || forced(rows),
    toggle: (g: string) => { const n = new Set(collapsed); if (n.has(g)) n.delete(g); else n.add(g); set(n); },
    collapseAll: (groups: string[]) => set(new Set(groups)),
    expandAll: () => set(new Set()),
    allCollapsed: (groups: string[]) => groups.length > 0 && groups.every((g) => collapsed.has(g)),
  };
};

export const sectionDomId = (scope: string, g: string) =>
  `ffe-sec-${scope}-${g.replace(/[^a-zA-Z0-9_-]+/g, "_")}`;

/** The toggle. With `children` (read-only headings) the title sits inside the button; editable headings pass none
 *  and render the chevron beside their own input, so renaming is never inside a button. */
export const CollapseChevron = ({ open, controls, label, onClick, children }: { open: boolean; controls: string; label: string; onClick: () => void; children?: ReactNode }) => (
  <button type="button" aria-expanded={open} aria-controls={controls} aria-label={children ? undefined : `${open ? "Collapse" : "Expand"} ${label}`}
    onClick={onClick} className={cn("inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md text-left text-muted-foreground hover:text-foreground", children ? "pr-1" : "w-8 justify-center hover:bg-muted")}>
    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} />{children}
  </button>
);

export const CollapseAllButton = ({ allCollapsed, onCollapse, onExpand }: { allCollapsed: boolean; onCollapse: () => void; onExpand: () => void }) => (
  <Button size="sm" variant="outline" onClick={allCollapsed ? onExpand : onCollapse}>
    {allCollapsed ? "Expand all" : "Collapse all"}
  </Button>
);
