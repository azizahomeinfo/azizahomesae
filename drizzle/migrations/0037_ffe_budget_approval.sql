ALTER TABLE public.ffe_costings ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'quote';
ALTER TABLE public.ffe_costings ADD CONSTRAINT ffe_costings_purpose_check CHECK (purpose IN ('quote','budget'));
COMMENT ON COLUMN public.ffe_costings.purpose IS 'quote = GM prices the client (proposal route); budget = GM approves internal spend against an externally signed contract (Quoted = approved, Returned = sent back). Set only by ws_submit_budget.';
GRANT SELECT (purpose) ON public.ffe_costings TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_needs_budget(_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project
    AND NOT EXISTS (SELECT 1 FROM public.contracts c WHERE c.lead_id = p.lead_id AND c.status = 'Signed'))
$$;

CREATE OR REPLACE FUNCTION public.ws_ffe_gaps(_project uuid, OUT total int, OUT no_supplier int, OUT no_link int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int,
         count(*) FILTER (WHERE supplier_id IS NULL AND coalesce(btrim(supplier_name), '') = '')::int,
         count(*) FILTER (WHERE coalesce(btrim(product_url), '') = '')::int
    FROM public.ffe_items WHERE project_id = _project
$$;

CREATE OR REPLACE FUNCTION public.ws_costing_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); gm boolean;
begin
  if uid is null then return new; end if;
  gm := public.is_gm(uid);
  if not gm and coalesce(current_setting('ws.budget', true), '') <> 'on'
     and (tg_op = 'INSERT' and new.purpose <> 'quote' or tg_op = 'UPDATE' and new.purpose is distinct from old.purpose) then
    raise exception 'Budget approval starts only from "Submit for budget approval"';
  end if;
  if tg_op = 'INSERT' then
    if not gm and (new.status not in ('Draft','Submitted') or new.options <> '[]'::jsonb or new.version <> 1
                   or new.quoted_by is not null or new.quoted_at is not null) then
      raise exception 'Only the GM can set the quotation';
    end if;
    return new;
  end if;
  if not gm and (new.options is distinct from old.options
                 or new.version is distinct from old.version
                 or (new.status is distinct from old.status and new.status in ('Quoted','Returned'))
                 or new.quoted_at is distinct from old.quoted_at
                 or new.quoted_by is distinct from old.quoted_by) then
    raise exception 'Only the GM can set the quotation';
  end if;
  if not gm and new.status is distinct from old.status
     and public.ws_role(uid) is distinct from 'designer' then
    raise exception 'Only the designer or the GM can submit the FF&E list';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.ws_submit_budget(_project uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  IF g.no_link > 0 THEN missing := missing || format('%s item%s no purchase link', g.no_link, CASE WHEN g.no_link = 1 THEN ' has' ELSE 's have' END); END IF;
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

  SELECT coalesce(sum(i.qty * c.unit_cost), 0) INTO cost FROM public.ffe_items i
    LEFT JOIN public.ffe_item_costs c ON c.item_id = i.id WHERE i.project_id = _project;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'gm' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'budget', p.code || ' — FF&E budget approval needed',
      g.total || ' items, cost AED ' || to_char(cost, 'FM999,999,999') || '. The client price is already agreed; this approves internal spend.', p.lead_id, p.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ws_decide_budget(_project uuid, _approve boolean, _note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.projects; c public.ffe_costings; u uuid; n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM can approve the FF&E budget'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project;
  SELECT * INTO c FROM public.ffe_costings WHERE project_id = _project FOR UPDATE;
  IF c.id IS NULL OR c.purpose <> 'budget' OR c.status <> 'Submitted' THEN
    RAISE EXCEPTION 'There is no FF&E list waiting for budget approval on this project';
  END IF;
  IF NOT _approve AND n IS NULL THEN RAISE EXCEPTION 'Say what needs changing before sending the list back'; END IF;
  INSERT INTO public.ffe_costing_private (costing_id, markup_pct) VALUES (c.id, 0) ON CONFLICT (costing_id) DO NOTHING;
  IF _approve THEN
    UPDATE public.ffe_costings SET status = 'Quoted', quoted_at = now(), quoted_by = auth.uid() WHERE id = c.id;
    UPDATE public.ffe_costing_private SET gm_notes = n, return_note = NULL WHERE costing_id = c.id;
    FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (u, 'procurement', p.code || ' — FF&E budget approved, procurement can start',
        coalesce(n || ' · ', '') || 'Large furniture first, decor last.', p.lead_id, p.id);
    END LOOP;
    IF p.designer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, lead_id, project_id)
      VALUES (p.designer_id, 'budget', p.code || ' — FF&E budget approved', p.lead_id, p.id);
    END IF;
  ELSE
    UPDATE public.ffe_costings SET status = 'Returned' WHERE id = c.id;
    UPDATE public.ffe_costing_private SET return_note = n WHERE costing_id = c.id;
    FOR u IN SELECT coalesce(p.designer_id, m.user_id) FROM public.workspace_members m
              WHERE (p.designer_id IS NULL AND m.role = 'gm' AND m.active AND m.user_id <> auth.uid()) OR (p.designer_id IS NOT NULL AND m.user_id = p.designer_id) LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (u, 'budget', p.code || ' — FF&E budget sent back', n, p.lead_id, p.id);
    END LOOP;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ws_notify_ffe_completion(_project uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
      CASE WHEN p.designer_id IS NULL THEN 'No designer is assigned — assign one to fill in the supplier and purchase link. ' ELSE '' END
      || g.no_supplier || ' of ' || g.total || ' items have no supplier, ' || g.no_link || ' no purchase link. Then submit for budget approval.', p.lead_id, p.id);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.ws_notify_ffe_completion(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_list_arrived()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.projects; u uuid;
BEGIN
  IF NEW.project_id IS NULL OR current_setting('ws.converting', true) = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE project_id = NEW.project_id AND kind = 'procurement') THEN RETURN NULL; END IF;
  IF public.ws_needs_budget(NEW.project_id) THEN
    PERFORM public.ws_notify_ffe_completion(NEW.project_id);
    RETURN NULL;
  END IF;
  SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', p.code || ' — FF&E list has arrived, procurement can start',
      'Large furniture first, decor last.', p.lead_id, p.id);
  END LOOP;
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_convert_lead(_lead uuid, _handover date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.leads; pid uuid; coord uuid; u uuid; n int; code text;
BEGIN
  IF _handover IS NULL THEN RAISE EXCEPTION 'Enter the handover date to convert this lead into a project'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR l.sales_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the sales owner or the GM can convert a lead into a project';
  END IF;
  IF l.converted_project_id IS NOT NULL THEN RAISE EXCEPTION 'This lead is already a project'; END IF;
  IF l.status = 'Lost' THEN RAISE EXCEPTION 'Reopen this lost lead before converting it'; END IF;

  SELECT user_id INTO coord FROM public.workspace_members WHERE role = 'coordinator' AND active ORDER BY created_at LIMIT 1;
  INSERT INTO public.projects (lead_id, name, client, property, unit, unit_type, location, drive_url,
    sales_id, designer_id, coordinator_id, start_date, handover_date, stage, created_by)
  VALUES (l.id, l.name, l.name, l.property, l.building, l.unit_type, l.location, l.drive_url,
    l.sales_id, l.designer_id, coord, current_date, _handover, 'Contract / Deposit', auth.uid())
  RETURNING id, projects.code INTO pid, code;
  INSERT INTO public.project_value_private (project_id, value) VALUES (pid, l.budget);

  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  PERFORM set_config('ws.converting', 'on', true);
  PERFORM public.ws_seed_ffe_from_brief(l.id, pid);
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  PERFORM set_config('ws.converting', '', true);
  SELECT count(*) INTO n FROM public.ffe_items WHERE project_id = pid;

  PERFORM public.ws_create_drawing_tasks(pid, l.id, l.designer_id, l.name || ' won');

  -- No contract signed in the system: the list goes designer -> GM budget approval -> coordinator.
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', l.name || ' is now a project — handover ' || to_char(_handover, 'DD Mon YYYY'),
      CASE WHEN n > 0 THEN 'FF&E list is waiting for the designer and GM budget approval. Nothing to buy yet — you''ll be notified on approval.'
           ELSE 'No FF&E list yet. Nothing to buy until it is built and approved — you''ll be notified.' END, l.id, pid);
  END LOOP;
  IF n > 0 THEN PERFORM public.ws_notify_ffe_completion(pid); END IF;
  RETURN jsonb_build_object('project_id', pid, 'code', code, 'items', n);
END $function$;