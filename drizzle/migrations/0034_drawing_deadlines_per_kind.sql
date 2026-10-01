ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_drawing_kind_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_drawing_kind_check CHECK (drawing_kind = ANY (ARRAY['Cabinet drawings','Furniture drawings','Wall design drawings','Hanging & light fixtures instructions']));
COMMENT ON COLUMN public.tasks.due_at IS 'Exact deadline; source of truth for lateness. due_date is derived from it (Dubai calendar day) by tasks_due_from_at.';

CREATE OR REPLACE FUNCTION public.ws_task_due_from_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.due_at IS NOT NULL THEN NEW.due_date := (NEW.due_at AT TIME ZONE 'Asia/Dubai')::date; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tasks_due_from_at ON public.tasks;
CREATE TRIGGER tasks_due_from_at BEFORE INSERT OR UPDATE OF due_at, due_date ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.ws_task_due_from_at();

CREATE OR REPLACE FUNCTION public.ws_drawing_kinds() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['Cabinet drawings','Furniture drawings','Wall design drawings','Hanging & light fixtures instructions'] $$;
CREATE OR REPLACE FUNCTION public.ws_drawing_hours(_kind text) RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _kind WHEN 'Cabinet drawings' THEN 24 WHEN 'Furniture drawings' THEN 48
    WHEN 'Wall design drawings' THEN 48 WHEN 'Hanging & light fixtures instructions' THEN 72 END $$;

CREATE OR REPLACE FUNCTION public.ws_create_drawing_tasks(_project uuid, _lead uuid, _designer uuid, _title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t0 timestamptz := now(); k text;
  f text := 'HH24:MI Dy DD Mon';
BEGIN
  IF _designer IS NULL THEN RETURN; END IF;
  FOREACH k IN ARRAY public.ws_drawing_kinds() LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE project_id = _project AND drawing_kind = k) THEN
      INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_at, priority, drawing_kind, created_by)
      VALUES (_project, k, 'Upload to the project''s Files under "' || k || '" — the task closes on upload. Due '
        || public.ws_drawing_hours(k) || 'h after signing.', _designer, t0 + make_interval(hours => public.ws_drawing_hours(k)), 'High', k, auth.uid());
    END IF;
  END LOOP;
  INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
  VALUES (_designer, 'drawings', _title || ' — 4 drawings due, cabinets first',
    'Cabinet drawings by ' || to_char((t0 + interval '24 hours') AT TIME ZONE 'Asia/Dubai', f)
    || ' · Furniture and wall design drawings by ' || to_char((t0 + interval '48 hours') AT TIME ZONE 'Asia/Dubai', f)
    || ' · Hanging & light fixtures instructions by ' || to_char((t0 + interval '72 hours') AT TIME ZONE 'Asia/Dubai', f)
    || ' (Dubai time). Each upload goes straight to the coordinator.', _lead, _project);
END $$;
REVOKE EXECUTE ON FUNCTION public.ws_create_drawing_tasks(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

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

  IF n > 0 THEN
    FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (u, 'procurement', l.name || ' won — FF&E procurement starts, handover ' || to_char(_handover, 'DD Mon YYYY'),
        'Large furniture first, decor last.', l.id, pid);
    END LOOP;
  ELSE
    FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (u, 'project', l.name || ' is now a project — handover ' || to_char(_handover, 'DD Mon YYYY'),
        'No FF&E list yet. Nothing to buy until it arrives — you''ll be notified.', l.id, pid);
    END LOOP;
  END IF;
  RETURN jsonb_build_object('project_id', pid, 'code', code, 'items', n);
END $function$;

CREATE OR REPLACE FUNCTION public.ws_sign_contract(_contract uuid, _handover date)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.contracts; l public.leads; pid uuid; coord uuid; sub numeric; tot numeric; u uuid;
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
      sales_id, designer_id, coordinator_id, start_date, handover_date, stage, created_by)
    VALUES (l.id, coalesce(nullif(c.doc->>'client',''), l.name), coalesce(nullif(c.doc->>'client',''), l.name),
      l.property, coalesce(nullif(c.doc->>'unit',''), l.building), l.unit_type, l.location, l.drive_url,
      l.sales_id, l.designer_id, coord, current_date, _handover, 'Contract / Deposit', auth.uid())
    RETURNING id INTO pid;
  ELSE
    UPDATE public.projects SET handover_date = _handover,
      coordinator_id = coalesce(coordinator_id, coord) WHERE id = pid;
  END IF;
  INSERT INTO public.project_value_private (project_id, value) VALUES (pid, tot)
    ON CONFLICT (project_id) DO UPDATE SET value = EXCLUDED.value;

  PERFORM set_config('ws.signing', 'on', true);
  UPDATE public.contracts SET status = 'Signed' WHERE id = c.id;
  PERFORM set_config('ws.signing', '', true);
  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;

  PERFORM public.ws_create_drawing_tasks(pid, l.id, l.designer_id, l.name || ' signed');

  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', l.name || ' signed — FF&E procurement starts, handover ' || to_char(_handover, 'DD Mon YYYY'),
      'Large furniture first, decor last.', l.id, pid);
  END LOOP;
  RETURN pid;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_drawing_changed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE kinds text[] := public.ws_drawing_kinds(); p public.projects; u uuid; ttl text;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.category = ANY (kinds) THEN PERFORM public.ws_sync_drawing_task(OLD.project_id, OLD.category); END IF;
  IF TG_OP <> 'DELETE' AND NEW.category = ANY (kinds) THEN
    PERFORM public.ws_sync_drawing_task(NEW.project_id, NEW.category);
    SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
    ttl := CASE WHEN TG_OP = 'UPDATE' OR EXISTS (SELECT 1 FROM public.project_files
                  WHERE project_id = p.id AND category = NEW.category AND id <> NEW.id AND created_at < now() - interval '15 minutes')
                THEN format('%s: %s updated — check against anything already ordered', p.code, NEW.category)
                ELSE format('%s: %s uploaded — ready for purchasing', p.code, NEW.category) END;
    FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
      IF u IS DISTINCT FROM auth.uid() AND NOT EXISTS (SELECT 1 FROM public.notifications n
           WHERE n.user_id = u AND n.project_id = p.id AND n.kind = 'drawing_uploaded'
             AND n.body = NEW.category AND n.created_at > now() - interval '15 minutes') THEN
        INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
        VALUES (u, 'drawing_uploaded', ttl, NEW.category, p.lead_id, p.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_notify_overdue_drawings()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
  SELECT t.assignee_id, 'drawings_overdue',
         coalesce(p.client, p.name) || ' — ' || t.drawing_kind || ' overdue', t.drawing_kind, p.lead_id, p.id
    FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
   WHERE t.drawing_kind IS NOT NULL AND NOT t.done AND t.assignee_id IS NOT NULL
     AND coalesce(t.due_at, (t.due_date + 1)::timestamp AT TIME ZONE 'Asia/Dubai') < now()
     AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = t.assignee_id AND n.project_id = p.id
                       AND n.kind = 'drawings_overdue' AND n.body = t.drawing_kind);
END $function$;