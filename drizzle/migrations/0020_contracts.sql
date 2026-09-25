ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS accepted_option jsonb;
COMMENT ON COLUMN public.proposals.accepted_option IS 'The quote option the client accepted: {index,label,desc,amount}. Contract price comes from it.';

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('Draft', 'Issued', 'Signed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  status public.contract_status NOT NULL DEFAULT 'Draft',
  doc jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts: visible with the lead, never designers" ON public.contracts
  FOR SELECT TO authenticated
  USING (public.ws_role(auth.uid()) <> 'designer' AND public.can_see_lead(auth.uid(), lead_id));

CREATE POLICY "contracts: sales owner or GM writes" ON public.contracts
  FOR ALL TO authenticated
  USING (public.is_gm(auth.uid()) OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = contracts.lead_id AND l.sales_id = auth.uid()))
  WITH CHECK (public.is_gm(auth.uid()) OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = contracts.lead_id AND l.sales_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.ws_contract_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
    IF NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = NEW.proposal_id AND p.lead_id = NEW.lead_id AND p.status = 'Accepted') THEN
      RAISE EXCEPTION 'A contract needs an accepted proposal for this lead';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER contracts_guard BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.ws_contract_guard();
CREATE TRIGGER contracts_touch BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();