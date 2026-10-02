-- A purchase link only exists for the online retailers (Home Centre, Home Box, Ikea). Trade
-- suppliers — joiners, curtain makers, mirror shops — are bought by phone and WhatsApp, so an
-- item with a supplier and a price is complete whether or not anyone can paste a URL for it.
-- ws_submit_budget no longer counts a missing link as a gap; the two notice functions no longer
-- ask for one; ws_ffe_out_of_stock no longer claims the designer was asked when none is assigned.

CREATE OR REPLACE FUNCTION public.ws_submit_budget(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.projects; g record; cid uuid; st costing_status; missing text[] := '{}'; cost numeric; u uuid;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR p.designer_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the project''s designer or the GM can submit the FF&E list for budget approval';
  END IF;
  IF NOT public.ws_needs_budget(_project) THEN
    RAISE EXCEPTION 'This project came from a contract signed in the system — its FF&E list was already quoted, no budget approval needed';
  END IF;
  SELECT * INTO g FROM public.ws_ffe_gaps(_project);
  IF g.total = 0 THEN missing := missing || 'the FF&E list is empty'::text; END IF;
  IF g.no_supplier > 0 THEN missing := missing || format('%s item%s no supplier', g.no_supplier, CASE WHEN g.no_supplier = 1 THEN ' has' ELSE 's have' END); END IF;
  -- A missing purchase link is NOT a gap: a purchase link only exists for the online retailers
  -- (Home Centre, Home Box, Ikea). Trade suppliers are bought by phone and WhatsApp, so an item
  -- with a supplier and a price is complete whether or not anyone can paste a URL for it.
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Can''t submit for budget approval — %', array_to_string(missing, '; ');
  END IF;
  SELECT id, status INTO cid, st FROM public.ffe_costings
   WHERE project_id = _project OR (p.lead_id IS NOT NULL AND lead_id = p.lead_id) ORDER BY project_id NULLS LAST LIMIT 1 FOR UPDATE;
  IF st = 'Submitted' THEN RAISE EXCEPTION 'The FF&E list is already with the GM for budget approval'; END IF;
  PERFORM set_config('ws.budget', 'on', true);
  IF cid IS NULL THEN
    INSERT INTO public.ffe_costings (project_id, lead_id, status, submitted_at, purpose)
    VALUES (_project, p.lead_id, 'Submitted', now(), 'budget') RETURNING id INTO cid;
    INSERT INTO public.ffe_costing_private (costing_id, markup_pct) VALUES (cid, 0) ON CONFLICT (costing_id) DO NOTHING;
  ELSE
    UPDATE public.ffe_costings SET purpose = 'budget', status = 'Submitted', submitted_at = now(), project_id = _project WHERE id = cid;
  END IF;
  PERFORM set_config('ws.budget', '', true);
  IF p.confirmed_at IS NULL THEN
    PERFORM set_config('ws.confirming', 'on', true);
    UPDATE public.projects SET confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _project;
    PERFORM set_config('ws.confirming', '', true);
  END IF;
  SELECT coalesce(sum(i.qty * c.unit_cost), 0) INTO cost FROM public.ffe_items i
    LEFT JOIN public.ffe_item_costs c ON c.item_id = i.id WHERE i.project_id = _project;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'gm' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'budget', p.code || ' — FF&E budget approval needed',
      g.total || ' items, cost AED ' || to_char(cost, 'FM999,999,999') || '. The client price is already agreed; this approves internal spend.', p.lead_id, p.id);
  END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_notify_ffe_completion(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.projects; g record; u uuid; t text;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE project_id = _project AND kind = 'ffe_complete') THEN RETURN; END IF;
  SELECT * INTO g FROM public.ws_ffe_gaps(_project);
  t := p.code || ' — complete the FF&E list for budget approval';
  FOR u IN SELECT user_id FROM public.workspace_members
            WHERE (p.designer_id IS NOT NULL AND user_id = p.designer_id) OR (p.designer_id IS NULL AND role = 'gm' AND active) LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'ffe_complete', t,
      CASE WHEN p.designer_id IS NULL THEN 'No designer is assigned — assign one to fill in the suppliers. ' ELSE '' END
      || g.no_supplier || ' of ' || g.total || ' items have no supplier. A purchase link is optional. Then submit for budget approval.', p.lead_id, p.id);
  END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_request_ffe_confirm(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.projects; g record; u uuid; b text := '';
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF p.id IS NULL OR p.confirmed_at IS NOT NULL THEN RETURN; END IF;
  IF p.designer_id IS NULL THEN b := 'No designer is assigned, so the GM confirms the list. '; END IF;
  b := b || 'Check it, edit anything that changed, then press Confirm on the FF&E tab.';
  IF public.ws_needs_budget(_project) THEN
    SELECT * INTO g FROM public.ws_ffe_gaps(_project);
    b := b || ' This project also needs GM budget approval: ' || g.no_supplier || ' of ' || g.total || ' items have no supplier (a purchase link is optional).';
  END IF;
  FOR u IN SELECT user_id FROM public.workspace_members
            WHERE (p.designer_id IS NOT NULL AND user_id = p.designer_id) OR (p.designer_id IS NULL AND role = 'gm' AND active) LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'ffe_confirm', coalesce(p.client, p.name) || ' is now a project — confirm the FF&E list so purchasing can start', b, p.lead_id, p.id);
  END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_ffe_out_of_stock(_items uuid[], _note text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n text := nullif(btrim(coalesce(_note, '')), ''); r record; cnt int := 0;
        proj uuid; p public.projects; names text := ''; who text;
BEGIN
  IF public.ws_role(auth.uid()) NOT IN ('coordinator', 'gm') THEN
    RAISE EXCEPTION 'Only the coordinator or the GM can send an item back as out of stock';
  END IF;
  IF n IS NULL THEN RAISE EXCEPTION 'Say what is wrong with the item, so the designer knows what to look for'; END IF;
  IF coalesce(array_length(_items, 1), 0) = 0 THEN RAISE EXCEPTION 'Pick at least one item to send back'; END IF;

  FOR r IN SELECT i.* FROM public.ffe_items i WHERE i.id = ANY (_items) ORDER BY i.sort_order LOOP
    IF r.project_id IS NULL THEN RAISE EXCEPTION '% is not on a project yet', coalesce(r.ref, r.item); END IF;
    IF NOT public.can_see_ffe(auth.uid(), r.lead_id, r.project_id) THEN RAISE EXCEPTION 'That item is not yours'; END IF;
    IF proj IS NULL THEN proj := r.project_id;
    ELSIF proj <> r.project_id THEN RAISE EXCEPTION 'Send items back one project at a time'; END IF;
    IF r.stage IN ('Delivered', 'Installed', 'Closed') THEN
      RAISE EXCEPTION '% is already %, so it is too late to re-choose it', coalesce(r.ref, r.item), r.stage;
    END IF;
    IF r.review = 'Out of stock' THEN CONTINUE; END IF;

    PERFORM set_config('ws.reviewing', 'on', true);
    UPDATE public.ffe_items SET
      review = 'Out of stock', review_note = n, review_by = auth.uid(), review_at = now(),
      review_prev = jsonb_build_object(
        'item', r.item, 'supplier_name', r.supplier_name, 'product_url', r.product_url,
        'qty', r.qty, 'unit_cost', (SELECT unit_cost FROM public.ffe_item_costs WHERE item_id = r.id),
        'line_total', public.ws_ffe_line_total(r.id)),
      stage = 'Issue / Replacement'
     WHERE id = r.id;
    PERFORM set_config('ws.reviewing', '', true);

    names := names || CASE WHEN names = '' THEN '' ELSE E'\n' END || coalesce(r.ref || ' · ', '') || r.item;
    cnt := cnt + 1;
  END LOOP;

  IF cnt = 0 THEN RAISE EXCEPTION 'Those items are already waiting on the designer'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = proj;
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();

  IF p.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (p.designer_id, 'ffe_reselect',
      format('%s — %s item%s out of stock, please re-choose', coalesce(p.client, p.name), cnt,
             CASE WHEN cnt = 1 THEN '' ELSE 's' END),
      n || E'\n\n' || names, p.lead_id, p.id);
    -- tasks_one_parent: a task hangs off the project or the lead, never both.
    INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_at, priority, created_by)
    VALUES (proj,
      format('Re-choose %s out-of-stock item%s', cnt, CASE WHEN cnt = 1 THEN '' ELSE 's' END),
      n || E'\n\n' || names, p.designer_id, now() + interval '48 hours', 'High', auth.uid());
  END IF;

  PERFORM public.ws_ffe_tell_gm(p.lead_id, p.id,
    format('%s — %s put %s item%s on hold as out of stock%s', coalesce(p.client, p.name),
           coalesce(who, 'The coordinator'), cnt, CASE WHEN cnt = 1 THEN '' ELSE 's' END,
           CASE WHEN p.designer_id IS NULL THEN ' — no designer is assigned, so nobody has been asked to re-choose'
                ELSE ', the designer has been asked to re-choose' END),
    n || E'\n\n' || names, false);
  RETURN cnt;
END $function$
;
