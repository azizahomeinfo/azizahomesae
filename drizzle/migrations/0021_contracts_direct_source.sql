ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'proposal';
UPDATE public.contracts SET source = CASE WHEN proposal_id IS NULL THEN 'direct' ELSE 'proposal' END;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_source_check CHECK (source IN ('proposal','direct'));
COMMENT ON COLUMN public.contracts.source IS 'Set by ws_contract_guard from proposal_id: proposal = GM-quoted price; direct = price set by sales, no GM quotation.';
CREATE OR REPLACE FUNCTION public.ws_contract_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- A proposal is optional (direct contracts for repeat clients). When one is given it must be
  -- an Accepted proposal on this lead. source is derived here, never chosen by the user.
  IF NEW.proposal_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = NEW.proposal_id AND p.lead_id = NEW.lead_id AND p.status = 'Accepted') THEN
      RAISE EXCEPTION 'A contract needs an accepted proposal for this lead';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.source := CASE WHEN NEW.proposal_id IS NULL THEN 'direct' ELSE 'proposal' END;
  ELSE
    NEW.source := OLD.source;
  END IF;
  RETURN NEW;
END $function$;