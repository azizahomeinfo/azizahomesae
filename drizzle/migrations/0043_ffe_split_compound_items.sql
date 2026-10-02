-- A bundled line item ("Dresser + Ottoman + Mirror") is one row but three purchases from three
-- trades on three lead times, so the coordinator cannot buy it in band order. Split a compound
-- item only when its parts really fall in different bands: "Bed + Mattress", "Desk + Shelves"
-- and "Washer + Dryer" are one order from one supplier and stay whole.

-- A dryer is an appliance by name, not only because its room happens to be "Appliances".
CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text)
RETURNS smallint LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $function$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  -- Names first: seeded rows carry category 'General'. Compounds before bare words
  -- ("TV unit" before "TV", "table lamp" before "table").
  -- 1 Cabinetry (made to measure, longest lead time)
  IF n ~ '(tv (unit|console|cabinet|stand)|media (unit|console)|wall[- ]?mounted (cabinet|unit|shel)|cabinet|nightstand|night stand|bedside (table|cabinet|unit|drawer)|dresser|wardrobe|closet|vanit(y|ies)|sideboard|chest of drawers|storage console|console with storage|headboard panel|panell?ing|joinery|built[- ]?in|bed wall|feature wall|shoe (rack|unit))' THEN RETURN 1; END IF;
  -- 3 Appliances (after cabinetry so "TV unit" never lands here)
  IF n ~ '(\mtvs?\M|television|fridge|refrigerator|freezer|washing machine|washer|dishwasher|microwave|\moven\M|cooker|\mhob\M|stove|kettle|coffee machine|coffee maker|toaster|blender|air fryer|\mdryers?\M|hair ?dryer|\miron\M|vacuum|water dispenser)' THEN RETURN 3; END IF;
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

-- The parts a line item should become. One element (the item unchanged) means "do not split".
CREATE OR REPLACE FUNCTION public.ws_ffe_split_parts(_item text, _category text, _room text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $f$
DECLARE p text; kept text[] := '{}'; bands smallint[] := '{}';
BEGIN
  IF coalesce(_item,'') !~ '\+' THEN RETURN ARRAY[_item]; END IF;
  FOREACH p IN ARRAY regexp_split_to_array(_item, '\s*\+\s*') LOOP
    p := btrim(p);
    CONTINUE WHEN length(p) < 2;
    kept := kept || p;
    bands := bands || public.ws_ffe_band(p, _category, _room);
  END LOOP;
  IF coalesce(array_length(kept, 1), 0) < 2 THEN RETURN ARRAY[_item]; END IF;
  -- Same band: one supplier, one order, one row. Keep the bundle as the designer wrote it.
  IF (SELECT count(DISTINCT b) FROM unnest(bands) b) < 2 THEN RETURN ARRAY[_item]; END IF;
  RETURN kept;
END $f$;

-- Seeding a brief expands a compound item into one row per part, each taking the next ref
-- in its room, so the split holds from the moment the list is created.
CREATE OR REPLACE FUNCTION public.ws_seed_ffe_from_brief(_lead uuid, _project uuid DEFAULT NULL::uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE b jsonb; s jsonb; i jsonb; room text; n int := 0; pre text; seq jsonb := '{}'; k int; q numeric;
        cat text; parts text[]; part text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ffe_items WHERE lead_id = _lead) THEN RETURN 0; END IF;
  SELECT ffe INTO b FROM public.requirement_briefs WHERE lead_id = _lead ORDER BY created_at DESC LIMIT 1;
  FOR s IN SELECT * FROM jsonb_array_elements(coalesce(b, '[]'::jsonb)) LOOP
    room := btrim(regexp_replace(regexp_replace(coalesce(s->>'title',''), '^\s*\d+(\.\d+)*\s+', ''), '\s*\([^)]*\)\s*$', ''));
    pre := public.ws_room_prefix(room);
    FOR i IN SELECT * FROM jsonb_array_elements(coalesce(s->'items', '[]'::jsonb)) LOOP
      CONTINUE WHEN i->>'included' IS DISTINCT FROM 'inc' OR btrim(coalesce(i->>'item','')) = '';
      q := nullif(regexp_replace(coalesce(nullif(i->>'required',''), i->>'std', ''), '[^0-9.]', '', 'g'), '')::numeric;
      cat := CASE WHEN room ~* 'appliance' THEN 'Appliance' WHEN room ~* 'kitchen|tabletop' THEN 'Accessories' ELSE 'Furniture' END;
      parts := public.ws_ffe_split_parts(btrim(i->>'item'), cat, room);
      FOREACH part IN ARRAY parts LOOP
        k := coalesce((seq->>pre)::int, 0) + 1; seq := seq || jsonb_build_object(pre, k);
        INSERT INTO public.ffe_items (lead_id, project_id, room, item, ref, qty, notes, category, sort_order)
        VALUES (_lead, _project, room, part, pre || '-' || k, CASE WHEN q > 0 THEN q ELSE 1 END,
          nullif(btrim(coalesce(i->>'notes','')), ''), cat, n);
        n := n + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN n;
END $function$;

-- "Build from the client brief" used to insert rows from the browser, bypassing the splitting
-- and the band derivation. It now goes through the one seeder, behind the permission check the
-- definer function itself does not make.
CREATE OR REPLACE FUNCTION public.ws_seed_ffe(_lead uuid, _project uuid DEFAULT NULL::uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE n int;
BEGIN
  IF _lead IS NULL THEN RAISE EXCEPTION 'This list has no brief to build from'; END IF;
  IF public.ws_role(auth.uid()) NOT IN ('gm','designer') THEN
    RAISE EXCEPTION 'Only the GM or the assigned designer builds the FF&E list';
  END IF;
  IF NOT public.can_see_ffe(auth.uid(), _lead, _project) THEN
    RAISE EXCEPTION 'That lead is not yours';
  END IF;
  n := public.ws_seed_ffe_from_brief(_lead, _project);
  IF n = 0 THEN RAISE EXCEPTION 'Nothing to build - the brief has no included items, or the list already exists'; END IF;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.ws_seed_ffe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_seed_ffe(uuid, uuid) TO authenticated;

-- Split the bundles already on the live lists. The original row survives as the first part so it
-- keeps its ref, its unit cost and its supplier; the other parts are new rows taking the next
-- free ref in the same room. ws.reband keeps this system change off the sales notification feed
-- and out of the "hand-edited band" flag.
DO $$
DECLARE r record; parts text[]; j int; pre text; nxt int;
BEGIN
  PERFORM set_config('ws.reband', 'on', true);
  FOR r IN
    SELECT i.*, public.ws_ffe_split_parts(i.item, i.category, i.room) AS p
      FROM public.ffe_items i
     WHERE coalesce(array_length(public.ws_ffe_split_parts(i.item, i.category, i.room), 1), 1) > 1
     ORDER BY i.lead_id, i.project_id, i.sort_order
  LOOP
    parts := r.p;
    pre := nullif(split_part(coalesce(r.ref, ''), '-', 1), '');
    IF pre IS NULL THEN pre := public.ws_room_prefix(r.room); END IF;
    UPDATE public.ffe_items SET sort_order = sort_order + (array_length(parts, 1) - 1)
     WHERE sort_order > r.sort_order
       AND ((r.lead_id IS NOT NULL AND lead_id = r.lead_id) OR (r.lead_id IS NULL AND project_id = r.project_id));
    UPDATE public.ffe_items
       SET item = parts[1], priority_band = public.ws_ffe_band(parts[1], r.category, r.room)
     WHERE id = r.id;
    FOR j IN 2 .. array_length(parts, 1) LOOP
      SELECT coalesce(max((regexp_match(ref, '^' || pre || '-(\d+)$'))[1]::int), 0) + 1 INTO nxt
        FROM public.ffe_items
       WHERE ((r.lead_id IS NOT NULL AND lead_id = r.lead_id) OR (r.lead_id IS NULL AND project_id = r.project_id));
      INSERT INTO public.ffe_items (lead_id, project_id, room, item, ref, qty, notes, category, sort_order)
      VALUES (r.lead_id, r.project_id, r.room, r.category, parts[j], r.spec, r.qty, r.unit, r.notes,
              pre || '-' || nxt, r.sort_order + j - 1);
    END LOOP;
  END LOOP;
  PERFORM set_config('ws.reband', '', true);
END $$;