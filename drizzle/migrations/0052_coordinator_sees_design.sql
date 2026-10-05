-- 0052 coordinator_sees_design — ALREADY APPLIED BY HAND to the live database. Recorded afterwards; do not re-run.
-- The coordinator sees design images (renders, mood board) for their own projects via ws_coordinator_on_lead.
-- can_see_lead is deliberately unchanged, so proposals, contracts and deal records stay closed to coordinators.
-- Function bodies are pg_get_functiondef output; policies are rebuilt from pg_policy.

CREATE OR REPLACE FUNCTION public.ws_coordinator_on_lead(_uid uuid, _lead uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- The coordinator of a project may look at that project's lead-level design work.
  select exists (select 1 from public.projects p where p.lead_id = _lead and p.coordinator_id = _uid)
$function$;

CREATE OR REPLACE FUNCTION public.can_touch_workspace_object(_uid uuid, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare kind text := split_part(_name, '/', 1);
        seg  text := split_part(_name, '/', 2);
        id   uuid;
begin
  if _uid is null then return false; end if;
  if public.is_gm(_uid) then return true; end if;
  -- Designers and coordinators never reach deal records, wherever they are stored.
  if public.ws_role(_uid) in ('designer','coordinator') and (kind = 'deals' or exists (
       select 1 from public.project_files f where f.storage_path = _name and f.category = any (ARRAY['Signed contract','Proposal','Contract','Quote']))) then
    return false;
  end if;
  if seg !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  id := seg::uuid;
  -- The coordinator checks the renders against what he is buying, so design pictures are readable
  -- for a lead whose project is his. Deal records are already refused above.
  if kind = 'designs'  then return public.can_see_lead(_uid, id) or public.ws_coordinator_on_lead(_uid, id); end if;
  if kind in ('projects','snags') then return public.can_see_project(_uid, id); end if;
  if kind = 'deals' then
    return public.can_see_lead(_uid, id)
        or exists (select 1 from public.projects p where p.lead_id = seg::uuid and public.can_see_project(_uid, p.id));
  end if;
  return false;
end $function$;

DROP POLICY IF EXISTS "design images: coordinator on the project may look" ON public.design_images;
CREATE POLICY "design images: coordinator on the project may look" ON public.design_images AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM designs d
  WHERE ((d.id = design_images.design_id) AND ws_coordinator_on_lead(auth.uid(), d.lead_id)))));

DROP POLICY IF EXISTS "designs: coordinator on the project may look" ON public.designs;
CREATE POLICY "designs: coordinator on the project may look" ON public.designs AS PERMISSIVE FOR SELECT TO authenticated
  USING (ws_coordinator_on_lead(auth.uid(), lead_id));
