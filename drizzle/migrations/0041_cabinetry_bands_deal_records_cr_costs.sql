CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text)
 RETURNS smallint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  -- Names first: seeded rows carry category 'General'. Compounds before bare words
  -- ("TV unit" before "TV", "dresser + mirror" before "mirror", "table lamp" before "table").
  -- 1 Cabinetry (made to measure, longest lead time)
  IF n ~ '(tv (unit|console|cabinet|stand)|media (unit|console)|wall[- ]?mounted (cabinet|unit|shel)|cabinet|nightstand|night stand|bedside (table|cabinet|unit|drawer)|dresser|wardrobe|closet|vanit(y|ies)|sideboard|chest of drawers|storage console|console with storage|headboard panel|panell?ing|joinery|built[- ]?in|bed wall|feature wall|shoe (rack|unit))' THEN RETURN 1; END IF;
  -- 3 Appliances (after cabinetry so "TV unit" never lands here)
  IF n ~ '(\mtvs?\M|television|fridge|refrigerator|freezer|washing machine|washer|dishwasher|microwave|\moven\M|cooker|\mhob\M|stove|kettle|coffee machine|coffee maker|toaster|blender|air fryer|hair ?dryer|\miron\M|vacuum|water dispenser)' THEN RETURN 3; END IF;
  -- 5 Kitchenware, linen and the rest (before furniture so "table napkins" is not a table)
  IF n ~ '(towel|\mlinen|bath mat|cookware|cutlery|utensil|dinner set|knife|knives|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware|napkin|chopping board|drying rack|ironing board|hanger|\mbins?\M|trash|waste|safety|first aid|fire (extinguisher|blanket)|smoke|scale|ash ?tray|soap|amenit|dispenser|toilet brush)' THEN RETURN 5; END IF;
  -- 4 Soft finishing (before furniture so "table lamp" is lighting)
  IF n ~ '(curtain|sheer|blind|drape|\mrugs?\M|carpet|lamps?|lighting|\mlights?\M|pendant|chandelier|sconce|mirror|cushion|\mthrows?\M|bedding|duvet|comforter|pillow|\msheets?\M|wall art|artwork|d[eé]cor|faux plant|\mplants?\M|\mvases?\M|\mframes?\M|candle|sculpture|ornament)' THEN RETURN 4; END IF;
  -- 2 Furniture
  IF n ~ '\m(beds?|mattress(es)?|sofas?|sectional|couch|tables?|chairs?|armchairs?|stools?|benches|bench|desks?|ottomans?|consoles?|headboards?|bunk|shelf|shelves|shelving|bookcase|outdoor set|balcony set|patio set|loungers?)\M' THEN RETURN 2; END IF;
  IF n ~ '\mglass' THEN RETURN 5; END IF;
  IF c ~ '(cabinet|joinery)' THEN RETURN 1; END IF;
  IF c ~ 'appliance' THEN RETURN 3; END IF;
  IF c ~ '(kitchenware|tabletop|linen|accessor)' THEN RETURN 5; END IF;
  IF c ~ 'furniture' THEN RETURN 2; END IF;
  IF c ~ '(d[eé]cor|soft)' THEN RETURN 4; END IF;
  RETURN 5;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_ffe_item_edit_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$ begin
  if current_setting('ws.reband', true) = 'on' then return null; end if;
  perform public.ws_ffe_edit_notify_lead(coalesce(NEW.lead_id, OLD.lead_id)); return null; end $f$;

SELECT set_config('ws.reband','on', true);
UPDATE public.ffe_items SET priority_band = public.ws_ffe_band(item, category, room)
 WHERE NOT priority_band_manual AND priority_band IS DISTINCT FROM public.ws_ffe_band(item, category, room);
SELECT set_config('ws.reband','off', true);

ALTER POLICY "project files: visible with the lead or project" ON public.project_files
  USING (can_see_ffe(auth.uid(), lead_id, project_id) AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal','Contract','Quote']) OR ws_role(auth.uid()) <> ALL (ARRAY['designer'::workspace_role,'coordinator'::workspace_role])));
ALTER POLICY "project files: staff add" ON public.project_files
  WITH CHECK (can_see_ffe(auth.uid(), lead_id, project_id) AND uploaded_by = auth.uid() AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal','Contract','Quote']) OR ws_role(auth.uid()) = ANY (ARRAY['sales'::workspace_role,'gm'::workspace_role])));
ALTER POLICY "project files: uploader or GM edits" ON public.project_files
  WITH CHECK (can_see_ffe(auth.uid(), lead_id, project_id) AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal','Contract','Quote']) OR ws_role(auth.uid()) = ANY (ARRAY['sales'::workspace_role,'gm'::workspace_role])));

CREATE OR REPLACE FUNCTION public.can_touch_workspace_object(_uid uuid, _name text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare kind text := split_part(_name, '/', 1);
        seg  text := split_part(_name, '/', 2);
        id   uuid;
begin
  if _uid is null then return false; end if;
  if public.is_gm(_uid) then return true; end if;
  -- Designers and coordinators never reach deal records, wherever they are stored.
  if public.ws_role(_uid) in ('designer','coordinator') and (kind = 'deals' or exists (
       select 1 from public.project_files f where f.storage_path = _name and f.category = any (ARRAY['Signed contract','Proposal','Contract','Quote']))) then
    return false;
  end if;
  if seg !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  id := seg::uuid;
  if kind = 'designs'  then return public.can_see_lead(_uid, id);    end if;
  if kind in ('projects','snags') then return public.can_see_project(_uid, id); end if;
  if kind = 'deals' then
    return public.can_see_lead(_uid, id)
        or exists (select 1 from public.projects p where p.lead_id = seg::uuid and public.can_see_project(_uid, p.id));
  end if;
  return false;
end $function$;

REVOKE SELECT ON public.change_requests FROM anon, authenticated;
GRANT SELECT (id, project_id, ref, title, detail, source, raised_on, days_delta, status, decided_at, decided_by, created_at, updated_at) ON public.change_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_cr_costs(_project uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, cost_delta numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  select c.id, c.cost_delta from public.change_requests c
   where public.ws_role(auth.uid()) is not null and public.ws_role(auth.uid()) <> 'coordinator'
     and (_project is null or c.project_id = _project)
     and public.can_see_project(auth.uid(), c.project_id)
$f$;
REVOKE ALL ON FUNCTION public.ws_cr_costs(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_cr_costs(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_cr_cost_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$ begin
  if public.ws_role(auth.uid()) = 'coordinator' then
    if TG_OP = 'INSERT' then NEW.cost_delta := 0; else NEW.cost_delta := OLD.cost_delta; end if;
  end if;
  return NEW; end $f$;
DROP TRIGGER IF EXISTS crs_cost_guard ON public.change_requests;
CREATE TRIGGER crs_cost_guard BEFORE INSERT OR UPDATE ON public.change_requests FOR EACH ROW EXECUTE FUNCTION public.ws_cr_cost_guard();