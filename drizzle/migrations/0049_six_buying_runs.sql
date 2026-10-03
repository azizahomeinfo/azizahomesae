-- 0049 six_buying_runs — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- Six buying runs: 1 Cabinetry, 2 Furniture, 3 Online furniture, 4 Appliances, 5 Dragon Mart pick-up, 6 Household.
-- Item type decides 1/2/4; the supplier decides online (3/6) vs collected (5) via ffe_online_retailers.
-- Function bodies are pg_get_functiondef output from the live database. Grants mirror the live ACL.

CREATE TABLE IF NOT EXISTS public.ffe_online_retailers (
  name text PRIMARY KEY,
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ffe_online_retailers TO anon, authenticated, service_role;
ALTER TABLE public.ffe_online_retailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "online retailers: GM maintains" ON public.ffe_online_retailers;
CREATE POLICY "online retailers: GM maintains" ON public.ffe_online_retailers
  FOR ALL TO authenticated USING (is_gm(auth.uid())) WITH CHECK (is_gm(auth.uid()));
DROP POLICY IF EXISTS "online retailers: staff read" ON public.ffe_online_retailers;
CREATE POLICY "online retailers: staff read" ON public.ffe_online_retailers
  FOR SELECT TO authenticated
  USING (ws_role(auth.uid()) = ANY (ARRAY['gm'::workspace_role, 'designer'::workspace_role, 'coordinator'::workspace_role]));

INSERT INTO public.ffe_online_retailers (name) VALUES
  ('Home Centre'), ('Home Box'), ('Pan Home'), ('Ikea'), ('Danube'), ('Amazon'), ('SharafDG'), ('Sharaf DG'), ('Homerus'), ('Noon')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.ffe_items DROP CONSTRAINT IF EXISTS ffe_items_priority_band_check;
ALTER TABLE public.ffe_items ADD CONSTRAINT ffe_items_priority_band_check
  CHECK (((priority_band IS NULL) OR ((priority_band >= 1) AND (priority_band <= 6))));

CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text)
 RETURNS smallint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  -- 4 Soft finishing, highest precedence: the item IS the finish, whatever furniture it names.
  -- "Decorative - on top tv unit" was Cabinetry because the text contains "tv unit"; "Nightstand
  -- lamp" because it contains "nightstand".
  IF n ~ '(decorative|d[eé]cor|wallpaper|wall ?paper|lamps?|bulbs?|sconce|pendant|chandelier|dry flower|faux plant|mattress protector|\mvases?\M)' THEN RETURN 4; END IF;
  -- 1 Cabinetry: made to measure, longest lead time. Wall designs and bed-head walls are joinery,
  -- not furniture, and "TV Media Wall Design" is not an appliance.
  IF n ~ '(tv (unit|console|cabinet|stand)|media (unit|console)|wall[- ]?mounted (cabinet|unit|shel)|cabinet|nightstand|night stand|bedside (table|cabinet|unit|drawer)|dresser|wardrobe|closet|vanit(y|ies)|sideboard|chest of drawers|storage console|console with storage|headboard panel|\mpanel\M|panell?ing|joinery|built[- ]?in|bed wall|bed ?head wall|wall design|feature wall|shoe (rack|unit))' THEN RETURN 1; END IF;
  IF n ~ '(\mtvs?\M|television|fridge|refrigerator|freezer|washing machine|washer|dishwasher|microwave|\moven\M|cooker|\mhob\M|stove|kettle|coffee machine|coffee maker|toaster|blender|air fryer|\mdryers?\M|hair ?dryer|\miron\M|vacuum|water dispenser)' THEN RETURN 3; END IF;
  IF n ~ '(towel|\mlinen|bath mat|cookware|cutlery|utensil|dinner set|knife|knives|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware|napkin|chopping board|drying rack|ironing board|hanger|\mbins?\M|trash|waste|safety|first aid|fire (extinguisher|blanket)|smoke|scale|ash ?tray|soap|amenit|dispenser|toilet brush)' THEN RETURN 5; END IF;
  IF n ~ '(curtain|sheer|blind|drape|\mrugs?\M|carpet|lighting|\mlights?\M|mirror|cushion|\mthrows?\M|bedding|duvet|comforter|pillow|\msheets?\M|wall art|artwork|\mplants?\M|\mframes?\M|candle|sculpture|ornament)' THEN RETURN 4; END IF;
  IF n ~ '\m(beds?|mattress(es)?|sofas?|sectional|couch|tables?|chairs?|armchairs?|stools?|benches|bench|desks?|ottomans?|consoles?|headboards?|bunk|shelf|shelves|shelving|bookcase|outdoor set|balcony set|patio set|loungers?)\M' THEN RETURN 2; END IF;
  IF n ~ '\mglass' THEN RETURN 5; END IF;
  IF c ~ '(cabinet|joinery)' THEN RETURN 1; END IF;
  IF c ~ 'appliance' THEN RETURN 3; END IF;
  IF c ~ '(kitchenware|tabletop|linen|accessor)' THEN RETURN 5; END IF;
  IF c ~ 'furniture' THEN RETURN 2; END IF;
  IF c ~ '(d[eé]cor|soft)' THEN RETURN 4; END IF;
  RETURN 5;
END $function$
;
CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text, _supplier text DEFAULT NULL::text)
 RETURNS smallint
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
        online boolean := public.ws_ffe_online_supplier(_supplier);
        sourced boolean := coalesce(btrim(_supplier),'') <> '';
        is_finish boolean; is_cab boolean; is_app boolean; is_kit boolean; is_soft boolean; is_furn boolean;
BEGIN
  -- The item IS the finish, whatever furniture its name mentions.
  is_finish := n ~ '(decorative|d[eé]cor|wallpaper|wall ?paper|lamps?|bulbs?|sconce|pendant|chandelier|dry flower|faux plant|mattress protector|\mvases?\M)';
  is_cab  := NOT is_finish AND n ~ '(tv (unit|console|cabinet|stand)|media (unit|console)|wall[- ]?mounted (cabinet|unit|shel)|cabinet|nightstand|night stand|bedside (table|cabinet|unit|drawer)|dresser|wardrobe|closet|vanit(y|ies)|sideboard|chest of drawers|storage console|console with storage|headboard panel|\mpanel\M|panell?ing|joinery|built[- ]?in|bed wall|bed ?head wall|wall design|feature wall|shoe (rack|unit))';
  is_app  := NOT is_finish AND NOT is_cab
             AND (n ~ '(\mtvs?\M|television|fridge|refrigerator|freezer|washing machine|washer|dishwasher|microwave|\moven\M|cooker|\mhob\M|stove|kettle|coffee machine|coffee maker|toaster|blender|air fryer|\mdryers?\M|hair ?dryer|\miron\M|vacuum|water dispenser)' OR c ~ 'appliance');
  is_kit  := NOT is_finish AND NOT is_cab AND NOT is_app
             AND (n ~ '(towel|\mlinen|bath mat|cookware|cutlery|utensil|dinner set|knife|knives|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware|napkin|chopping board|drying rack|ironing board|hanger|\mbins?\M|trash|waste|safety|first aid|fire (extinguisher|blanket)|smoke|scale|ash ?tray|soap|amenit|dispenser|toilet brush|\mglass)' OR c ~ '(kitchenware|tabletop|linen|accessor)');
  -- Soft finishing by name, tested BEFORE furniture or the category fallback swallowed a rug.
  is_soft := NOT is_finish AND NOT is_cab AND NOT is_app AND NOT is_kit
             AND (n ~ '(curtain|sheer|blind|drape|\mrugs?\M|carpet|lighting|\mlights?\M|mirror|cushion|\mthrows?\M|bedding|duvet|comforter|pillow|\msheets?\M|wall art|artwork|\mplants?\M|\mframes?\M|candle|sculpture|ornament)' OR c ~ '(d[eé]cor|soft)');
  -- Furniture by NAME only. 'Furniture' is the default category for almost every room, so using it
  -- as a fallback filed anything unrecognised — a light switch — as furniture.
  is_furn := NOT is_finish AND NOT is_cab AND NOT is_app AND NOT is_kit AND NOT is_soft
             AND n ~ '\m(beds?|mattress(es)?|sofas?|sectional|couch|tables?|chairs?|armchairs?|stools?|benches|bench|desks?|ottomans?|consoles?|headboards?|bunk|shel(f|ves|ving)|shlef|bookcase|outdoor set|balcony set|patio set|loungers?)\M';

  IF is_cab  THEN RETURN 1; END IF;
  IF is_furn THEN RETURN CASE WHEN online THEN 3 ELSE 2 END; END IF;
  IF is_app  THEN RETURN 4; END IF;
  IF sourced AND NOT online THEN RETURN 5; END IF;
  RETURN 6;
END $function$
;
CREATE OR REPLACE FUNCTION public.ws_ffe_band_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.priority_band IS NULL THEN
      NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room, NEW.supplier_name);
      NEW.priority_band_manual := false;
    ELSE NEW.priority_band_manual := true; END IF;
    RETURN NEW;
  END IF;
  IF current_setting('ws.reband', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.priority_band IS DISTINCT FROM OLD.priority_band AND OLD.priority_band IS NOT NULL AND NEW.priority_band IS NOT NULL THEN
    NEW.priority_band_manual := true;
  ELSIF NEW.priority_band IS NULL THEN
    NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room, NEW.supplier_name);
    NEW.priority_band_manual := false;
  ELSIF NOT OLD.priority_band_manual AND NOT NEW.priority_band_manual
        AND (NEW.item, NEW.category, NEW.room, NEW.supplier_name) IS DISTINCT FROM (OLD.item, OLD.category, OLD.room, OLD.supplier_name) THEN
    NEW.priority_band := public.ws_ffe_band(NEW.item, NEW.category, NEW.room, NEW.supplier_name);
  END IF;
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.ws_ffe_online_supplier(_supplier text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(btrim(_supplier),'') <> '' AND EXISTS (
    SELECT 1 FROM public.ffe_online_retailers r WHERE lower(btrim(_supplier)) LIKE '%'||lower(btrim(r.name))||'%')
$function$
;

