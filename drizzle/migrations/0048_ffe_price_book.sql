-- 0048 ffe_price_book — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- Standard cost price book keyed by (room_class, item). Readable by gm/designer/coordinator (never sales);
-- writable by the GM only. Function bodies below are pg_get_functiondef output from the live database.

CREATE TABLE IF NOT EXISTS public.ffe_price_book (
  room_class text NOT NULL,
  item text NOT NULL,
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  source_lead uuid,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_class, item)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ffe_price_book TO authenticated;
GRANT ALL ON public.ffe_price_book TO service_role;
ALTER TABLE public.ffe_price_book ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price book: not for sales" ON public.ffe_price_book;
CREATE POLICY "price book: not for sales" ON public.ffe_price_book FOR SELECT TO authenticated
  USING (ws_role(auth.uid()) = ANY (ARRAY['gm'::workspace_role, 'designer'::workspace_role, 'coordinator'::workspace_role]));
DROP POLICY IF EXISTS "price book: GM maintains" ON public.ffe_price_book;
CREATE POLICY "price book: GM maintains" ON public.ffe_price_book FOR ALL TO authenticated
  USING (is_gm(auth.uid())) WITH CHECK (is_gm(auth.uid()));

ALTER TABLE public.ffe_item_costs ADD COLUMN IF NOT EXISTS from_price_book boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ws_room_class(_room text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN r ~ 'master'                           THEN 'master bedroom'
    WHEN r ~ 'maid'                             THEN 'maid'
    WHEN r ~ '(guest|bedroom|sleeping)'         THEN 'bedroom'
    WHEN r ~ '(living|dining|lounge|entrance)'  THEN 'living'
    WHEN r ~ '(kitchen|tabletop)'               THEN 'kitchen'
    WHEN r ~ 'bath'                             THEN 'bathroom'
    WHEN r ~ 'appliance'                        THEN 'appliances'
    WHEN r ~ '(balcony|terrace)'                THEN 'balcony'
    WHEN r ~ '(safety|dtcm|compliance|access)'  THEN 'safety'
    WHEN public.ws_ffe_internal_section(_room)  THEN 'materials'
    ELSE 'other' END
  FROM (SELECT lower(coalesce(btrim(_room), '')) AS r) s
$function$
;

CREATE OR REPLACE FUNCTION public.ws_ffe_price(_room text, _item text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT unit_cost FROM public.ffe_price_book
   WHERE item = lower(btrim(coalesce(_item,'')))
   ORDER BY (room_class = public.ws_room_class(_room)) DESC, unit_cost DESC
   LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.ws_price_book_fill_from_lead(_lead uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM sets the standard prices'; END IF;
  INSERT INTO public.ffe_price_book (room_class, item, unit_cost, source_lead, updated_by)
  SELECT public.ws_room_class(i.room), lower(btrim(i.item)), max(c.unit_cost), _lead, auth.uid()
    FROM public.ffe_items i JOIN public.ffe_item_costs c ON c.item_id = i.id
   WHERE i.lead_id = _lead AND c.unit_cost IS NOT NULL AND btrim(coalesce(i.item,'')) <> ''
   GROUP BY 1, 2
  ON CONFLICT (room_class, item) DO UPDATE
     SET unit_cost = excluded.unit_cost, source_lead = excluded.source_lead,
         updated_by = excluded.updated_by, updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_price_book_apply(_lead uuid, _project uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int := 0; r record; p numeric;
BEGIN
  IF public.ws_role(auth.uid()) NOT IN ('gm','designer') THEN
    RAISE EXCEPTION 'Only the GM or the designer applies the standard prices';
  END IF;
  PERFORM set_config('ws.pricebook', 'on', true);
  FOR r IN SELECT i.id, i.room, i.item FROM public.ffe_items i
            WHERE ((_lead IS NOT NULL AND i.lead_id = _lead) OR (_project IS NOT NULL AND i.project_id = _project))
              AND NOT EXISTS (SELECT 1 FROM public.ffe_item_costs c WHERE c.item_id = i.id)
  LOOP
    p := public.ws_ffe_price(r.room, r.item);
    IF p IS NOT NULL THEN
      INSERT INTO public.ffe_item_costs (item_id, unit_cost) VALUES (r.id, p)
      ON CONFLICT (item_id) DO NOTHING;
      n := n + 1;
    END IF;
  END LOOP;
  PERFORM set_config('ws.pricebook', '', true);
  RETURN n;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_price_book_flag()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('ws.pricebook', true), '') = 'on' THEN
    NEW.from_price_book := true;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.from_price_book := false;
  ELSIF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
    NEW.from_price_book := false;
  ELSE
    NEW.from_price_book := OLD.from_price_book;
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_ffe_cost_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q numeric; oldc numeric := CASE WHEN TG_OP = 'UPDATE' THEN OLD.unit_cost END;
BEGIN
  IF coalesce(current_setting('ws.reviewing', true), '') = 'on'
     OR coalesce(current_setting('ws.converting', true), '') = 'on'
     OR coalesce(current_setting('ws.pricebook', true), '') = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND NEW.unit_cost IS NOT DISTINCT FROM OLD.unit_cost THEN RETURN NULL; END IF;
  SELECT qty INTO q FROM public.ffe_items WHERE id = NEW.item_id;
  IF q IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.ws_ffe_change_to_gm(NEW.item_id, coalesce(NEW.unit_cost, 0) * q, coalesce(NEW.unit_cost, 0) * q, 'the unit cost');
  ELSE
    PERFORM public.ws_ffe_change_to_gm(NEW.item_id, coalesce(oldc, 0) * q, coalesce(NEW.unit_cost, 0) * q, 'the unit cost');
  END IF;
  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_seed_ffe_from_brief(_lead uuid, _project uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b jsonb; s jsonb; i jsonb; room text; n int := 0; pre text; seq jsonb := '{}'; k int; q numeric;
        cat text; parts text[]; part text; nid uuid; p numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ffe_items WHERE lead_id = _lead) THEN RETURN 0; END IF;
  SELECT ffe INTO b FROM public.requirement_briefs WHERE lead_id = _lead ORDER BY created_at DESC LIMIT 1;
  PERFORM set_config('ws.pricebook', 'on', true);
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
          nullif(btrim(coalesce(i->>'notes','')), ''), cat, n)
        RETURNING id INTO nid;
        p := public.ws_ffe_price(room, part);
        IF p IS NOT NULL THEN
          INSERT INTO public.ffe_item_costs (item_id, unit_cost) VALUES (nid, p);
        END IF;
        n := n + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  PERFORM set_config('ws.pricebook', '', true);
  RETURN n;
END $function$
;

DROP TRIGGER IF EXISTS ffe_item_costs_pricebook ON public.ffe_item_costs;
CREATE TRIGGER ffe_item_costs_pricebook BEFORE INSERT OR UPDATE ON public.ffe_item_costs FOR EACH ROW EXECUTE FUNCTION ws_price_book_flag();
