import { useSearchParams } from "react-router-dom";

export type DesignTab = "renders" | "ffe";

/**
 * The design-package dialog's open state and tab live in the URL (`?design=<leadId>&dtab=ffe`) so a Safari tab
 * discard + remount reopens it where the user was. Writes always `replace` and preserve every other param.
 * Opening sets `design` (tab back to renders); closing clears both.
 */
export const useDesignParam = (leadId: string | null | undefined) => {
  const [params, setParams] = useSearchParams();
  const edit = (fn: (p: URLSearchParams) => void) =>
    setParams((prev) => { const n = new URLSearchParams(prev); fn(n); return n; }, { replace: true });
  const open = !!leadId && params.get("design") === leadId;
  return {
    open,
    setOpen: (o: boolean) => edit((p) => {
      if (o && leadId) { p.set("design", leadId); p.delete("dtab"); }
      else { p.delete("design"); p.delete("dtab"); }
    }),
    tab: (open && params.get("dtab") === "ffe" ? "ffe" : "renders") as DesignTab,
    setTab: (t: DesignTab) => edit((p) => { if (t === "ffe") p.set("dtab", "ffe"); else p.delete("dtab"); }),
  };
};
