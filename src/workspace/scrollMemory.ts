import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** Every sessionStorage access is guarded: Safari private mode throws. */
const ss = {
  get: (k: string) => { try { return window.sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.sessionStorage.setItem(k, v); } catch { /* unavailable */ } },
  del: (k: string) => { try { window.sessionStorage.removeItem(k); } catch { /* unavailable */ } },
};

const SCROLL_PREFIX = "ws-scroll:";
const RETURN_KEY = "ws-return-item";
const RESTORE_TIMEOUT_MS = 15000;
const SCROLL_TTL_MS = 2 * 60 * 60 * 1000;
const NEAR_PX = 200;
const NUDGE_MS = 10000;

/**
 * Scroll positions live in localStorage, not sessionStorage: iOS Safari discards backgrounded tabs and
 * the recreated tab has lost its sessionStorage. Entries are `{ y, at }` and expire after 2 hours.
 */
const pos = {
  get: (k: string): number => {
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) return 0;
      const v = JSON.parse(raw) as { y?: number; at?: number };
      if (typeof v.y !== "number" || typeof v.at !== "number" || Date.now() - v.at > SCROLL_TTL_MS) {
        window.localStorage.removeItem(k);
        return 0;
      }
      return v.y;
    } catch { return 0; }
  },
  set: (k: string, y: number) => {
    try { window.localStorage.setItem(k, JSON.stringify({ y: Math.round(y), at: Date.now() })); } catch { /* unavailable */ }
  },
  sweep: () => {
    try {
      const ls = window.localStorage;
      for (let i = ls.length - 1; i >= 0; i--) {
        const k = ls.key(i);
        if (k?.startsWith(SCROLL_PREFIX)) pos.get(k); // get() drops expired/invalid entries
      }
    } catch { /* unavailable */ }
  },
};

/** Called when a product link is opened from an FF&E / procurement row. */
export const markReturnItem = (id: string) => ss.set(RETURN_KEY, id);
/** `?item=` in the URL (procurement buying bar) also counts, and survives where sessionStorage does not. */
const urlItem = () => { try { return new URLSearchParams(window.location.search).get("item"); } catch { return null; } };
const hasReturnItem = () => !!urlItem() || !!ss.get(RETURN_KEY);

/** What the restore engine needs from a scroller: the window or any overflow container. */
interface Scroller {
  getY: () => number;
  setY: (y: number) => void;
  maxY: () => number;
  /** Where scroll/wheel/touchmove fire. */
  events: Window | HTMLElement;
  /** Where content growth is observed. */
  observe: Node;
  /** False while hidden (display:none reads 0 and must not overwrite the saved offset). */
  visible?: () => boolean;
}

const windowScroller = (): Scroller => ({
  getY: () => window.scrollY,
  setY: (y) => window.scrollTo(0, y),
  maxY: () => document.documentElement.scrollHeight - window.innerHeight,
  events: window,
  observe: document.body,
});

const elementScroller = (el: HTMLElement): Scroller => {
  // A detached element reads scrollTop 0, and React detaches before effect cleanup runs — so the teardown save
  // uses the last offset seen while it was on screen.
  let last = el.scrollTop;
  el.addEventListener("scroll", () => { if (el.offsetParent !== null) last = el.scrollTop; }, { passive: true });
  return {
    getY: () => (el.isConnected && el.offsetParent !== null ? el.scrollTop : last),
    setY: (y) => { el.scrollTop = y; last = y; },
    maxY: () => el.scrollHeight - el.clientHeight,
    events: el,
    observe: el,
    // Hidden but still mounted (display:none tab) reads 0: skip. Detached = unmounting: save the cached offset.
    visible: () => !el.isConnected || el.offsetParent !== null,
  };
};

/**
 * The one restore engine, shared by the window (useScrollRestoration) and containers (useKeepScroll).
 * Saves the offset under `key` (debounced scroll, visibilitychange hidden, pagehide, teardown) and restores it
 * after a remount. Lists load async, so restoring immediately would land at 0: we wait until the scroller is
 * tall enough to reach the saved offset (re-checked on every DOM change). A tap does not cancel — only a real
 * user scroll (wheel, key, touchmove, or the scroller moving away from the top) does, or the 15s timeout.
 * `onGiveUp(target)` fires when restore failed/was cancelled. Returns the teardown.
 */
const keepScroll = (sc: Scroller, key: string, onGiveUp: (target: number) => void, resetWhenEmpty: boolean) => {
  const target = pos.get(key);
  let done = target <= 0 || hasReturnItem();
  // Until restore finishes or the user really scrolls, don't overwrite the saved offset with 0.
  let armed = done;
  const save = () => { if (armed && (sc.visible?.() ?? true)) pos.set(key, sc.getY()); };
  let t: number | undefined;
  let obs: MutationObserver | null = null;
  let timer: number | undefined;

  const finish = (restored: boolean) => {
    if (done) return;
    done = true;
    obs?.disconnect();
    window.clearTimeout(timer);
    sc.events.removeEventListener("wheel", cancel);
    sc.events.removeEventListener("touchmove", cancel);
    window.removeEventListener("keydown", cancel);
    if (!restored) onGiveUp(target);
  };
  const cancel = () => { armed = true; finish(false); };
  const onScroll = () => {
    // A scroll while restoring that isn't ours and isn't near the target = the user took over.
    const y = sc.getY();
    if (!done && y > 50 && Math.abs(y - target) > NEAR_PX) cancel();
    if (done) armed = true;
    window.clearTimeout(t); t = window.setTimeout(save, 150);
  };
  const onVis = () => { if (document.visibilityState === "hidden") save(); };
  sc.events.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", save);

  const tryRestore = () => {
    if (done) return;
    if (sc.maxY() >= target) { sc.setY(target); armed = true; finish(true); }
  };
  if (!done) {
    sc.events.addEventListener("wheel", cancel, { passive: true });
    sc.events.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    obs = new MutationObserver(() => requestAnimationFrame(tryRestore));
    obs.observe(sc.observe, { childList: true, subtree: true });
    timer = window.setTimeout(() => finish(false), RESTORE_TIMEOUT_MS);
    requestAnimationFrame(tryRestore);
  } else if (resetWhenEmpty && target <= 0 && !hasReturnItem()) {
    sc.setY(0);
  }

  return () => {
    save(); // navigating away / unmounting
    done = true;
    obs?.disconnect();
    window.clearTimeout(timer);
    window.clearTimeout(t);
    sc.events.removeEventListener("wheel", cancel);
    sc.events.removeEventListener("touchmove", cancel);
    window.removeEventListener("keydown", cancel);
    sc.events.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", save);
  };
};

/** URL params that change while working without changing the page's list layout — kept out of the window key
 *  (otherwise each change would re-key and jump the page to the top). `design`/`dtab` drive the design-package
 *  dialog, which scrolls its own container. */
const VOLATILE_PARAMS = ["item", "q", "design", "dtab"];

/**
 * Saves/restores the window scroll per pathname+search (see keepScroll).
 * Returns `nudge`: the saved offset when restore failed/was cancelled and the user is still far
 * from it, so the layout can offer a one-tap "Back to where you were".
 */
export const useScrollRestoration = () => {
  const { pathname, search } = useLocation();
  const p = new URLSearchParams(search); VOLATILE_PARAMS.forEach((k) => p.delete(k));
  const qs = p.toString();
  const key = SCROLL_PREFIX + pathname + (qs ? "?" + qs : "");
  const [nudge, setNudge] = useState<number | null>(null);

  useEffect(() => {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* ignore */ }
    pos.sweep();
  }, []);

  useEffect(() => {
    setNudge(null);
    let nudgeTimer: number | undefined;
    const stop = keepScroll(windowScroller(), key, (target) => {
      if (target > NEAR_PX && Math.abs(window.scrollY - target) > NEAR_PX) {
        setNudge(target);
        window.clearTimeout(nudgeTimer);
        nudgeTimer = window.setTimeout(() => setNudge(null), NUDGE_MS);
      }
    }, true);
    return () => { stop(); window.clearTimeout(nudgeTimer); };
  }, [key]);

  // Hide the nudge once the user is near the saved spot.
  useEffect(() => {
    if (nudge == null) return;
    const check = () => { if (Math.abs(window.scrollY - nudge) <= NEAR_PX) setNudge(null); };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [nudge]);

  return { nudge, goBack: () => { if (nudge != null) window.scrollTo({ top: nudge, behavior: "smooth" }); setNudge(null); } };
};

/**
 * The same keeper for a scrollable element (dialogs, sheets, sticky rails). Attach the returned callback ref to
 * the element that has `overflow-y-auto`; `key` names what it shows (e.g. `design:<lead>:ffe`). A null key
 * disables it. Uses the window engine unchanged: same store, TTL, patient retry, 15s timeout, cancel rules.
 */
export const useKeepScroll = (key: string | null) => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!key || !el) return;
    return keepScroll(elementScroller(el), SCROLL_PREFIX + "el:" + key, () => {}, false);
  }, [key, el]);
  return setEl as (node: HTMLElement | null) => void;
};

/** Dedicated flash class (see index.css) — never shares classes with the buying bar's BAR_ROW_HI,
 *  so the timed removal can't strip classes React still believes it applied. */
const FLASH = "ws-flash";

/**
 * When the list renders and contains the row whose product link was opened, scroll it into
 * view, highlight it briefly, and clear the marker so later visits don't jump.
 * Rows carry `data-ffe-row={id}`; the desktop table and mobile list both render, so pick the visible one.
 */
export const useReturnToItem = (ids: string[], preferId?: string | null) => {
  const sig = ids.join(",");
  const jumped = useRef<string | null>(null);
  useEffect(() => {
    // A URL `?item=` wins over the sessionStorage marker; it jumps once per id (Next/Prev scroll on their own).
    const fromUrl = !!preferId;
    const id = preferId || ss.get(RETURN_KEY);
    if (!id || !ids.includes(id)) return;
    if (fromUrl && jumped.current === id) return;
    const raf = requestAnimationFrame(() => {
      const el = [...document.querySelectorAll<HTMLElement>(`[data-ffe-row="${CSS.escape(id)}"]`)]
        .find((e) => e.offsetParent !== null);
      if (!el) return;
      ss.del(RETURN_KEY);
      el.scrollIntoView({ block: "center" });
      if (fromUrl) {
        // The buying bar already marks this row (BAR_ROW_HI in React's className) — scroll only,
        // never touch its classes, or the timed removal would wipe the persistent highlight.
        jumped.current = id;
        return;
      }
      el.classList.add(FLASH);
      window.setTimeout(() => el.classList.remove(FLASH), 2500);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, preferId]);
};
