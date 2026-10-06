-- 0054 pickup_material_and_site_sequence — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- Building/site material forced to band 5 (Dragon Mart pick-up); site run wallwork → delivered → handyman+wallpaper → operations+qc.
-- Function bodies are pg_get_functiondef output; the constraint is pg_get_constraintdef output.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_auto_kind_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_auto_kind_check CHECK (((auto_kind IS NULL) OR (auto_kind = ANY (ARRAY['order_fast'::text, 'order_rest'::text, 'order_drawing'::text, 'wallwork'::text, 'delivered'::text, 'handyman'::text, 'wallpaper'::text, 'operations'::text, 'qc'::text]))));

CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text, _supplier text DEFAULT NULL::text)
 RETURNS smallint
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
-- Six buying runs: 1 cabinetry, 2 furniture, 3 online furniture, 4 appliances,
-- 5 Dragon Mart pick-up, 6 household.
DECLARE kind text; online boolean; sourced boolean;
BEGIN
  -- Wall and building material is always collected, whatever the item is called: "Fluted panel for
  -- master bed head" is site material, not joinery. The section name decides (ws_ffe_internal_section).
  IF public.ws_ffe_internal_section(_room) THEN RETURN 5; END IF;
  kind := public.ws_ffe_kind(_item, _category, _room);
  online := public.ws_ffe_online_supplier(_supplier);
  sourced := coalesce(btrim(_supplier),'') <> '';
  IF kind = 'cabinetry' THEN RETURN 1; END IF;
  IF kind = 'furniture' THEN RETURN CASE WHEN online THEN 3 ELSE 2 END; END IF;
  IF kind = 'appliance' THEN RETURN 4; END IF;
  IF sourced AND NOT online THEN RETURN 5; END IF;
  RETURN 6;
END $function$
;

CREATE OR REPLACE FUNCTION public.ws_handover_tasks(_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- Site sequence from the on-site (delivery) date S: the contractor's wall work the day before,
-- delivery on S, Ali and the wallpaper together the day after, operations' final unpack and clean
-- last. Nothing is scheduled on handover day, so a compressed job stacks onto the last day it has.
DECLARE h date; s date; cap date;
BEGIN
  SELECT handover_date, coalesce(on_site_by, handover_date - 3) INTO h, s FROM public.projects WHERE id = _project;
  IF h IS NULL OR s IS NULL THEN RETURN; END IF;
  cap := h - 1;
  PERFORM public.ws_buy_task(_project,'wallwork','Wall design work finished (contractor)',
    'The contractor finishes the wall designs. Furniture delivery follows — on a tight programme they can overlap, but the walls lead.',
    (least(s - 1, cap) + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'delivered','Everything delivered on site',
    'Every item on the FF&E list on site. Best after the wall work is finished; if the programme is tight it can land while the contractor is still working.',
    (least(s, cap) + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'handyman','Ali — hanging items and small installations',
    'Light fixtures, wall art, hanging items and the small appliance installations. After the furniture is in.',
    (least(s + 1, cap) + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'wallpaper','Wallpaper (if applicable)',
    'Same day as Ali — the two run together. Close this if the project has no wallpaper.',
    (least(s + 1, cap) + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'operations','Operations — final unpack and cleaning',
    'Operations unpack everything and do the final clean, after Ali and the wallpaper are done.',
    (least(s + 2, cap) + time '18:00') at time zone 'Asia/Dubai');
  PERFORM public.ws_buy_task(_project,'qc','On site — quality check everything',
    'Be on site, double-check every item and finish, and raise snags for anything wrong.',
    (least(s + 2, cap) + time '18:00') at time zone 'Asia/Dubai');
END $function$
;

