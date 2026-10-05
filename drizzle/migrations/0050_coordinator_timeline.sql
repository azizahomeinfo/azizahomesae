-- 0050 coordinator_timeline — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- Coordinator deadline tasks: rows in public.tasks carrying auto_kind.
-- Function bodies are pg_get_functiondef output from the live database.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS auto_kind text;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_auto_kind_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_auto_kind_check CHECK (((auto_kind IS NULL) OR (auto_kind = ANY (ARRAY['order_fast'::text, 'order_rest'::text, 'order_drawing'::text, 'delivered'::text, 'handyman'::text, 'wallpaper'::text, 'operations'::text, 'qc'::text]))));

CREATE UNIQUE INDEX IF NOT EXISTS tasks_auto_once ON public.tasks USING btree (project_id, auto_kind, COALESCE(drawing_kind, ''::text)) WHERE (auto_kind IS NOT NULL);

GRANT SELECT (auto_kind) ON public.tasks TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_handover_due(_handover date, _days_before integer)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$ select ((_handover - _days_before) + time '18:00') at time zone 'Asia/Dubai' $function$;

CREATE OR REPLACE FUNCTION public.ws_buy_task(_project uuid, _kind text, _title text, _detail text, _due timestamp with time zone, _drawing text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- One auto task per project per kind (per drawing where relevant). Re-running moves the date of an
-- open task and never duplicates; a task already ticked is left alone.
DECLARE who uuid;
BEGIN
  IF _due IS NULL THEN RETURN; END IF;
  SELECT coordinator_id INTO who FROM public.projects WHERE id = _project;
  IF who IS NULL THEN SELECT * INTO who FROM public.ws_project_coordinators(_project) LIMIT 1; END IF;
  IF who IS NULL THEN RETURN; END IF;
  INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_at, priority, auto_kind, drawing_kind, created_by)
  VALUES (_project, _title, _detail, who, _due, 'High', _kind, _drawing, auth.uid())
  ON CONFLICT (project_id, auto_kind, coalesce(drawing_kind,'')) WHERE auto_kind IS NOT NULL
  DO UPDATE SET due_at = excluded.due_at, assignee_id = excluded.assignee_id
  WHERE public.tasks.done = false;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_handover_tasks(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- The handover run, counted back from projects.handover_date, 18:00 Dubai on each day.
DECLARE h date;
BEGIN
  SELECT handover_date INTO h FROM public.projects WHERE id = _project;
  IF h IS NULL THEN RETURN; END IF;
  PERFORM public.ws_buy_task(_project,'delivered','Everything delivered on site',
    'Every item on the FF&E list must be on site by now — three days before handover.', public.ws_handover_due(h,3));
  PERFORM public.ws_buy_task(_project,'handyman','Ali on site — light fixtures, wall art, appliances',
    'Arrange Ali for the light fixtures, hanging the wall art and the appliance installation.', public.ws_handover_due(h,3));
  PERFORM public.ws_buy_task(_project,'wallpaper','Wallpaper installed (if applicable)',
    'Arrange the wallpaper the same day as Ali. Close this if the project has none.', public.ws_handover_due(h,3));
  PERFORM public.ws_buy_task(_project,'operations','Operations — unpack and set up',
    'Operations team unpacks everything and does the operation work.', public.ws_handover_due(h,2));
  PERFORM public.ws_buy_task(_project,'qc','On site — quality check everything',
    'Be on site, double-check every item and finish, and raise snags for anything wrong.', public.ws_handover_due(h,2));
END $function$;

CREATE OR REPLACE FUNCTION public.ws_sync_drawing_task(_project uuid, _kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- auto_kind IS NULL keeps this to the designer's drawing task: the coordinator's "order from the
-- <drawing>" task carries the same drawing_kind and must not be ticked by an upload.
DECLARE has boolean;
BEGIN
  IF _project IS NULL OR _kind IS NULL THEN RETURN; END IF;
  has := EXISTS (SELECT 1 FROM public.project_files WHERE project_id = _project AND category = _kind AND in_drive);
  PERFORM set_config('ws.drawing_sync', 'on', true);
  UPDATE public.tasks SET done = has, done_at = CASE WHEN has THEN coalesce(done_at, now()) ELSE NULL END
   WHERE project_id = _project AND drawing_kind = _kind AND auto_kind IS NULL AND done IS DISTINCT FROM has;
  PERFORM set_config('ws.drawing_sync', '', true);
  IF has THEN
    PERFORM public.ws_buy_task(_project,'order_drawing','Order from the ' || _kind,
      'The ' || _kind || ' are in — order everything they specify within 24 hours.', now() + interval '24 hours', _kind);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_confirm_ffe_list(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.projects;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR (p.designer_id IS NOT NULL AND p.designer_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the project''s designer or the GM can confirm the FF&E list';
  END IF;
  IF p.confirmed_at IS NOT NULL THEN RAISE EXCEPTION 'The FF&E list is already confirmed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ffe_items WHERE project_id = _project) THEN
    RAISE EXCEPTION 'This project has no FF&E items — there is nothing to buy. Build the FF&E list before confirming it';
  END IF;
  PERFORM set_config('ws.confirming', 'on', true);
  UPDATE public.projects SET confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _project;
  PERFORM set_config('ws.confirming', '', true);
  PERFORM public.ws_release_procurement(_project, coalesce(p.client, p.name) || ' — FF&E list confirmed, procurement can start');
  PERFORM public.ws_buy_task(_project,'order_fast','Order online & large furniture',
    'Pan Home, Home Centre, Home Box and the large furniture — ordered within 24 hours of the list being confirmed.',
    now() + interval '24 hours');
  PERFORM public.ws_buy_task(_project,'order_rest','Order everything else on the list',
    'The rest of the FF&E list — ordered within 72 hours of the list being confirmed.',
    now() + interval '72 hours');
  PERFORM public.ws_handover_tasks(_project);
END $function$;

CREATE OR REPLACE FUNCTION public.ws_handover_tasks_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.handover_date IS DISTINCT FROM OLD.handover_date THEN PERFORM public.ws_handover_tasks(NEW.id); END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS projects_handover_tasks ON public.projects;
CREATE TRIGGER projects_handover_tasks AFTER UPDATE OF handover_date ON public.projects FOR EACH ROW EXECUTE FUNCTION ws_handover_tasks_trg();
