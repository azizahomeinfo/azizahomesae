-- 1. Contract value moves to a private sibling (GM + project's sales owner only).
CREATE TABLE public.project_value_private (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  value numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.project_value_private TO authenticated;
GRANT ALL ON public.project_value_private TO service_role;
ALTER TABLE public.project_value_private ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_see_project_value(_uid uuid, _project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_gm(_uid) OR EXISTS (SELECT 1 FROM public.projects WHERE id = _project AND sales_id = _uid)
$$;
CREATE POLICY "project value: GM and sales owner read" ON public.project_value_private
  FOR SELECT TO authenticated USING (public.can_see_project_value(auth.uid(), project_id));
CREATE POLICY "project value: GM and sales owner add" ON public.project_value_private
  FOR INSERT TO authenticated WITH CHECK (public.can_see_project_value(auth.uid(), project_id));
CREATE POLICY "project value: GM and sales owner edit" ON public.project_value_private
  FOR UPDATE TO authenticated USING (public.can_see_project_value(auth.uid(), project_id))
  WITH CHECK (public.can_see_project_value(auth.uid(), project_id));
CREATE TRIGGER project_value_touch BEFORE UPDATE ON public.project_value_private
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.project_value_private (project_id, value)
  SELECT id, value FROM public.projects WHERE value IS NOT NULL;

REVOKE SELECT (value), INSERT (value), UPDATE (value) ON public.projects FROM authenticated;
COMMENT ON COLUMN public.projects.value IS 'DEPRECATED: replaced by project_value_private.value (not readable by authenticated)';

-- 2. Stage/progress belong to the GM and the coordinator; payment and handover to the GM and sales owner. Legacy stages unreachable.
CREATE OR REPLACE FUNCTION public.ws_project_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF NEW.stage IN ('Site Survey','Client Approval','Procurement')
     AND (TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    RAISE EXCEPTION '% is no longer a project stage — the pipeline is Contract / Deposit → Design → Production → Installation → Snagging → Handover → Closed', NEW.stage;
  END IF;
  IF TG_OP = 'UPDATE' AND u IS NOT NULL AND NOT public.is_gm(u) THEN
    IF (NEW.stage, NEW.overall_pct, NEW.proc_pct, NEW.risk) IS DISTINCT FROM (OLD.stage, OLD.overall_pct, OLD.proc_pct, OLD.risk)
       AND OLD.coordinator_id IS DISTINCT FROM u THEN
      RAISE EXCEPTION 'Only the coordinator or the GM can move the project forward';
    END IF;
    IF (NEW.received, NEW.pay_status, NEW.next_due, NEW.next_due_date, NEW.handover_date)
       IS DISTINCT FROM (OLD.received, OLD.pay_status, OLD.next_due, OLD.next_due_date, OLD.handover_date)
       AND OLD.sales_id IS DISTINCT FROM u THEN
      RAISE EXCEPTION 'Only the sales owner or the GM can change payments or the handover date';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_guard BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.ws_project_guard();

-- 3. Project creators write the value privately.
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