import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
  if (!GSC_KEY) return json({ error: "GOOGLE_SEARCH_CONSOLE_API_KEY missing" }, 500);

  const { action, site } = await req.json().catch(() => ({}));
  const identifier = site || "https://www.azizahomes.com/";

  const headers = {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GSC_KEY,
    "Content-Type": "application/json",
  };

  try {
    if (action === "list_sites") {
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
      return passthrough(r);
    }
    if (action === "get_token") {
      const r = await fetch(`${GATEWAY}/siteVerification/v1/token`, {
        method: "POST", headers,
        body: JSON.stringify({ site: { identifier, type: "SITE" }, verificationMethod: "META" }),
      });
      return passthrough(r);
    }
    if (action === "verify") {
      const r = await fetch(`${GATEWAY}/siteVerification/v1/webResource?verificationMethod=META`, {
        method: "POST", headers,
        body: JSON.stringify({ site: { identifier, type: "SITE" } }),
      });
      return passthrough(r);
    }
    if (action === "add_site") {
      const enc = encodeURIComponent(identifier);
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}`, { method: "PUT", headers });
      return new Response(JSON.stringify({ status: r.status, ok: r.ok }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "submit_sitemap") {
      const enc = encodeURIComponent(identifier);
      const sm = encodeURIComponent(`${identifier.replace(/\/$/, "")}/sitemap.xml`);
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}/sitemaps/${sm}`, { method: "PUT", headers });
      return new Response(JSON.stringify({ status: r.status, ok: r.ok }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "list_sitemaps") {
      const enc = encodeURIComponent(identifier);
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}/sitemaps`, { headers });
      return passthrough(r);
    }
    if (action === "status") {
      // Combined snapshot used by the SEO Status dashboard.
      const sites = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers }).then((r) => r.json()).catch(() => null);
      const enc = encodeURIComponent(identifier);
      const sitemaps = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}/sitemaps`, { headers })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
        .catch((e) => ({ status: 0, body: { error: String(e) } }));
      return json({ identifier, sites, sitemaps });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function passthrough(r: Response) {
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}