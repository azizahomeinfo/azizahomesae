ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE public.project_files ALTER COLUMN project_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS project_files_lead_idx ON public.project_files (lead_id);
ALTER TABLE public.project_files ADD CONSTRAINT project_files_owner_check CHECK (
  project_id IS NOT NULL OR (lead_id IS NOT NULL AND category IN ('Signed contract','Proposal')));
COMMENT ON COLUMN public.project_files.lead_id IS 'Deal documents filed before a project exists; project_id is stamped onto them when the lead becomes a project (ws_carry_deal_files).';

DROP POLICY IF EXISTS "project files: visible with the project" ON public.project_files;
DROP POLICY IF EXISTS "project files: project staff add" ON public.project_files;
DROP POLICY IF EXISTS "project files: uploader or GM edits" ON public.project_files;
DROP POLICY IF EXISTS "project files: uploader or GM removes" ON public.project_files;

CREATE POLICY "project files: visible with the lead or project" ON public.project_files FOR SELECT TO authenticated
  USING (public.can_see_ffe(auth.uid(), lead_id, project_id));
CREATE POLICY "project files: staff add" ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (public.can_see_ffe(auth.uid(), lead_id, project_id) AND uploaded_by = auth.uid()
    AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal'])
         OR public.ws_role(auth.uid()) = ANY (ARRAY['sales'::workspace_role,'gm'::workspace_role])));
CREATE POLICY "project files: uploader or GM edits" ON public.project_files FOR UPDATE TO authenticated
  USING (public.can_see_ffe(auth.uid(), lead_id, project_id) AND (uploaded_by = auth.uid() OR public.is_gm(auth.uid())))
  WITH CHECK (public.can_see_ffe(auth.uid(), lead_id, project_id)
    AND (category IS NULL OR category <> ALL (ARRAY['Signed contract','Proposal'])
         OR public.ws_role(auth.uid()) = ANY (ARRAY['sales'::workspace_role,'gm'::workspace_role])));
CREATE POLICY "project files: uploader or GM removes" ON public.project_files FOR DELETE TO authenticated
  USING (public.can_see_ffe(auth.uid(), lead_id, project_id) AND (uploaded_by = auth.uid() OR public.is_gm(auth.uid())));

CREATE OR REPLACE FUNCTION public.ws_carry_deal_files() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.converted_project_id IS NOT NULL AND NEW.converted_project_id IS DISTINCT FROM OLD.converted_project_id THEN
    UPDATE public.project_files SET project_id = NEW.converted_project_id
     WHERE lead_id = NEW.id AND project_id IS NULL;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS leads_carry_deal_files ON public.leads;
CREATE TRIGGER leads_carry_deal_files AFTER UPDATE OF converted_project_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.ws_carry_deal_files();

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