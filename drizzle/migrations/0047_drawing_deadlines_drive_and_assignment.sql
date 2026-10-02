CREATE OR REPLACE FUNCTION public.ws_drawing_kinds()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT ARRAY['Cabinet drawings','Furniture drawings','Wall design drawings','Hanging items, light fixtures & wall art']
$function$
;

CREATE OR REPLACE FUNCTION public.ws_drawing_hours(_kind text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE _kind WHEN 'Cabinet drawings' THEN 24 WHEN 'Furniture drawings' THEN 48
    WHEN 'Wall design drawings' THEN 72 WHEN 'Hanging items, light fixtures & wall art' THEN 72 END
$function$
;

CREATE OR REPLACE FUNCTION public.ws_sync_drawing_task(_project uuid, _kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE has boolean;
BEGIN
  IF _project IS NULL OR _kind IS NULL THEN RETURN; END IF;
  has := EXISTS (SELECT 1 FROM public.project_files
                  WHERE project_id = _project AND category = _kind AND in_drive);
  PERFORM set_config('ws.drawing_sync', 'on', true);
  UPDATE public.tasks SET done = has, done_at = CASE WHEN has THEN coalesce(done_at, now()) ELSE NULL END
   WHERE project_id = _project AND drawing_kind = _kind AND done IS DISTINCT FROM has;
  PERFORM set_config('ws.drawing_sync', '', true);
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_create_drawing_tasks(_project uuid, _lead uuid, _designer uuid, _title text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t0 timestamptz; k text; f text := 'HH24:MI Dy DD Mon'; body text := '';
BEGIN
  IF _designer IS NULL THEN RETURN; END IF;
  SELECT created_at INTO t0 FROM public.projects WHERE id = _project;
  t0 := coalesce(t0, now());
  FOREACH k IN ARRAY public.ws_drawing_kinds() LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE project_id = _project AND drawing_kind = k) THEN
      INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_at, priority, drawing_kind, created_by)
      VALUES (_project, k,
        'Upload to the project''s Files under "' || k || '", then tick "also in the client''s Google Drive folder" — '
        || 'the task closes only when both are done. Due ' || public.ws_drawing_hours(k) || 'h after the project started.',
        _designer, t0 + make_interval(hours => public.ws_drawing_hours(k)), 'High', k, auth.uid());
    END IF;
    body := body || CASE WHEN body = '' THEN '' ELSE ' · ' END || k || ' by '
         || to_char((t0 + make_interval(hours => public.ws_drawing_hours(k))) AT TIME ZONE 'Asia/Dubai', f);
  END LOOP;
  INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
  VALUES (_designer, 'drawings', _title || ' — drawings due, cabinets first',
    body || ' (Dubai time). Every drawing must also go in the client''s Google Drive folder; '
         || 'each one reaches the coordinator as soon as it is uploaded and ticked.', _lead, _project);
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_assign_project_designer(_project uuid, _designer uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.projects;
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM assigns a designer to a project'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF _designer IS NOT NULL AND public.ws_role(_designer) <> 'designer' THEN
    RAISE EXCEPTION 'That person is not a designer';
  END IF;
  UPDATE public.projects SET designer_id = _designer WHERE id = _project;
  IF _designer IS NOT NULL THEN
    PERFORM public.ws_create_drawing_tasks(_project, p.lead_id, _designer, coalesce(p.client, p.name));
  END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_assign_lead_designer(_lead uuid, _designer uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.leads; pid uuid; nm text;
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM assigns a designer'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _designer IS NOT NULL AND public.ws_role(_designer) <> 'designer' THEN
    RAISE EXCEPTION 'That person is not a designer';
  END IF;

  UPDATE public.leads SET designer_id = _designer WHERE id = _lead;
  UPDATE public.requirement_briefs
     SET designer_id = _designer,
         assigned_at = CASE WHEN _designer IS NULL THEN NULL ELSE coalesce(assigned_at, now()) END,
         status = CASE WHEN status = 'Submitted' AND _designer IS NOT NULL THEN 'Assigned' ELSE status END
   WHERE lead_id = _lead;

  SELECT id INTO pid FROM public.projects WHERE lead_id = _lead;
  IF pid IS NOT NULL THEN
    UPDATE public.projects SET designer_id = _designer WHERE id = pid;
    IF _designer IS NOT NULL THEN
      SELECT coalesce(client, name) INTO nm FROM public.projects WHERE id = pid;
      PERFORM public.ws_create_drawing_tasks(pid, _lead, _designer, nm);
    END IF;
  END IF;

  IF _designer IS NOT NULL AND pid IS NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id)
    VALUES (_designer, 'brief', l.name || ' — assigned to you', 'Open the brief and start the design.', _lead);
  END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_project_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u uuid := auth.uid();
  pipe text[] := ARRAY['Contract / Deposit','Design','Production','Installation','Snagging','Handover','Closed'];
  i int;
BEGIN
  IF NEW.stage IN ('Site Survey','Client Approval','Procurement')
     AND (TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    RAISE EXCEPTION '% is no longer a project stage — the pipeline is Contract / Deposit → Design → Production → Installation → Snagging → Handover → Closed', NEW.stage;
  END IF;
  IF current_setting('ws.deriving', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.proc_pct := OLD.proc_pct; ELSE NEW.proc_pct := 0; END IF;
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    i := array_position(pipe, NEW.stage::text);
    IF i IS NOT NULL THEN NEW.overall_pct := round(100.0 * (i - 1) / (array_length(pipe, 1) - 1)); END IF;
  ELSE
    NEW.overall_pct := OLD.overall_pct;
  END IF;
  IF TG_OP = 'UPDATE' AND u IS NOT NULL AND NOT public.is_gm(u) THEN
    -- Only the GM assigns. designer_id/coordinator_id/sales_id are UPDATE-granted and RLS lets any
    -- assigned staff member write the row, so this trigger is the real boundary.
    IF (NEW.designer_id, NEW.coordinator_id, NEW.sales_id)
       IS DISTINCT FROM (OLD.designer_id, OLD.coordinator_id, OLD.sales_id) THEN
      RAISE EXCEPTION 'Only the GM assigns people to a project';
    END IF;
    IF (NEW.stage, NEW.risk) IS DISTINCT FROM (OLD.stage, OLD.risk) AND OLD.coordinator_id IS DISTINCT FROM u THEN
      RAISE EXCEPTION 'Only the coordinator or the GM can move the project forward';
    END IF;
    IF (NEW.received, NEW.pay_status, NEW.next_due, NEW.next_due_date, NEW.handover_date)
       IS DISTINCT FROM (OLD.received, OLD.pay_status, OLD.next_due, OLD.next_due_date, OLD.handover_date)
       AND OLD.sales_id IS DISTINCT FROM u THEN
      RAISE EXCEPTION 'Only the sales owner or the GM can change payments or the handover date';
    END IF;
  END IF;
  RETURN NEW;
END $function$
;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_drawing_kind_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_drawing_kind_check
  CHECK (drawing_kind IS NULL OR drawing_kind = ANY (public.ws_drawing_kinds()));
ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS in_drive boolean NOT NULL DEFAULT false;
GRANT SELECT (in_drive), INSERT (in_drive), UPDATE (in_drive) ON public.project_files TO authenticated;
DROP TRIGGER IF EXISTS project_files_drawing_sync ON public.project_files;
CREATE TRIGGER project_files_drawing_sync
AFTER INSERT OR UPDATE OF category, project_id, in_drive OR DELETE ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.ws_drawing_changed();
REVOKE ALL ON FUNCTION public.ws_assign_project_designer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_assign_project_designer(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.ws_assign_lead_designer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_assign_lead_designer(uuid, uuid) TO authenticated;
