-- 0053 on_site_by_override — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- projects.on_site_by overrides the "on site 3 days before handover" rule for a compressed job.
-- Function bodies are pg_get_functiondef output; the trigger is pg_get_triggerdef output.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS on_site_by date;
COMMENT ON COLUMN public.projects.on_site_by IS 'Overrides the "on site 3 days before handover" rule for a compressed job.';
GRANT SELECT (on_site_by), UPDATE (on_site_by) ON public.projects TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_handover_tasks(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- Delivery run counted back from handover: on site 3 days before, setting-up the day after that.
-- projects.on_site_by overrides the 3-day rule for a compressed job; the setting-up day follows it,
-- unless that would land on handover day itself, in which case it shares the on-site day.
DECLARE h date; on_site date; later date;
BEGIN
  SELECT handover_date, coalesce(on_site_by, handover_date - 3) INTO h, on_site FROM public.projects WHERE id = _project;
  IF h IS NULL OR on_site IS NULL THEN RETURN; END IF;
  later := CASE WHEN on_site + 1 >= h THEN on_site ELSE on_site + 1 END;
  PERFORM public.ws_buy_task(_project,'delivered','Everything delivered on site',
    'Every item on the FF&E list must be on site by now.', (on_site + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'handyman','Ali on site — light fixtures, wall art, appliances',
    'Arrange Ali for the light fixtures, hanging the wall art and the appliance installation.', (on_site + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'wallpaper','Wallpaper installed (if applicable)',
    'Arrange the wallpaper the same day as Ali. Close this if the project has none.', (on_site + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'operations','Operations — unpack and set up',
    'Operations team unpacks everything and does the operation work.', (later + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'qc','On site — quality check everything',
    'Be on site, double-check every item and finish, and raise snags for anything wrong.', (later + time '18:00') at time zone 'Asia/Dubai');
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_handover_tasks_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.handover_date IS DISTINCT FROM OLD.handover_date
     OR NEW.on_site_by IS DISTINCT FROM OLD.on_site_by THEN
    PERFORM public.ws_handover_tasks(NEW.id);
  END IF;
  RETURN NEW;
END $function$
;

DROP TRIGGER IF EXISTS projects_handover_tasks ON public.projects;
CREATE TRIGGER projects_handover_tasks AFTER INSERT OR UPDATE OF handover_date, on_site_by ON public.projects FOR EACH ROW EXECUTE FUNCTION ws_handover_tasks_trg();
