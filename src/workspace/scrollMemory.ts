import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Every sessionStorage access is guarded: Safari private mode throws. */
const ss = {
  get: (k: string) => { try { return window.sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.sessionStorage.setItem(k, v); } catch { /* unavailable */ } },
  del: (k: string) => { try { window.sessionStorage.removeItem(k); } catch { /* unavailable */ } },
};

const SCROLL_PREFIX = "ws-scroll:";
const RETURN_KEY = "ws-return-item";
const RESTORE_TIMEOUT_MS = 6000;

/** Called when a product link is opened from an FF&E / procurement row. */
export const markReturnItem = (id: string) => ss.set(RETURN_KEY, id);
const hasReturnItem = () => !!ss.get(RETURN_KEY);

/**
 * Saves the window scroll per pathname+search and restores it after a remount (e.g. Safari
 * discarded the backgrounded tab). Lists load async, so restoring immediately would land at 0:
 * we wait until the page is tall enough to reach the saved offset (re-checked on every DOM
 * change), and give up on timeout or as soon as the user scrolls/touches themselves.
 */
export const useScrollRestoration = () => {
  const { pathname, search } = useLocation();
  const key = SCROLL_PREFIX + pathname + search;

  useEffect(() => {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const save = () => ss.set(key, String(Math.round(window.scrollY)));
    let t: number | undefined;
    const onScroll = () => { window.clearTimeout(t); t = window.setTimeout(save, 150); };
    const onVis = () => { if (document.visibilityState === "hidden") save(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", save);

    // Restore — unless a row marker is pending; the item jump is more precise and wins.
    const target = Number(ss.get(key)) || 0;
    let done = target <= 0 || hasReturnItem();
    let obs: MutationObserver | null = null;
    let timer: number | undefined;
    const stop = () => {
      done = true;
      obs?.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
    const tryRestore = () => {
      if (done) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max >= target) { window.scrollTo(0, target); stop(); }
    };
    if (!done) {
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
      window.addEventListener("keydown", stop);
      obs = new MutationObserver(() => requestAnimationFrame(tryRestore));
      obs.observe(document.body, { childList: true, subtree: true });
      timer = window.setTimeout(stop, RESTORE_TIMEOUT_MS);
      requestAnimationFrame(tryRestore);
    } else if (target <= 0 && !hasReturnItem()) {
      window.scrollTo(0, 0);
    }

    return () => {
      save(); // navigating away
      stop();
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", save);
    };
  }, [key]);
};

const HIGHLIGHT = ["ring-2", "ring-primary", "bg-primary/10"];

/**
 * When the list renders and contains the row whose product link was opened, scroll it into
 * view, highlight it briefly, and clear the marker so later visits don't jump.
 * Rows carry `data-ffe-row={id}`; the desktop table and mobile list both render, so pick the visible one.
 */
export const useReturnToItem = (ids: string[]) => {
  const sig = ids.join(",");
  useEffect(() => {
    const id = ss.get(RETURN_KEY);
    if (!id || !ids.includes(id)) return;
    const raf = requestAnimationFrame(() => {
      const el = [...document.querySelectorAll<HTMLElement>(`[data-ffe-row="${CSS.escape(id)}"]`)]
        .find((e) => e.offsetParent !== null);
      if (!el) return;
      ss.del(RETURN_KEY);
      el.scrollIntoView({ block: "center" });
      el.classList.add("transition-all", "duration-700", ...HIGHLIGHT);
      window.setTimeout(() => el.classList.remove(...HIGHLIGHT), 2500);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
};
