// Deletes a lead and its stored files. Files go first (service role, since a sales owner can't
// remove a designer's uploads); the row is then deleted as the caller so RLS and the guard apply.
// A failure before the row delete leaves the lead intact; storage removal is idempotent on retry.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
  const { leadId } = await req.json().catch(() => ({}));
  if (typeof leadId !== "string" || !/^[0-9a-f-]{36}$/.test(leadId)) return json({ error: "Invalid lead." }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: u, error: ue } = await user.auth.getUser();
  if (ue || !u.user) return json({ error: "Please sign in again." }, 401);

  const { data: why, error: be } = await user.rpc("ws_lead_delete_block", { _uid: u.user.id, _lead: leadId });
  if (be) return json({ error: be.message }, 400);
  if (why) return json({ error: why }, 403);

  const { data: paths, error: pe } = await admin.rpc("ws_lead_storage_paths", { _lead: leadId });
  if (pe) return json({ error: "Couldn't list the lead's files — nothing was deleted." }, 500);
  const names = (paths as string[] | null) ?? [];
  for (let i = 0; i < names.length; i += 100) {
    const { error } = await admin.storage.from("workspace").remove(names.slice(i, i + 100));
    if (error) return json({ error: "Couldn't remove the lead's files — the lead was kept. Try again." }, 500);
  }

  const { data: gone, error: de } = await user.from("leads").delete().eq("id", leadId).select("id");
  if (de) return json({ error: de.message }, 400);
  if (!gone?.length) return json({ error: "Only the lead's sales owner or the GM can delete it." }, 403);
  return json({ ok: true, files: names.length });
});
