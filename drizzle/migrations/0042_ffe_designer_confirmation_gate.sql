ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS confirmed_at timestamptz, ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.workspace_members(user_id);
COMMENT ON COLUMN public.projects.confirmed_at IS 'FF&E list confirmed by the designer (or GM); null = awaiting confirmation. Set only via ws_confirm_ffe_list / ws_return_ffe_list / ws_submit_budget.';
GRANT SELECT (confirmed_at, confirmed_by) ON public.projects TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_confirm_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $f$ BEGIN
  IF current_setting('ws.confirming', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.confirmed_at := NULL; NEW.confirmed_by := NULL; RETURN NEW; END IF;
  IF (NEW.confirmed_at, NEW.confirmed_by) IS DISTINCT FROM (OLD.confirmed_at, OLD.confirmed_by) THEN
    RAISE EXCEPTION 'The FF&E list is confirmed only by the designer or the GM, with the Confirm button';
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS projects_ffe_confirm_guard ON public.projects;
CREATE TRIGGER projects_ffe_confirm_guard BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_confirm_guard();

CREATE OR REPLACE FUNCTION public.ws_request_ffe_confirm(_project uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE p public.projects; g record; u uuid; b text := '';
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF p.id IS NULL OR p.confirmed_at IS NOT NULL THEN RETURN; END IF;
  IF p.designer_id IS NULL THEN b := 'No designer is assigned, so the GM confirms the list. '; END IF;
  b := b || 'Check it, edit anything that changed, then press Confirm on the FF&E tab.';
  IF public.ws_needs_budget(_project) THEN
    SELECT * INTO g FROM public.ws_ffe_gaps(_project);
    b := b || ' This project also needs GM budget approval: ' || g.no_supplier || ' of ' || g.total || ' items have no supplier, ' || g.no_link || ' no purchase link.';
  END IF;
  FOR u IN SELECT user_id FROM public.workspace_members
            WHERE (p.designer_id IS NOT NULL AND user_id = p.designer_id) OR (p.designer_id IS NULL AND role = 'gm' AND active) LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'ffe_confirm', coalesce(p.client, p.name) || ' is now a project — confirm the FF&E list so purchasing can start', b, p.lead_id, p.id);
  END LOOP;
END $f$;

CREATE OR REPLACE FUNCTION public.ws_release_procurement(_project uuid, _title text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE p public.projects; u uuid;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF p.confirmed_at IS NULL THEN RETURN false; END IF;
  IF public.ws_needs_budget(_project) AND NOT EXISTS (
       SELECT 1 FROM public.ffe_costings WHERE project_id = _project AND purpose = 'budget' AND status = 'Quoted') THEN
    RETURN false;
  END IF;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', _title, 'Cabinetry first.', p.lead_id, p.id);
  END LOOP;
  RETURN true;
END $f$;
REVOKE ALL ON FUNCTION public.ws_request_ffe_confirm(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ws_release_procurement(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_confirm_ffe_list(_project uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE p public.projects;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR (p.designer_id IS NOT NULL AND p.designer_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the project''s designer or the GM can confirm the FF&E list';
  END IF;
  IF p.confirmed_at IS NOT NULL THEN RAISE EXCEPTION 'The FF&E list is already confirmed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ffe_items WHERE project_id = _project) THEN
    RAISE EXCEPTION 'This project has no FF&E items — there is nothing to buy. Build the FF&E list before confirming it';
  END IF;
  PERFORM set_config('ws.confirming', 'on', true);
  UPDATE public.projects SET confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _project;
  PERFORM set_config('ws.confirming', '', true);
  PERFORM public.ws_release_procurement(_project, coalesce(p.client, p.name) || ' — FF&E list confirmed, procurement can start');
END $f$;

CREATE OR REPLACE FUNCTION public.ws_return_ffe_list(_project uuid, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE p public.projects; u uuid; n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM can send a confirmed FF&E list back to the designer'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF p.confirmed_at IS NULL THEN RAISE EXCEPTION 'The FF&E list isn''t confirmed yet'; END IF;
  IF n IS NULL THEN RAISE EXCEPTION 'Say what needs checking before sending the list back'; END IF;
  PERFORM set_config('ws.confirming', 'on', true);
  UPDATE public.projects SET confirmed_at = NULL, confirmed_by = NULL WHERE id = _project;
  PERFORM set_config('ws.confirming', '', true);
  IF p.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (p.designer_id, 'ffe_confirm', coalesce(p.client, p.name) || ' — the GM sent the FF&E list back to you to re-check and confirm', n, p.lead_id, p.id);
  END IF;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', coalesce(p.client, p.name) || ' — FF&E list sent back for re-checking, hold new orders', n, p.lead_id, p.id);
  END LOOP;
END $f$;
REVOKE ALL ON FUNCTION public.ws_confirm_ffe_list(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.ws_return_ffe_list(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_confirm_ffe_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ws_return_ffe_list(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_confirmed_edit(_project uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE p public.projects; who text; u uuid;
BEGIN
  IF _project IS NULL OR public.ws_role(auth.uid()) NOT IN ('designer','gm') THEN RETURN; END IF;
  IF coalesce(current_setting('ws.converting', true),'') = 'on' OR coalesce(current_setting('ws.reband', true),'') = 'on' THEN RETURN; END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF p.confirmed_at IS NULL THEN RETURN; END IF;
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    PERFORM public.ws_notify_once(u, p.lead_id, 'ffe_changed',
      format('%s changed the confirmed FF&E list for %s — check before ordering', coalesce(who, 'Someone'), coalesce(p.client, p.name)));
  END LOOP;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_confirmed_edit(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_item_confirmed_trg()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$ BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.room, NEW.category, NEW.item, NEW.spec, NEW.qty, NEW.unit, NEW.sku, NEW.dims, NEW.finish,
       NEW.supplier_id, NEW.supplier_name, NEW.supplier_contact, NEW.product_url, NEW.project_id)
     IS NOT DISTINCT FROM (OLD.room, OLD.category, OLD.item, OLD.spec, OLD.qty, OLD.unit, OLD.sku, OLD.dims, OLD.finish,
       OLD.supplier_id, OLD.supplier_name, OLD.supplier_contact, OLD.product_url, OLD.project_id) THEN
    RETURN NULL;
  END IF;
  PERFORM public.ws_ffe_confirmed_edit(CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END);
  RETURN NULL;
END $f$;
DROP TRIGGER IF EXISTS ffe_items_confirmed_edit ON public.ffe_items;
CREATE TRIGGER ffe_items_confirmed_edit AFTER INSERT OR UPDATE OR DELETE ON public.ffe_items FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_item_confirmed_trg();

CREATE OR REPLACE FUNCTION public.ws_ffe_cost_confirmed_trg()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$ BEGIN
  IF TG_OP = 'UPDATE' AND NEW.unit_cost IS NOT DISTINCT FROM OLD.unit_cost THEN RETURN NULL; END IF;
  PERFORM public.ws_ffe_confirmed_edit((SELECT project_id FROM public.ffe_items WHERE id = coalesce(NEW.item_id, OLD.item_id)));
  RETURN NULL;
END $f$;
DROP TRIGGER IF EXISTS ffe_item_costs_confirmed_edit ON public.ffe_item_costs;
CREATE TRIGGER ffe_item_costs_confirmed_edit AFTER INSERT OR UPDATE OR DELETE ON public.ffe_item_costs FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_cost_confirmed_trg();

CREATE OR REPLACE FUNCTION public.ws_ffe_list_arrived()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.project_id IS NULL OR current_setting('ws.converting', true) = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE project_id = NEW.project_id AND kind IN ('ffe_confirm','procurement')) THEN RETURN NULL; END IF;
  PERFORM public.ws_request_ffe_confirm(NEW.project_id);
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_convert_lead(_lead uuid, _handover date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.leads; pid uuid; coord uuid; u uuid; n int; code text;
BEGIN
  IF _handover IS NULL THEN RAISE EXCEPTION 'Enter the handover date to convert this lead into a project'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR l.sales_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the sales owner or the GM can convert a lead into a project';
  END IF;
  IF l.converted_project_id IS NOT NULL THEN RAISE EXCEPTION 'This lead is already a project'; END IF;
  IF l.status = 'Lost' THEN RAISE EXCEPTION 'Reopen this lost lead before converting it'; END IF;
  SELECT user_id INTO coord FROM public.workspace_members WHERE role = 'coordinator' AND active ORDER BY created_at LIMIT 1;
  INSERT INTO public.projects (lead_id, name, client, property, unit, unit_type, location, drive_url,
    sales_id, designer_id, coordinator_id, start_date, handover_date, stage, created_by)
  VALUES (l.id, l.name, l.name, l.property, l.building, l.unit_type, l.location, l.drive_url,
    l.sales_id, l.designer_id, coord, current_date, _handover, 'Contract / Deposit', auth.uid())
  RETURNING id, projects.code INTO pid, code;
  INSERT INTO public.project_value_private (project_id, value) VALUES (pid, l.budget);
  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  PERFORM set_config('ws.converting', 'on', true);
  PERFORM public.ws_seed_ffe_from_brief(l.id, pid);
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  PERFORM set_config('ws.converting', '', true);
  SELECT count(*) INTO n FROM public.ffe_items WHERE project_id = pid;
  PERFORM public.ws_create_drawing_tasks(pid, l.id, l.designer_id, l.name || ' won');
  -- The coordinator hears the project exists; procurement waits for the designer's confirmation and GM budget approval.
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', l.name || ' is now a project — handover ' || to_char(_handover, 'DD Mon YYYY'),
      CASE WHEN n > 0 THEN 'FF&E list is with the designer to confirm, then GM budget approval. You can look at it, but nothing to buy yet — you''ll be notified when procurement can start.'
           ELSE 'No FF&E list yet. Nothing to buy until it is built and confirmed — you''ll be notified.' END, l.id, pid);
  END LOOP;
  IF n > 0 THEN PERFORM public.ws_request_ffe_confirm(pid); END IF;
  RETURN jsonb_build_object('project_id', pid, 'code', code, 'items', n);
END $function$;

CREATE OR REPLACE FUNCTION public.ws_sign_contract(_contract uuid, _handover date)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.contracts; l public.leads; pid uuid; coord uuid; sub numeric; tot numeric; u uuid;
BEGIN
  IF _handover IS NULL THEN RAISE EXCEPTION 'Enter the handover date to mark the contract signed'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = c.lead_id FOR UPDATE;
  IF NOT (public.is_gm(auth.uid()) OR l.sales_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the sales owner or the GM can mark a contract signed';
  END IF;
  IF c.status <> 'Issued' THEN RAISE EXCEPTION 'Only an issued contract can be marked signed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ffe_items WHERE lead_id = l.id OR (l.converted_project_id IS NOT NULL AND project_id = l.converted_project_id)) THEN
    RAISE EXCEPTION 'This lead has no FF&E items — there is nothing to buy. Build the FF&E list before marking the contract signed';
  END IF;
  sub := coalesce(nullif(c.doc->>'subtotal','')::numeric, 0);
  tot := round(CASE WHEN coalesce((c.doc->>'vatCharged')::boolean, true) THEN sub * 1.05 ELSE sub END);
  SELECT user_id INTO coord FROM public.workspace_members WHERE role = 'coordinator' AND active ORDER BY created_at LIMIT 1;
  pid := l.converted_project_id;
  IF pid IS NULL THEN
    INSERT INTO public.projects (lead_id, name, client, property, unit, unit_type, location, drive_url,
      sales_id, designer_id, coordinator_id, start_date, handover_date, stage, created_by)
    VALUES (l.id, coalesce(nullif(c.doc->>'client',''), l.name), coalesce(nullif(c.doc->>'client',''), l.name),
      l.property, coalesce(nullif(c.doc->>'unit',''), l.building), l.unit_type, l.location, l.drive_url,
      l.sales_id, l.designer_id, coord, current_date, _handover, 'Contract / Deposit', auth.uid())
    RETURNING id INTO pid;
  ELSE
    UPDATE public.projects SET handover_date = _handover, coordinator_id = coalesce(coordinator_id, coord) WHERE id = pid;
  END IF;
  INSERT INTO public.project_value_private (project_id, value) VALUES (pid, tot)
    ON CONFLICT (project_id) DO UPDATE SET value = EXCLUDED.value;
  PERFORM set_config('ws.signing', 'on', true);
  UPDATE public.contracts SET status = 'Signed' WHERE id = c.id;
  PERFORM set_config('ws.signing', '', true);
  UPDATE public.leads SET status = 'Won', converted_project_id = pid WHERE id = l.id;
  PERFORM set_config('ws.converting', 'on', true);
  UPDATE public.ffe_items SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  UPDATE public.ffe_costings SET project_id = pid WHERE lead_id = l.id AND project_id IS NULL;
  PERFORM set_config('ws.converting', '', true);
  PERFORM public.ws_create_drawing_tasks(pid, l.id, l.designer_id, l.name || ' signed');
  -- The coordinator hears the project exists; procurement starts only once the designer confirms the list.
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', l.name || ' signed — project created, handover ' || to_char(_handover, 'DD Mon YYYY'),
      'FF&E list is with the designer to confirm. You can look at it, but nothing to buy yet — you''ll be notified when procurement can start.', l.id, pid);
  END LOOP;
  PERFORM public.ws_request_ffe_confirm(pid);
  RETURN pid;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_submit_budget(_project uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.projects; g record; cid uuid; st costing_status; missing text[] := '{}'; cost numeric; u uuid;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT (public.is_gm(auth.uid()) OR p.designer_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the project''s designer or the GM can submit the FF&E list for budget approval';
  END IF;
  IF NOT public.ws_needs_budget(_project) THEN
    RAISE EXCEPTION 'This project came from a contract signed in the system — its FF&E list was already quoted, no budget approval needed';
  END IF;
  SELECT * INTO g FROM public.ws_ffe_gaps(_project);
  IF g.total = 0 THEN missing := missing || 'the FF&E list is empty'::text; END IF;
  IF g.no_supplier > 0 THEN missing := missing || format('%s item%s no supplier', g.no_supplier, CASE WHEN g.no_supplier = 1 THEN ' has' ELSE 's have' END); END IF;
  IF g.no_link > 0 THEN missing := missing || format('%s item%s no purchase link', g.no_link, CASE WHEN g.no_link = 1 THEN ' has' ELSE 's have' END); END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Can''t submit for budget approval — %', array_to_string(missing, '; ');
  END IF;
  SELECT id, status INTO cid, st FROM public.ffe_costings
   WHERE project_id = _project OR (p.lead_id IS NOT NULL AND lead_id = p.lead_id) ORDER BY project_id NULLS LAST LIMIT 1 FOR UPDATE;
  IF st = 'Submitted' THEN RAISE EXCEPTION 'The FF&E list is already with the GM for budget approval'; END IF;
  PERFORM set_config('ws.budget', 'on', true);
  IF cid IS NULL THEN
    INSERT INTO public.ffe_costings (project_id, lead_id, status, submitted_at, purpose)
    VALUES (_project, p.lead_id, 'Submitted', now(), 'budget') RETURNING id INTO cid;
    INSERT INTO public.ffe_costing_private (costing_id, markup_pct) VALUES (cid, 0) ON CONFLICT (costing_id) DO NOTHING;
  ELSE
    UPDATE public.ffe_costings SET purpose = 'budget', status = 'Submitted', submitted_at = now(), project_id = _project WHERE id = cid;
  END IF;
  PERFORM set_config('ws.budget', '', true);
  -- Submitting a complete list is the designer's (or GM's) confirmation of it.
  IF p.confirmed_at IS NULL THEN
    PERFORM set_config('ws.confirming', 'on', true);
    UPDATE public.projects SET confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _project;
    PERFORM set_config('ws.confirming', '', true);
  END IF;
  SELECT coalesce(sum(i.qty * c.unit_cost), 0) INTO cost FROM public.ffe_items i
    LEFT JOIN public.ffe_item_costs c ON c.item_id = i.id WHERE i.project_id = _project;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'gm' AND active LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'budget', p.code || ' — FF&E budget approval needed',
      g.total || ' items, cost AED ' || to_char(cost, 'FM999,999,999') || '. The client price is already agreed; this approves internal spend.', p.lead_id, p.id);
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.ws_decide_budget(_project uuid, _approve boolean, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.projects; c public.ffe_costings; u uuid; n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM can approve the FF&E budget'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project;
  SELECT * INTO c FROM public.ffe_costings WHERE project_id = _project FOR UPDATE;
  IF c.id IS NULL OR c.purpose <> 'budget' OR c.status <> 'Submitted' THEN
    RAISE EXCEPTION 'There is no FF&E list waiting for budget approval on this project';
  END IF;
  IF NOT _approve AND n IS NULL THEN RAISE EXCEPTION 'Say what needs changing before sending the list back'; END IF;
  INSERT INTO public.ffe_costing_private (costing_id, markup_pct) VALUES (c.id, 0) ON CONFLICT (costing_id) DO NOTHING;
  IF _approve THEN
    UPDATE public.ffe_costings SET status = 'Quoted', quoted_at = now(), quoted_by = auth.uid() WHERE id = c.id;
    UPDATE public.ffe_costing_private SET gm_notes = n, return_note = NULL WHERE costing_id = c.id;
    -- Released only if the list is also confirmed; otherwise confirmation releases it later.
    PERFORM public.ws_release_procurement(_project, p.code || ' — FF&E budget approved, procurement can start');
    IF p.designer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, lead_id, project_id)
      VALUES (p.designer_id, 'budget', p.code || ' — FF&E budget approved', p.lead_id, p.id);
    END IF;
  ELSE
    UPDATE public.ffe_costings SET status = 'Returned' WHERE id = c.id;
    UPDATE public.ffe_costing_private SET return_note = n WHERE costing_id = c.id;
    FOR u IN SELECT coalesce(p.designer_id, m.user_id) FROM public.workspace_members m
              WHERE (p.designer_id IS NULL AND m.role = 'gm' AND m.active AND m.user_id <> auth.uid()) OR (p.designer_id IS NOT NULL AND m.user_id = p.designer_id) LOOP
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (u, 'budget', p.code || ' — FF&E budget sent back', n, p.lead_id, p.id);
    END LOOP;
  END IF;
END $function$;