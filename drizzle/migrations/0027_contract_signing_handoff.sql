ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS drawing_kind text
  CHECK (drawing_kind IN ('Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations'));
COMMENT ON COLUMN public.tasks.drawing_kind IS 'Set on the four post-signing drawing tasks; closed when a project_files row with the same category is uploaded.';
ALTER TABLE public.ffe_items ADD COLUMN IF NOT EXISTS priority_band smallint CHECK (priority_band BETWEEN 1 AND 5);
COMMENT ON COLUMN public.ffe_items.priority_band IS 'Coordinator purchasing override (1 large furniture … 5 decor). NULL = derived from room/item in the app.';
GRANT SELECT (drawing_kind), INSERT (drawing_kind), UPDATE (drawing_kind) ON public.tasks TO authenticated;
GRANT SELECT (priority_band), INSERT (priority_band), UPDATE (priority_band) ON public.ffe_items TO authenticated;

-- Signed is reachable only through ws_sign_contract, so a project always exists behind a signed contract.
CREATE OR REPLACE FUNCTION public.ws_contract_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.proposal_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = NEW.proposal_id AND p.lead_id = NEW.lead_id AND p.status = 'Accepted') THEN
      RAISE EXCEPTION 'A contract needs an accepted proposal for this lead';
    END IF;
  END IF;
  IF NEW.status = 'Signed' AND (TG_OP = 'INSERT' OR OLD.status <> 'Signed')
     AND coalesce(current_setting('ws.signing', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Mark the contract signed with a handover date';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.source := CASE WHEN NEW.proposal_id IS NULL THEN 'direct' ELSE 'proposal' END;
  ELSE
    NEW.source := OLD.source;
  END IF;
  RETURN NEW;
END $function$;

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
REVOKE ALL ON FUNCTION public.ws_sign_contract(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_sign_contract(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_drawing_uploaded()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tasks SET done = true, done_at = now()
   WHERE project_id = NEW.project_id AND drawing_kind = NEW.category AND NOT done;
  RETURN NEW;
END $function$;
CREATE TRIGGER project_files_close_drawing AFTER INSERT ON public.project_files
  FOR EACH ROW WHEN (NEW.category IN ('Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations'))
  EXECUTE FUNCTION public.ws_drawing_uploaded();

-- Once per project per assignee, when the 2-day window lapses.
CREATE OR REPLACE FUNCTION public.ws_notify_overdue_drawings()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, lead_id, project_id)
  SELECT t.assignee_id, 'drawings_overdue',
         coalesce(p.client, p.name) || ' — ' || count(*) || ' drawing' || CASE WHEN count(*) = 1 THEN '' ELSE 's' END || ' overdue',
         p.lead_id, p.id
    FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
   WHERE t.drawing_kind IS NOT NULL AND NOT t.done AND t.due_date < current_date AND t.assignee_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = t.assignee_id AND n.project_id = p.id AND n.kind = 'drawings_overdue')
   GROUP BY t.assignee_id, p.id, p.client, p.name, p.lead_id;
END $function$;
REVOKE ALL ON FUNCTION public.ws_notify_overdue_drawings() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('ws-drawings-overdue', '15 * * * *', 'select public.ws_notify_overdue_drawings()');