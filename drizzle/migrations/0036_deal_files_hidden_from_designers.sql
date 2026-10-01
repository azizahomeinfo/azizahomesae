DROP POLICY IF EXISTS "project files: visible with the lead or project" ON public.project_files;
-- Deal records (signed contract, proposal) carry client price and contract value: never readable by designers,
-- mirroring the proposals/contracts rule. Drawings and other files stay visible with the lead or project.
CREATE POLICY "project files: visible with the lead or project" ON public.project_files FOR SELECT TO authenticated
  USING (public.can_see_ffe(auth.uid(), lead_id, project_id)
    AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal'])
         OR public.ws_role(auth.uid()) <> 'designer'));

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
  -- Designers never reach deal records, wherever they are stored (deals/ path or a project path).
  if public.ws_role(_uid) = 'designer' and (kind = 'deals' or exists (
       select 1 from public.project_files f where f.storage_path = _name and f.category in ('Signed contract','Proposal'))) then
    return false;
  end if;
  if seg !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  id := seg::uuid;
  if kind = 'designs'  then return public.can_see_lead(_uid, id);    end if;
  if kind in ('projects','snags') then return public.can_see_project(_uid, id); end if;
  -- deals/<lead_id>/...: lead deal documents, reachable from the lead or, once converted, its project.
  if kind = 'deals' then
    return public.can_see_lead(_uid, id)
        or exists (select 1 from public.projects p where p.lead_id = seg::uuid and public.can_see_project(_uid, p.id));
  end if;
  return false;
end $function$;
CREATE INDEX IF NOT EXISTS project_files_storage_path_idx ON public.project_files (storage_path);