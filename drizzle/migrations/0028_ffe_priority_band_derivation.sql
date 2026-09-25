ALTER TABLE public.ffe_items ADD COLUMN IF NOT EXISTS priority_band_manual boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.ffe_items.priority_band_manual IS 'True once a person set priority_band by hand; derivation never overwrites it.';

-- The one definition of purchasing order. Item name first (head noun, before "above/over/for ..."), then category/room.
CREATE OR REPLACE FUNCTION public.ws_ffe_band(_item text, _category text, _room text)
RETURNS smallint LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text := lower(regexp_replace(coalesce(_item,''), '\s+(above|over|for|behind|beside)\s.*$', '', 'i'));
        c text := lower(coalesce(_category,'') || ' ' || coalesce(_room,''));
BEGIN
  IF n ~ '\m(beds?|sofas?|sectional|wardrobes?|dining table|tv unit|tv console|media unit|cabinets?|dressers?|sideboard|bunk)\M' THEN RETURN 1; END IF;
  IF n ~ '(decorative|d[eé]cor|faux plant|\mplants?\M|wall art|artwork|\mvases?\M|\mframes?\M|\mmirrors?\M|cushions?|\mthrows?\M|candles?|sculpture|ornament)' THEN RETURN 5; END IF;
  IF n ~ '(towel|linen|bedding|duvet|comforter|pillow|\msheets?\M|bath mat|cookware|cutlery|utensil|dinner set|knife|glass|\mmugs?\M|\mplates?\M|\mbowls?\M|placemat|colander|peeler|opener|grater|kitchenware|tableware)' THEN RETURN 4; END IF;
  IF n ~ '(curtain|blind|drape|\mrugs?\M|carpet|lamps?|lighting|\mlights?\M|pendant|chandelier|sconce)' THEN RETURN 3; END IF;
  IF c ~ '(kitchenware|tabletop|linen)' THEN RETURN 4; END IF;
  IF c ~ '(furniture|appliance)' THEN RETURN 2; END IF;
  IF c ~ '(d[eé]cor|accessor)' THEN RETURN 5; END IF;
  RETURN 3; -- ambiguous: middle band, not an invented rule
END $$;

CREATE OR REPLACE FUNCTION public.ws_ffe_band_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
  -- A person changed the band: that is an override from now on.
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
END $$;

DROP TRIGGER IF EXISTS ffe_items_band ON public.ffe_items;
CREATE TRIGGER ffe_items_band BEFORE INSERT OR UPDATE ON public.ffe_items
FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_band_trg();