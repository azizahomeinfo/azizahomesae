-- proc_pct = share of the project's FF&E items in Delivered/Installed/Closed, rounded; 0 with no items (same as the old client formula).
CREATE OR REPLACE FUNCTION public.ws_recompute_proc_pct(_project uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pct int;
BEGIN
  IF _project IS NULL THEN RETURN; END IF;
  SELECT coalesce(round(100.0 * count(*) FILTER (WHERE stage IN ('Delivered','Installed','Closed')) / nullif(count(*), 0))::int, 0)
    INTO pct FROM public.ffe_items WHERE project_id = _project;
  PERFORM set_config('ws.deriving', 'on', true);
  UPDATE public.projects SET proc_pct = pct WHERE id = _project AND proc_pct IS DISTINCT FROM pct;
  PERFORM set_config('ws.deriving', '', true);
END $$;
REVOKE ALL ON FUNCTION public.ws_recompute_proc_pct(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_proc_pct_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM public.ws_recompute_proc_pct(OLD.project_id); END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
    PERFORM public.ws_recompute_proc_pct(NEW.project_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER ffe_items_proc_pct AFTER INSERT OR DELETE OR UPDATE OF stage, project_id ON public.ffe_items
  FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_proc_pct_trg();

-- overall_pct is derived from the stage's position in the active pipeline; proc_pct only via ws_recompute_proc_pct (ws.deriving).
CREATE OR REPLACE FUNCTION public.ws_project_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
END $$;
REVOKE UPDATE (proc_pct, overall_pct) ON public.projects FROM authenticated;