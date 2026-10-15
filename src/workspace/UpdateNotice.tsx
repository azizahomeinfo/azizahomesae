import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A tab left open keeps running the version it loaded, so fixes published since never reach it — staff kept
 * working on an old screen. Check the published entry script every few minutes and whenever the tab comes back
 * into view; when it changed, ask to reload. Never reloads by itself: there may be unsaved edits.
 */
const entryOf = (html: string) => html.match(/<script[^>]+type="module"[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1] ?? null;

export const UpdateNotice = () => {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const mine = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute("src");
    if (!mine) return; // dev server: nothing to compare
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/workspace?v=${Date.now()}`, { cache: "no-store" });
        const live = entryOf(await res.text());
        if (live && live !== mine) setStale(true);
      } catch { /* offline: try again later */ }
    };
    const t = window.setInterval(check, 3 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => { stop = true; window.clearInterval(t); document.removeEventListener("visibilitychange", check); };
  }, []);
  if (!stale) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-t border-primary/40 bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg">
      <span>The workspace has been updated. Save what you're working on, then reload to get the latest version.</span>
      <Button size="sm" variant="secondary" onClick={() => window.location.reload()}><RefreshCw className="mr-1 h-4 w-4" /> Reload</Button>
    </div>
  );
};
