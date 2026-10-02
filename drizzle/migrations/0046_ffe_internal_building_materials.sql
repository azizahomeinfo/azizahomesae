-- Aziza buys paint, adhesive, wallpaper paste and fixings to execute a job. They are real spend the
-- coordinator must purchase, but they are not client line items: the client bought a finished room,
-- not a tin of paint. So they sit in the project's FF&E list as an internal section and are kept out
-- of the proposal and the contract.
CREATE OR REPLACE FUNCTION public.ws_ffe_internal_section(_room text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(btrim(_room), '') ~* '^((building|site)\s+materials?|materials?|internal)\M'
$function$;
CREATE OR REPLACE FUNCTION public.ws_ffe_internal_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.internal := public.ws_ffe_internal_section(NEW.room);
  RETURN NEW;
END $function$;
ALTER TABLE public.ffe_items ADD COLUMN IF NOT EXISTS internal boolean NOT NULL DEFAULT false;
GRANT SELECT (internal) ON public.ffe_items TO authenticated;
-- Deliberately no INSERT/UPDATE grant: internal is derived from the section name, never set by hand.
DROP TRIGGER IF EXISTS ffe_items_internal ON public.ffe_items;
CREATE TRIGGER ffe_items_internal BEFORE INSERT OR UPDATE ON public.ffe_items
FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_internal_trg();
UPDATE public.ffe_items SET room = room
 WHERE internal IS DISTINCT FROM public.ws_ffe_internal_section(room);
