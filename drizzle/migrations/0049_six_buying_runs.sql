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
CREATE OR REPLACE FUNCTION public.ws_ffe_kind(_item text, _category text, _room text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
-- What the item IS. One ruleset, two consumers: ws_ffe_band turns a kind plus the supplier into a
-- buying run, and ws_ffe_split_parts asks the kind alone, because splitting happens at seed time
-- when no supplier exists yet. Never duplicate these regexes -- fix them here only.
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  -- The item IS the finish, whatever furniture its name mentions ("Decorative - on top tv unit").
  IF n ~ '(decorative|d[eé]cor|wallpaper|wall ?paper|lamps?|bulbs?|sconce|pendant|chandelier|dry flower|faux plant|mattress protector|\mvases?\M)' THEN RETURN 'finish'; END IF;
  IF n ~ '(tv (unit|console|cabinet|stand)|media (unit|console)|wall[- ]?mounted (cabinet|unit|shel)|cabinet|nightstand|night stand|bedside (table|cabinet|unit|drawer)|dresser|wardrobe|closet|vanit(y|ies)|sideboard|chest of drawers|storage console|console with storage|headboard panel|\mpanel\M|panell?ing|joinery|built[- ]?in|bed wall|bed ?head wall|wall design|feature wall|shoe (rack|unit))' THEN RETURN 'cabinetry'; END IF;
  IF n ~ '(\mtvs?\M|television|fridge|refrigerator|freezer|washing machine|washer|dishwasher|microwave|\moven\M|cooker|\mhob\M|stove|kettle|coffee machine|coffee maker|toaster|blender|air fryer|\mdryers?\M|hair ?dryer|\miron\M|vacuum|water dispenser)' OR c ~ 'appliance' THEN RETURN 'appliance'; END IF;
  IF n ~ '(towel|\mlinen|bath mat|cookware|cutlery|utensil|dinner set|knife|knives|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware|napkin|chopping board|drying rack|ironing board|hanger|\mbins?\M|trash|waste|safety|first aid|fire (extinguisher|blanket)|smoke|scale|ash ?tray|soap|amenit|dispenser|toilet brush|\mglass)' OR c ~ '(kitchenware|tabletop|linen|accessor)' THEN RETURN 'kitchen'; END IF;
  -- Soft finishing by name, tested BEFORE furniture so a rug or a mirror is not furniture.
  IF n ~ '(curtain|sheer|blind|drape|\mrugs?\M|carpet|lighting|\mlights?\M|mirror|cushion|\mthrows?\M|bedding|duvet|comforter|pillow|\msheets?\M|wall art|artwork|\mplants?\M|\mframes?\M|candle|sculpture|ornament)' OR c ~ '(d[eé]cor|soft)' THEN RETURN 'soft'; END IF;
  -- Furniture by NAME only. 'Furniture' is the default category for almost every room, so using
  -- the category as a fallback filed anything unrecognised -- a light switch -- as furniture.
  IF n ~ '\m(beds?|mattress(es)?|sofas?|sectional|couch|tables?|chairs?|armchairs?|stools?|benches|bench|desks?|ottomans?|consoles?|headboards?|bunk|shel(f|ves|ving)|shlef|bookcase|outdoor set|balcony set|patio set|loungers?)\M' THEN RETURN 'furniture'; END IF;
  RETURN 'unknown';
END $function$
;
-- The 3-argument overload is gone: its defaulted _supplier made 3-argument calls ambiguous and broke brief seeding.
DROP FUNCTION IF EXISTS public.ws_ffe_band(text,text,text);
CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text, _supplier text DEFAULT NULL::text)
 RETURNS smallint
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
-- Six buying runs: 1 cabinetry, 2 furniture, 3 online furniture, 4 appliances,
-- 5 Dragon Mart pick-up, 6 household. The kind decides 1/2/4; the supplier decides whether it is
-- ordered online (3/6) or collected (5), via the GM-maintained ffe_online_retailers list.
DECLARE kind text := public.ws_ffe_kind(_item, _category, _room);
        online boolean := public.ws_ffe_online_supplier(_supplier);
        sourced boolean := coalesce(btrim(_supplier),'') <> '';
BEGIN
  IF kind = 'cabinetry' THEN RETURN 1; END IF;
  IF kind = 'furniture' THEN RETURN CASE WHEN online THEN 3 ELSE 2 END; END IF;
  IF kind = 'appliance' THEN RETURN 4; END IF;
  IF sourced AND NOT online THEN RETURN 5; END IF;
  RETURN 6;
END $function$
;
CREATE OR REPLACE FUNCTION public.ws_ffe_split_parts(_item text, _category text, _room text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE p text; k text; kept text[] := '{}'; runs text[] := '{}';
BEGIN
  IF coalesce(_item,'') !~ '\+' THEN RETURN ARRAY[_item]; END IF;
  FOREACH p IN ARRAY regexp_split_to_array(_item, '\s*\+\s*') LOOP
    p := btrim(p);
    CONTINUE WHEN length(p) < 2;
    kept := kept || p;
    k := public.ws_ffe_kind(p, _category, _room);
    -- No supplier exists at seed time, so finishes, kitchenware and soft furnishing are one run
    -- here. 'unknown' is a size or variant tacked onto its sibling ("Mattress 90cm(medical) +
    -- 90cm(soft)"), not a second item, so it never forces a split.
    IF k IN ('cabinetry','furniture','appliance') THEN runs := runs || k;
    ELSIF k <> 'unknown' THEN runs := runs || 'other'::text; END IF;
  END LOOP;
  IF coalesce(array_length(kept, 1), 0) < 2 THEN RETURN ARRAY[_item]; END IF;
  -- Same run: one supplier, one order, one row. Keep the bundle as the designer wrote it.
  IF (SELECT count(DISTINCT r) FROM unnest(runs) r) < 2 THEN RETURN ARRAY[_item]; END IF;
  RETURN kept;
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
