-- Coordinators buy from the FF&E list (items, unit costs, suppliers) but never see what the client pays.

-- 1. Deal records (signed contract, proposal): designers and coordinators never read them.
DROP POLICY IF EXISTS "project files: visible with the lead or project" ON public.project_files;
CREATE POLICY "project files: visible with the lead or project" ON public.project_files FOR SELECT TO authenticated
  USING (public.can_see_ffe(auth.uid(), lead_id, project_id)
         AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal'])
              OR public.ws_role(auth.uid()) NOT IN ('designer','coordinator')));

CREATE OR REPLACE FUNCTION public.can_touch_workspace_object(_uid uuid, _name text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare kind text := split_part(_name, '/', 1);
        seg  text := split_part(_name, '/', 2);
        id   uuid;
begin
  if _uid is null then return false; end if;
  -- The GM can always reach any object (keeps orphaned objects deletable).
  if public.is_gm(_uid) then return true; end if;
  -- Designers and coordinators never reach deal records, wherever they are stored (deals/ path or a project path).
  if public.ws_role(_uid) in ('designer','coordinator') and (kind = 'deals' or exists (
       select 1 from public.project_files f where f.storage_path = _name and f.category in ('Signed contract','Proposal'))) then
    return false;
  end if;
  if seg !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  id := seg::uuid;
  if kind = 'designs'  then return public.can_see_lead(_uid, id);    end if;
  if kind in ('projects','snags') then return public.can_see_project(_uid, id); end if;
  if kind = 'deals' then
    return public.can_see_lead(_uid, id)
        or exists (select 1 from public.projects p where p.lead_id = seg::uuid and public.can_see_project(_uid, p.id));
  end if;
  return false;
end $function$;

-- 2. Contracts and proposals: never coordinators, even if later put on the lead.
DROP POLICY IF EXISTS "contracts: visible with the lead, never designers" ON public.contracts;
CREATE POLICY "contracts: visible with the lead, never designers or coordinators" ON public.contracts FOR SELECT TO authenticated
  USING (public.ws_role(auth.uid()) NOT IN ('designer','coordinator') AND public.can_see_lead(auth.uid(), lead_id));
DROP POLICY IF EXISTS "proposals: visible with the lead, never designers" ON public.proposals;
CREATE POLICY "proposals: visible with the lead, never designers or coordinators" ON public.proposals FOR SELECT TO authenticated
  USING (public.ws_role(auth.uid()) NOT IN ('designer','coordinator') AND public.can_see_lead(auth.uid(), lead_id));

-- 3. Markup and GM notes: GM and designer only.
CREATE OR REPLACE FUNCTION public.can_see_costing_private(_uid uuid, _costing uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.ffe_costings c
     where c.id = _costing
       and public.can_see_ffe(_uid, c.lead_id, c.project_id)
       and public.ws_role(_uid) in ('gm','designer'))
$function$;

-- 4. The quoted client price (ffe_costings.options) is not selectable directly; it is read through
--    ws_costing_options, which withholds it from coordinators. Every other costing column stays readable.
REVOKE SELECT ON public.ffe_costings FROM authenticated;
GRANT SELECT (id, project_id, lead_id, status, version, submitted_at, quoted_at, quoted_by, purpose, created_at, updated_at)
  ON public.ffe_costings TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_costing_options(_costing uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select case when public.ws_role(auth.uid()) = 'coordinator' then null else c.options end
    from public.ffe_costings c
   where c.id = _costing and public.can_see_ffe(auth.uid(), c.lead_id, c.project_id)
$function$;
REVOKE ALL ON FUNCTION public.ws_costing_options(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_costing_options(uuid) TO authenticated;