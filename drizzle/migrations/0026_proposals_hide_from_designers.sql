DROP POLICY IF EXISTS "proposals: visible with the lead" ON public.proposals;
CREATE POLICY "proposals: visible with the lead, never designers" ON public.proposals FOR SELECT TO authenticated
USING (public.ws_role(auth.uid()) <> 'designer' AND public.can_see_lead(auth.uid(), lead_id));