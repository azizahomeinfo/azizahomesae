import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * FF&E / procurement view state kept in the URL so a Safari tab discard + remount restores the same list:
 * `sup` supplier filter, `q` search, `gaps` only-gaps toggle, `item` the row in the buying bar.
 * Writes always `replace` and preserve every other param (e.g. `tab`). The search input reads local state
 * (instant); `q` is written 300ms after typing stops.
 */
const FFE_VIEWS = ["table", "board", "delivery"] as const;
export type FfeView = typeof FFE_VIEWS[number];

/** Also `view` (table/board/delivery, omitted when table; unknown values fall back to table) and `showdel=1`. */
export const useFfeViewParams = () => {
  const [params, setParams] = useSearchParams();
  const edit = (fn: (p: URLSearchParams) => void) =>
    setParams((prev) => { const n = new URLSearchParams(prev); fn(n); return n; }, { replace: true });

  const [search, setSearchLocal] = useState(() => params.get("q") ?? "");
  const qTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(qTimer.current), []);
  const setSearch = (v: string) => {
    setSearchLocal(v);
    window.clearTimeout(qTimer.current);
    qTimer.current = window.setTimeout(() => edit((p) => { if (v.trim()) p.set("q", v); else p.delete("q"); }), 300);
  };

  const rawView = params.get("view");
  const view: FfeView = (FFE_VIEWS as readonly string[]).includes(rawView ?? "") ? (rawView as FfeView) : "table";

  return {
    search, setSearch,
    view,
    setView: (v: FfeView) => edit((p) => { if (v === "table") p.delete("view"); else p.set("view", v); }),
    showDelivered: params.get("showdel") === "1",
    setShowDelivered: (v: boolean) => edit((p) => { if (v) p.set("showdel", "1"); else p.delete("showdel"); }),
    supplier: params.get("sup") || "all",
    setSupplier: (v: string) => edit((p) => { if (v === "all") p.delete("sup"); else p.set("sup", v); }),
    onlyGaps: params.get("gaps") === "1",
    setOnlyGaps: (v: boolean) => edit((p) => { if (v) p.set("gaps", "1"); else p.delete("gaps"); }),
    itemId: params.get("item"),
    setItem: (id: string | null) => edit((p) => { if (id) p.set("item", id); else p.delete("item"); }),
  };
};
