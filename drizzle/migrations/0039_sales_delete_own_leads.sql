-- Why a lead can't be deleted by _uid (null = allowed). Converted leads are refused for everyone (FK); signed contracts and other people's leads are GM-only.
CREATE OR REPLACE FUNCTION public.ws_lead_delete_block(_uid uuid, _lead uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
declare l public.leads%rowtype; code text;
begin
  select * into l from public.leads where id = _lead;
  if not found or _uid is null or not public.can_see_lead(_uid, _lead) then return 'This lead doesn''t exist or you don''t have access to it.'; end if;
  if l.converted_project_id is not null then
    select p.code into code from public.projects p where p.id = l.converted_project_id;
    return format('%s is now project %s — delete the project first.', l.name, coalesce(code, '(unknown)'));
  end if;
  if public.is_gm(_uid) then return null; end if;
  if l.sales_id is distinct from _uid or public.ws_role(_uid) <> 'sales' then
    return 'Only the lead''s sales owner or the GM can delete it.';
  end if;
  if exists (select 1 from public.contracts c where c.lead_id = _lead and c.status = 'Signed') then
    return format('%s has a signed contract — only the GM can delete it.', l.name);
  end if;
  return null;
end $f$;
REVOKE ALL ON FUNCTION public.ws_lead_delete_block(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_lead_delete_block(uuid, uuid) TO authenticated, service_role;

-- What deleting a lead takes with it, for the confirmation.
CREATE OR REPLACE FUNCTION public.ws_lead_delete_preview(_lead uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.can_see_lead(uid, _lead) then raise exception 'This lead doesn''t exist or you don''t have access to it.'; end if;
  return jsonb_build_object(
    'blocked', public.ws_lead_delete_block(uid, _lead),
    'brief', exists (select 1 from public.requirement_briefs where lead_id = _lead),
    'ffe_items', (select count(*) from public.ffe_items where lead_id = _lead),
    'designs', (select count(*) from public.designs where lead_id = _lead),
    'design_images', (select count(*) from public.design_images i join public.designs d on d.id = i.design_id where d.lead_id = _lead),
    'documents', (select count(*) from public.project_files where lead_id = _lead),
    'proposals', (select count(*) from public.proposals where lead_id = _lead),
    'contracts', (select count(*) from public.contracts where lead_id = _lead),
    'tasks', (select count(*) from public.tasks where lead_id = _lead),
    'comments', (select count(*) from public.comments where lead_id = _lead),
    'costing', exists (select 1 from public.ffe_costings where lead_id = _lead)
  );
end $f$;
REVOKE ALL ON FUNCTION public.ws_lead_delete_preview(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_lead_delete_preview(uuid) TO authenticated;

-- Every stored object belonging to a lead. Server-side only (the delete-lead function removes them before the row).
CREATE OR REPLACE FUNCTION public.ws_lead_storage_paths(_lead uuid)
 RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  select o.name from storage.objects o
   where o.bucket_id = 'workspace' and (o.name like 'designs/' || _lead::text || '/%' or o.name like 'deals/' || _lead::text || '/%')
  union
  select storage_path from public.project_files where lead_id = _lead and project_id is null
  union
  select i.storage_path from public.design_images i join public.designs d on d.id = i.design_id where d.lead_id = _lead
$f$;
REVOKE ALL ON FUNCTION public.ws_lead_storage_paths(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ws_lead_storage_paths(uuid) TO service_role;

-- The guard explains refusals; the policy keeps other people's leads out of reach.
CREATE OR REPLACE FUNCTION public.ws_lead_delete_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
declare why text;
begin
  if auth.uid() is null then
    if old.converted_project_id is not null then
      raise exception '% is now project % — delete the project first.', old.name, (select code from public.projects where id = old.converted_project_id);
    end if;
    return old;
  end if;
  why := public.ws_lead_delete_block(auth.uid(), old.id);
  if why is not null then raise exception '%', why; end if;
  return old;
end $f$;
DROP TRIGGER IF EXISTS leads_delete_guard ON public.leads;
CREATE TRIGGER leads_delete_guard BEFORE DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.ws_lead_delete_guard();

DROP POLICY IF EXISTS "leads: GM deletes" ON public.leads;
CREATE POLICY "leads: owner or GM deletes" ON public.leads FOR DELETE TO authenticated
  USING (public.is_gm(auth.uid()) OR sales_id = auth.uid());