CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text)
RETURNS smallint LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $f$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  -- 1 · Large furniture
  IF n ~ '\m(beds?|sofas?|sectional|wardrobes?|dining tables?|tv unit|tv console|media unit|cabinets?|dressers?|sideboards?|mattress(es)?|headboards?|bunk)\M' THEN RETURN 1; END IF;
  -- 5 · Decor & accessories
  IF n ~ '(decorative|d[eé]cor|faux plant|\mplants?\M|wall art|artwork|\mvases?\M|\mframes?\M|\mmirrors?\M|cushions?|\mthrows?\M|candles?|sculpture|ornament)' THEN RETURN 5; END IF;
  -- 4 · Kitchenware & linen
  IF n ~ '(towel|linen|bedding|duvet|comforter|pillow|\msheets?\M|bath mat|cookware|cutlery|utensil|dinner set|knife|glass|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware|napkin|chopping board)' THEN RETURN 4; END IF;
  -- 3 · Soft furnishings (before the furniture words, so "table lamp" is lighting)
  IF n ~ '(curtain|blind|drape|\mrugs?\M|carpet|lamps?|lighting|\mlights?\M|pendant|chandelier|sconce)' THEN RETURN 3; END IF;
  -- 2 · Other furniture by name — category is unreliable ('General' on seeded rows)
  IF n ~ '\m(tables?|chairs?|nightstands?|bedside|consoles?|stools?|benches|bench|desks?|ottomans?|shelf|shelves|shelving|bookcase|armchairs?|outdoor set|balcony set|patio set|loungers?)\M' THEN RETURN 2; END IF;
  IF c ~ '(kitchenware|tabletop|linen)' THEN RETURN 4; END IF;
  IF c ~ '(furniture|appliance)' THEN RETURN 2; END IF;
  IF c ~ '(d[eé]cor|accessor)' THEN RETURN 5; END IF;
  RETURN 3;
END $f$;

-- Re-banding by the system must not count as a hand override.
CREATE OR REPLACE FUNCTION public.ws_ffe_band_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.priority_band IS NULL THEN
      NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room);
      NEW.priority_band_manual := false;
    ELSE
      NEW.priority_band_manual := true;
    END IF;
    RETURN NEW;
  END IF;
  IF current_setting('ws.reband', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.priority_band IS DISTINCT FROM OLD.priority_band AND OLD.priority_band IS NOT NULL AND NEW.priority_band IS NOT NULL THEN
    NEW.priority_band_manual := true;
  ELSIF NEW.priority_band IS NULL THEN
    NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room);
    NEW.priority_band_manual := false;
  ELSIF NOT OLD.priority_band_manual AND NOT NEW.priority_band_manual
        AND (NEW.item, NEW.category, NEW.room) IS DISTINCT FROM (OLD.item, OLD.category, OLD.room) THEN
    NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room);
  END IF;
  RETURN NEW;
END $f$;

-- Drawing tasks mirror what is uploaded: done iff at least one file of that kind exists on the project.
CREATE OR REPLACE FUNCTION public.ws_sync_drawing_task(_project uuid, _kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE has boolean;
BEGIN
  IF _project IS NULL OR _kind IS NULL THEN RETURN; END IF;
  has := EXISTS (SELECT 1 FROM public.project_files WHERE project_id = _project AND category = _kind);
  PERFORM set_config('ws.drawing_sync', 'on', true);
  UPDATE public.tasks SET done = has, done_at = CASE WHEN has THEN coalesce(done_at, now()) ELSE NULL END
   WHERE project_id = _project AND drawing_kind = _kind AND done IS DISTINCT FROM has;
  PERFORM set_config('ws.drawing_sync', '', true);
END $f$;
REVOKE ALL ON FUNCTION public.ws_sync_drawing_task(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_drawing_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE kinds text[] := ARRAY['Wall design drawings','Furniture drawings','Cabinet drawings','Artwork locations'];
        p public.projects; u uuid; started boolean;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.category = ANY (kinds) THEN PERFORM public.ws_sync_drawing_task(OLD.project_id, OLD.category); END IF;
  IF TG_OP <> 'DELETE' AND NEW.category = ANY (kinds) THEN
    PERFORM public.ws_sync_drawing_task(NEW.project_id, NEW.category);
    -- Uploaded or replaced after buying began: the coordinator may have ordered against the old sheet.
    SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
    started := p.stage >= 'Procurement'
      OR EXISTS (SELECT 1 FROM public.ffe_items WHERE project_id = p.id AND stage <> 'Awaiting Quote');
    IF started AND p.lead_id IS NOT NULL THEN
      FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
        PERFORM public.ws_notify_once(u, p.lead_id, 'drawing_edit', format('%s: drawings updated after procurement started (%s)', p.code, NEW.category));
      END LOOP;
    END IF;
  END IF;
  RETURN NULL;
END $f$;

DROP TRIGGER IF EXISTS project_files_close_drawing ON public.project_files;
DROP TRIGGER IF EXISTS project_files_drawing_sync ON public.project_files;
CREATE TRIGGER project_files_drawing_sync AFTER INSERT OR UPDATE OF category, project_id OR DELETE ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.ws_drawing_changed();

-- Nobody ticks a drawing task by hand; only the upload sync moves it.
CREATE OR REPLACE FUNCTION public.ws_drawing_task_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF OLD.drawing_kind IS NOT NULL AND NEW.done IS DISTINCT FROM OLD.done
     AND coalesce(current_setting('ws.drawing_sync', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Drawing tasks close when the drawing is uploaded to the project, and reopen if every file is deleted';
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS tasks_drawing_guard ON public.tasks;
CREATE TRIGGER tasks_drawing_guard BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.ws_drawing_task_guard();

-- File rows: anyone on the project adds; only the uploader or the GM edits/removes. Signed contracts: sales or GM only.
DROP POLICY IF EXISTS "project files: project staff write" ON public.project_files;
CREATE POLICY "project files: project staff add" ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (public.can_see_project(auth.uid(), project_id) AND uploaded_by = auth.uid()
    AND (category IS DISTINCT FROM 'Signed contract' OR public.ws_role(auth.uid()) IN ('sales','gm')));
CREATE POLICY "project files: uploader or GM edits" ON public.project_files FOR UPDATE TO authenticated
  USING (public.can_see_project(auth.uid(), project_id) AND (uploaded_by = auth.uid() OR public.is_gm(auth.uid())))
  WITH CHECK (public.can_see_project(auth.uid(), project_id)
    AND (category IS DISTINCT FROM 'Signed contract' OR public.ws_role(auth.uid()) IN ('sales','gm')));
CREATE POLICY "project files: uploader or GM removes" ON public.project_files FOR DELETE TO authenticated
  USING (public.can_see_project(auth.uid(), project_id) AND (uploaded_by = auth.uid() OR public.is_gm(auth.uid())));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.project_files TO service_role;