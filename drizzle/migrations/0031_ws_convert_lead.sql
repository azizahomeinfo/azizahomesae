-- Fast path: Won lead -> project without a system contract.
CREATE OR REPLACE FUNCTION public.ws_convert_lead(_lead uuid, _handover date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE l public.leads; pid uuid; coord uuid; due date := current_date + 2; k text; u uuid; n int; code text;
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
    sales_id, designer_id, coordinator_id, start_date, handover_date, value, stage, created_by)
  VALUES (l.id, l.name, l.name, l.property, l.building, l.unit_type, l.location, l.drive_url,
    l.sales_id, l.designer_id, coord, current_date, _handover, l.budget, 'Contract / Deposit', auth.uid())
  RETURNING id, projects.code INTO pid, code;

  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  -- Suppress the "list arrived" trigger; this function sends the coordinator message itself.
  PERFORM set_config('ws.converting', 'on', true);
  PERFORM public.ws_seed_ffe_from_brief(l.id, pid);
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  PERFORM set_config('ws.converting', '', true);
  SELECT count(*) INTO n FROM public.ffe_items WHERE project_id = pid;

  IF l.designer_id IS NOT NULL THEN
    FOREACH k IN ARRAY ARRAY['Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations'] LOOP
      INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_date, priority, drawing_kind, created_by)
      VALUES (pid, k, 'Upload to the project''s Files under "' || k || '" — the task closes on upload.', l.designer_id, due, 'High', k, auth.uid());
    END LOOP;
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (l.designer_id, 'drawings', l.name || ' won — 4 drawings due ' || to_char(due, 'DD Mon YYYY'),
      'Wall design, furniture and cabinet drawings, and artwork locations — upload each to the project so the coordinator can start procurement.', l.id, pid);
  END IF;

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
END $$;
REVOKE ALL ON FUNCTION public.ws_convert_lead(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_convert_lead(uuid, date) TO authenticated;

-- First FF&E item reaching a project that never had a procurement start: tell the coordinator now.
CREATE OR REPLACE FUNCTION public.ws_ffe_list_arrived() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.projects; u uuid;
BEGIN
  IF NEW.project_id IS NULL OR current_setting('ws.converting', true) = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE project_id = NEW.project_id AND kind = 'procurement') THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', p.code || ' — FF&E list has arrived, procurement can start',
      'Large furniture first, decor last.', p.lead_id, p.id);
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER ffe_items_list_arrived AFTER INSERT OR UPDATE OF project_id ON public.ffe_items
  FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_list_arrived();

-- Deal-record categories (signed contract, proposal): sales/GM upload only.
ALTER POLICY "project files: project staff add" ON public.project_files
  WITH CHECK (can_see_project(auth.uid(), project_id) AND uploaded_by = auth.uid()
    AND (category IS NULL OR category NOT IN ('Signed contract','Proposal') OR ws_role(auth.uid()) IN ('sales','gm')));
ALTER POLICY "project files: uploader or GM edits" ON public.project_files
  WITH CHECK (can_see_project(auth.uid(), project_id)
    AND (category IS NULL OR category NOT IN ('Signed contract','Proposal') OR ws_role(auth.uid()) IN ('sales','gm')));

-- Unattached leftover; make it drawing-only in case anything ever wires it up.
CREATE OR REPLACE FUNCTION public.ws_drawing_uploaded() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.category = ANY (ARRAY['Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations']) THEN
    PERFORM public.ws_sync_drawing_task(NEW.project_id, NEW.category);
  END IF;
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.ws_drawing_uploaded() IS 'DEPRECATED: not attached; ws_drawing_changed is the live drawing trigger';