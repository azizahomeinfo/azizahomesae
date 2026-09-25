-- Designers see a brief only once the GM has assigned them (via can_see_lead). The unassigned queue is GM-only.
DROP POLICY IF EXISTS "briefs: visible with the lead, plus unassigned queue" ON public.requirement_briefs;
CREATE POLICY "briefs: visible with the lead" ON public.requirement_briefs FOR SELECT TO authenticated USING (public.can_see_lead(auth.uid(), lead_id));
CREATE OR REPLACE FUNCTION public.ws_brief_queue()
 RETURNS TABLE(brief_id uuid, lead_id uuid, status brief_status, submitted_at timestamp with time zone, name text, property text, unit_type text, budget numeric, target_date date)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select b.id, b.lead_id, b.status, b.submitted_at, l.name, l.property, l.unit_type, l.budget, l.target_date
    from public.requirement_briefs b join public.leads l on l.id = b.lead_id
   where b.status = 'Submitted' and public.is_gm(auth.uid())
   order by b.submitted_at nulls last
$function$;