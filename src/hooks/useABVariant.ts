import { useEffect, useState } from "react";

export type Variant = "A" | "B";

const STORAGE_KEY = "ab_variant_";
const SESSION_KEY = "ab_session_id";

async function insertEvent(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("ab_events").insert(payload);
  } catch {
    // swallow tracking errors
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function assignVariant(experiment: string): Variant {
  if (typeof window === "undefined") return "A";
  const key = STORAGE_KEY + experiment;
  // Allow forcing via ?ab=A|B for QA
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("ab");
  if (forced === "A" || forced === "B") {
    localStorage.setItem(key, forced);
    return forced;
  }
  const existing = localStorage.getItem(key);
  if (existing === "A" || existing === "B") return existing;
  const v: Variant = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem(key, v);
  return v;
}

export function useABVariant(experiment: string) {
  const [variant, setVariant] = useState<Variant>("A");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = assignVariant(experiment);
    setVariant(v);
    setReady(true);
    // Fire a view event (deduped per session per experiment)
    const viewKey = `ab_viewed_${experiment}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, "1");
      void insertEvent({
        experiment,
        variant: v,
        event_type: "view",
        session_id: getSessionId(),
        language: document.documentElement.lang || null,
        path: window.location.pathname,
      });
    }
  }, [experiment]);

  const trackClick = () => {
    if (typeof window === "undefined") return;
    void insertEvent({
      experiment,
      variant,
      event_type: "cta_click",
      session_id: getSessionId(),
      language: document.documentElement.lang || null,
      path: window.location.pathname,
    });
  };

  return { variant, ready, trackClick };
}
