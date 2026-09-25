CREATE OR REPLACE FUNCTION public.ws_room_prefix(_room text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce((jsonb_build_object(
    'Entrance','ENT','Living Room','LIV','Living Area','LIV','Living / Dining','LIV','Dining','DIN','Kitchen','KIT',
    'Kitchen & Tabletop','KIT','Master Bedroom','MBR','Bedroom 2','BR2','Bedroom 3','BR3','Bedroom 4','BR4',
    'Maid''s Room','MAD','Bathroom','BTH','Bathrooms','BTH','Balcony','BAL','Appliances','APP','Bedrooms','BED',
    'Living & Dining','LIV','Kitchenware & Tabletop','KIT','Sleeping Area','SLP','Guest Bedroom','GBR',
    'Guest Bedroom 1','GB1','Guest Bedroom 2','GB2','Guest Bedroom 3','GB3','Safety, Access & Compliance','SAF'
  ) ->> btrim(_room)), nullif(upper(left(regexp_replace(_room, '[^A-Za-z]', '', 'g'), 3)), ''), 'ITM')
$$;

-- The single conversion from the sales brief's checklist to the costed FF&E rows. Runs once per lead (no-op if rows exist).
CREATE OR REPLACE FUNCTION public.ws_seed_ffe_from_brief(_lead uuid, _project uuid DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b jsonb; s jsonb; i jsonb; room text; n int := 0; pre text; seq jsonb := '{}'; k int; q numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ffe_items WHERE lead_id = _lead) THEN RETURN 0; END IF;
  SELECT ffe INTO b FROM public.requirement_briefs WHERE lead_id = _lead ORDER BY created_at DESC LIMIT 1;
  FOR s IN SELECT * FROM jsonb_array_elements(coalesce(b, '[]'::jsonb)) LOOP
    room := btrim(regexp_replace(regexp_replace(coalesce(s->>'title',''), '^\s*\d+(\.\d+)*\s+', ''), '\s*\([^)]*\)\s*$', ''));
    pre := public.ws_room_prefix(room);
    FOR i IN SELECT * FROM jsonb_array_elements(coalesce(s->'items', '[]'::jsonb)) LOOP
      CONTINUE WHEN i->>'included' IS DISTINCT FROM 'inc' OR btrim(coalesce(i->>'item','')) = '';
      k := coalesce((seq->>pre)::int, 0) + 1; seq := seq || jsonb_build_object(pre, k);
      q := nullif(regexp_replace(coalesce(nullif(i->>'required',''), i->>'std', ''), '[^0-9.]', '', 'g'), '')::numeric;
      INSERT INTO public.ffe_items (lead_id, project_id, room, item, ref, qty, notes, category, sort_order)
      VALUES (_lead, _project, room, btrim(i->>'item'), pre || '-' || k, CASE WHEN q > 0 THEN q ELSE 1 END,
        nullif(btrim(coalesce(i->>'notes','')), ''),
        CASE WHEN room ~* 'appliance' THEN 'Appliance' WHEN room ~* 'kitchen|tabletop' THEN 'Accessories' ELSE 'Furniture' END, n);
      n := n + 1;
    END LOOP;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ws_seed_ffe_from_brief(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_assign_brief(_brief uuid, _designer uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare b public.requirement_briefs%rowtype;
begin
  if not public.is_gm(auth.uid()) then raise exception 'Only the GM can assign a brief'; end if;
  if public.ws_role(_designer) is distinct from 'designer' then raise exception 'Assignee must be an active designer'; end if;
  select * into b from public.requirement_briefs where id = _brief for update;
  if not found then raise exception 'Brief not found'; end if;
  if b.status <> 'Submitted' then raise exception 'Brief is no longer awaiting a designer'; end if;
  update public.requirement_briefs set status = 'Assigned', designer_id = _designer, assigned_at = now() where id = _brief;
  update public.leads set designer_id = _designer where id = b.lead_id;
  perform public.ws_seed_ffe_from_brief(b.lead_id, null);
end $function$;

CREATE OR REPLACE FUNCTION public.ws_sign_contract(_contract uuid, _handover date)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.contracts; l public.leads; pid uuid; coord uuid; due date := current_date + 2;
  sub numeric; tot numeric; k text; u uuid;
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

  sub := coalesce(nullif(c.doc->>'subtotal','')::numeric, 0);
  tot := round(CASE WHEN coalesce((c.doc->>'vatCharged')::boolean, true) THEN sub * 1.05 ELSE sub END);
  SELECT user_id INTO coord FROM public.workspace_members WHERE role = 'coordinator' AND active ORDER BY created_at LIMIT 1;

  pid := l.converted_project_id;
  IF pid IS NULL THEN
    INSERT INTO public.projects (lead_id, name, client, property, unit, unit_type, location, drive_url,
      sales_id, designer_id, coordinator_id, start_date, handover_date, value, stage, created_by)
    VALUES (l.id, coalesce(nullif(c.doc->>'client',''), l.name), coalesce(nullif(c.doc->>'client',''), l.name),
      l.property, coalesce(nullif(c.doc->>'unit',''), l.building), l.unit_type, l.location, l.drive_url,
      l.sales_id, l.designer_id, coord, current_date, _handover, tot, 'Contract / Deposit', auth.uid())
    RETURNING id INTO pid;
  ELSE
    UPDATE public.projects SET handover_date = _handover, value = tot,
      coordinator_id = coalesce(coordinator_id, coord) WHERE id = pid;
  END IF;

  PERFORM set_config('ws.signing', 'on', true);
  UPDATE public.contracts SET status = 'Signed' WHERE id = c.id;
  PERFORM set_config('ws.signing', '', true);
  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;

  IF l.designer_id IS NOT NULL THEN
    FOREACH k IN ARRAY ARRAY['Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations'] LOOP
      IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE project_id = pid AND drawing_kind = k) THEN
        INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_date, priority, drawing_kind, created_by)
        VALUES (pid, k, 'Upload to the project''s Files under "' || k || '" — the task closes on upload.', l.designer_id, due, 'High', k, auth.uid());
      END IF;
    END LOOP;
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (l.designer_id, 'drawings', l.name || ' signed — 4 drawings due ' || to_char(due, 'DD Mon YYYY'),
      'Wall design, furniture and cabinet drawings, and artwork locations — upload each to the project so the coordinator can start procurement.', l.id, pid);
  END IF;

  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', l.name || ' signed — FF&E procurement starts, handover ' || to_char(_handover, 'DD Mon YYYY'),
      'Large furniture first, decor last.', l.id, pid);
  END LOOP;
  RETURN pid;
END $function$;