-- 0051 contract_items_synced_at_signing — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- Signing re-takes doc.sections from the live client-facing FF&E list (ws_sync_contract_items inside ws_sign_contract).
-- Function bodies are pg_get_functiondef output from the live database.

CREATE OR REPLACE FUNCTION public.ws_contract_sections(_lead uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- The client-facing FF&E list as contract sections: grouped by room in the designer's order,
-- internal (Building Material) rows excluded, qty as text to match the document's shape.
  SELECT coalesce(jsonb_agg(sec ORDER BY ord), '[]'::jsonb)
  FROM (
    SELECT min(i.sort_order) AS ord,
           jsonb_build_object(
             'id', gen_random_uuid(),
             'title', i.room,
             'items', jsonb_agg(jsonb_build_object('id', i.id, 'item', i.item, 'qty', i.qty::text)
                                ORDER BY i.sort_order)
           ) AS sec
      FROM public.ffe_items i
      JOIN public.leads l ON l.id = _lead
     WHERE NOT i.internal
       AND (i.lead_id = l.id OR (l.converted_project_id IS NOT NULL AND i.project_id = l.converted_project_id))
     GROUP BY i.room
  ) g
$function$;

CREATE OR REPLACE FUNCTION public.ws_sync_contract_items(_contract uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- Re-points a contract's item list at the live FF&E list, so what is signed is what gets bought.
-- Never empties a contract: an empty live list raises instead of wiping the document. The list as
-- it was issued is kept once in doc.sectionsAtIssue.
DECLARE c public.contracts; secs jsonb; n int;
BEGIN
  SELECT * INTO c FROM public.contracts WHERE id = _contract FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  secs := public.ws_contract_sections(c.lead_id);
  SELECT count(*) INTO n FROM jsonb_array_elements(secs) s, jsonb_array_elements(s->'items') i;
  IF n = 0 THEN
    RAISE EXCEPTION 'The FF&E list is empty, so the contract item list cannot be synced. Build the FF&E list first — refusing to leave the contract with no items';
  END IF;
  UPDATE public.contracts SET doc =
      jsonb_set(
        CASE WHEN doc ? 'sectionsAtIssue' THEN doc
             ELSE jsonb_set(doc, '{sectionsAtIssue}', coalesce(doc->'sections','[]'::jsonb)) END,
        '{sections}', secs)
      || jsonb_build_object('itemsSyncedAt', to_jsonb(now()))
   WHERE id = _contract;
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_sign_contract(_contract uuid, _handover date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.contracts; l public.leads; pid uuid; coord uuid; sub numeric; tot numeric; u uuid; synced int;
BEGIN
  IF _handover IS NULL THEN RAISE EXCEPTION 'Enter the handover date to mark the contract signed'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = c.lead_id FOR UPDATE;
  IF NOT (public.is_gm(auth.uid()) OR l.sales_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the sales owner or the GM can mark a contract signed';
  END IF;
  IF c.status <> 'Issued' THEN RAISE EXCEPTION 'Only an issued contract can be marked signed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ffe_items WHERE lead_id = l.id OR (l.converted_project_id IS NOT NULL AND project_id = l.converted_project_id)) THEN
    RAISE EXCEPTION 'This lead has no FF&E items — there is nothing to buy. Build the FF&E list before marking the contract signed';
  END IF;
  -- What is signed is what gets bought: the item list is re-taken from the live FF&E list now,
  -- because it can have moved since the proposal was accepted and the contract issued.
  synced := public.ws_sync_contract_items(_contract);
  sub := coalesce(nullif(c.doc->>'subtotal','')::numeric, 0);
  tot := round(CASE WHEN coalesce((c.doc->>'vatCharged')::boolean, true) THEN sub * 1.05 ELSE sub END);
  SELECT user_id INTO coord FROM public.workspace_members WHERE role = 'coordinator' AND active ORDER BY created_at LIMIT 1;
  pid := l.converted_project_id;
  IF pid IS NULL THEN
    INSERT INTO public.projects (lead_id, name, client, property, unit, unit_type, location, drive_url,
      sales_id, designer_id, coordinator_id, start_date, handover_date, stage, created_by)
    VALUES (l.id, coalesce(nullif(c.doc->>'client',''), l.name), coalesce(nullif(c.doc->>'client',''), l.name),
      l.property, coalesce(nullif(c.doc->>'unit',''), l.building), l.unit_type, l.location, l.drive_url,
      l.sales_id, l.designer_id, coord, current_date, _handover, 'Contract / Deposit', auth.uid())
    RETURNING id INTO pid;
  ELSE
    UPDATE public.projects SET handover_date = _handover, coordinator_id = coalesce(coordinator_id, coord) WHERE id = pid;
  END IF;
  INSERT INTO public.project_value_private (project_id, value) VALUES (pid, tot)
    ON CONFLICT (project_id) DO UPDATE SET value = EXCLUDED.value;
  PERFORM set_config('ws.signing', 'on', true);
  UPDATE public.contracts SET status = 'Signed' WHERE id = c.id;
  PERFORM set_config('ws.signing', '', true);
  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  PERFORM set_config('ws.converting', 'on', true);
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  PERFORM set_config('ws.converting', '', true);
  PERFORM public.ws_create_drawing_tasks(pid, l.id, l.designer_id, l.name || ' signed');
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', l.name || ' signed — project created, handover ' || to_char(_handover, 'DD Mon YYYY'),
      'FF&E list is with the designer to confirm. You can look at it, but nothing to buy yet — you''ll be notified when procurement can start.', l.id, pid);
  END LOOP;
  PERFORM public.ws_request_ffe_confirm(pid);
  RETURN pid;
END $function$;
