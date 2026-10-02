-- An item the coordinator cannot buy (out of stock, discontinued) is not a procurement problem to
-- work around: the designer has to choose something else. And once a list is confirmed, every
-- change to it is money, so the GM hears about all of them and signs off the ones that cost more.

DO $$ BEGIN
  CREATE TYPE public.ffe_review AS ENUM ('Out of stock', 'Awaiting GM approval');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ffe_items
  ADD COLUMN IF NOT EXISTS review public.ffe_review,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS review_by uuid,
  ADD COLUMN IF NOT EXISTS review_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_prev jsonb;

-- Readable by anyone who can read the row, writable by nobody: the state moves only through the
-- functions below, so a hold can't be cleared with a plain PATCH.
GRANT SELECT (review, review_note, review_by, review_at, review_prev) ON public.ffe_items TO authenticated;

-- Internal only. Never granted to authenticated: it would hand sales the cost price.
CREATE OR REPLACE FUNCTION public.ws_ffe_line_total(_item uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(i.qty, 0) * coalesce(c.unit_cost, 0)
    FROM public.ffe_items i LEFT JOIN public.ffe_item_costs c ON c.item_id = i.id
   WHERE i.id = _item
$$;
REVOKE ALL ON FUNCTION public.ws_ffe_line_total(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_tell_gm(_lead uuid, _project uuid, _title text, _body text, _once boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE g uuid;
BEGIN
  FOR g IN SELECT user_id FROM public.workspace_members WHERE role = 'gm' AND active LOOP
    IF g = auth.uid() THEN CONTINUE; END IF;
    IF _once THEN PERFORM public.ws_notify_once(g, _lead, 'ffe_change', _title);
    ELSE
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (g, 'ffe_change', _title, _body, _lead, _project);
    END IF;
  END LOOP;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_tell_gm(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_tell_coordinators(_lead uuid, _project uuid, _title text, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE u uuid;
BEGIN
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    IF u = auth.uid() THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'procurement', _title, _body, _lead, _project);
  END LOOP;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_tell_coordinators(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_out_of_stock(_items uuid[], _note text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE n text := nullif(btrim(coalesce(_note, '')), ''); r record; cnt int := 0;
        proj uuid; p public.projects; names text := ''; who text;
BEGIN
  IF public.ws_role(auth.uid()) NOT IN ('coordinator', 'gm') THEN
    RAISE EXCEPTION 'Only the coordinator or the GM can send an item back as out of stock';
  END IF;
  IF n IS NULL THEN RAISE EXCEPTION 'Say what is wrong with the item, so the designer knows what to look for'; END IF;
  IF coalesce(array_length(_items, 1), 0) = 0 THEN RAISE EXCEPTION 'Pick at least one item to send back'; END IF;

  FOR r IN SELECT i.* FROM public.ffe_items i WHERE i.id = ANY (_items) ORDER BY i.sort_order LOOP
    IF r.project_id IS NULL THEN RAISE EXCEPTION '% is not on a project yet', coalesce(r.ref, r.item); END IF;
    IF NOT public.can_see_ffe(auth.uid(), r.lead_id, r.project_id) THEN RAISE EXCEPTION 'That item is not yours'; END IF;
    IF proj IS NULL THEN proj := r.project_id;
    ELSIF proj <> r.project_id THEN RAISE EXCEPTION 'Send items back one project at a time'; END IF;
    IF r.stage IN ('Delivered', 'Installed', 'Closed') THEN
      RAISE EXCEPTION '% is already %, so it is too late to re-choose it', coalesce(r.ref, r.item), r.stage;
    END IF;
    IF r.review = 'Out of stock' THEN CONTINUE; END IF;

    PERFORM set_config('ws.reviewing', 'on', true);
    UPDATE public.ffe_items SET
      review = 'Out of stock', review_note = n, review_by = auth.uid(), review_at = now(),
      review_prev = jsonb_build_object(
        'item', r.item, 'supplier_name', r.supplier_name, 'product_url', r.product_url,
        'qty', r.qty, 'unit_cost', (SELECT unit_cost FROM public.ffe_item_costs WHERE item_id = r.id),
        'line_total', public.ws_ffe_line_total(r.id)),
      stage = 'Issue / Replacement'
     WHERE id = r.id;
    PERFORM set_config('ws.reviewing', '', true);

    names := names || CASE WHEN names = '' THEN '' ELSE E'\n' END || coalesce(r.ref || ' · ', '') || r.item;
    cnt := cnt + 1;
  END LOOP;

  IF cnt = 0 THEN RAISE EXCEPTION 'Those items are already waiting on the designer'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = proj;
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();

  IF p.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (p.designer_id, 'ffe_reselect',
      format('%s — %s item%s out of stock, please re-choose', coalesce(p.client, p.name), cnt,
             CASE WHEN cnt = 1 THEN '' ELSE 's' END),
      n || E'\n\n' || names, p.lead_id, p.id);
    -- tasks_one_parent: a task hangs off the project or the lead, never both.
    INSERT INTO public.tasks (project_id, title, detail, assignee_id, due_at, priority, created_by)
    VALUES (proj,
      format('Re-choose %s out-of-stock item%s', cnt, CASE WHEN cnt = 1 THEN '' ELSE 's' END),
      n || E'\n\n' || names, p.designer_id, now() + interval '48 hours', 'High', auth.uid());
  END IF;

  PERFORM public.ws_ffe_tell_gm(p.lead_id, p.id,
    format('%s — %s sent %s item%s back to the designer as out of stock', coalesce(p.client, p.name),
           coalesce(who, 'The coordinator'), cnt, CASE WHEN cnt = 1 THEN '' ELSE 's' END),
    n || E'\n\n' || names, false);
  RETURN cnt;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_out_of_stock(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_ffe_out_of_stock(uuid[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_reselected(_item uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE i public.ffe_items; p public.projects; prev jsonb; oldt numeric; newt numeric; who text; msg text;
BEGIN
  SELECT * INTO i FROM public.ffe_items WHERE id = _item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = i.project_id;
  IF NOT (public.is_gm(auth.uid()) OR (p.designer_id IS NOT NULL AND p.designer_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the project''s designer or the GM can hand a replacement back';
  END IF;
  IF i.review IS DISTINCT FROM 'Out of stock' THEN
    RAISE EXCEPTION 'That item is not waiting for a replacement';
  END IF;

  prev := coalesce(i.review_prev, '{}'::jsonb);
  IF (i.item, coalesce(i.supplier_name, ''), coalesce(i.product_url, ''))
     IS NOT DISTINCT FROM (prev->>'item', coalesce(prev->>'supplier_name', ''), coalesce(prev->>'product_url', ''))
  THEN
    RAISE EXCEPTION 'Nothing has changed yet — pick a different product, supplier or link before handing it back';
  END IF;

  oldt := coalesce((prev->>'line_total')::numeric, 0);
  newt := public.ws_ffe_line_total(_item);
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();

  IF newt > oldt THEN
    PERFORM set_config('ws.reviewing', 'on', true);
    UPDATE public.ffe_items SET review = 'Awaiting GM approval', review_by = auth.uid(), review_at = now(),
      review_note = format('%s replaced "%s" with "%s". Line total %s → %s.',
        coalesce(who, 'The designer'), prev->>'item', i.item, round(oldt, 2), round(newt, 2))
     WHERE id = _item;
    PERFORM set_config('ws.reviewing', '', true);
    PERFORM public.ws_ffe_tell_gm(i.lead_id, i.project_id,
      format('%s — %s costs more than the item it replaces, your approval needed', coalesce(p.client, p.name), i.ref),
      format('%s replaced "%s" with "%s". Line total %s → %s (up %s).',
        coalesce(who, 'The designer'), prev->>'item', i.item, round(oldt, 2), round(newt, 2), round(newt - oldt, 2)), false);
    PERFORM public.ws_ffe_tell_coordinators(i.lead_id, i.project_id,
      format('%s — %s replaced, but it costs more so the GM has to approve it. Don''t order it yet.',
        coalesce(p.client, p.name), i.ref), i.item);
    msg := 'Sent to the GM — the replacement costs more than the original.';
  ELSE
    PERFORM set_config('ws.reviewing', 'on', true);
    UPDATE public.ffe_items SET review = NULL, review_note = NULL, review_by = NULL, review_at = NULL,
      review_prev = NULL, stage = 'Awaiting Quote'
     WHERE id = _item;
    PERFORM set_config('ws.reviewing', '', true);
    PERFORM public.ws_ffe_tell_coordinators(i.lead_id, i.project_id,
      format('%s — %s re-chosen, you can buy it', coalesce(p.client, p.name), i.ref),
      format('"%s" replaces "%s". No cost increase.', i.item, prev->>'item'));
    PERFORM public.ws_ffe_tell_gm(i.lead_id, i.project_id,
      format('%s — %s re-chosen at no extra cost', coalesce(p.client, p.name), i.ref),
      format('%s replaced "%s" with "%s". Line total %s → %s.',
        coalesce(who, 'The designer'), prev->>'item', i.item, round(oldt, 2), round(newt, 2)), false);
    msg := 'Back with the coordinator to buy.';
  END IF;
  RETURN msg;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_reselected(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_ffe_reselected(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_decide_change(_item uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE i public.ffe_items; p public.projects; n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.is_gm(auth.uid()) THEN RAISE EXCEPTION 'Only the GM decides a change that costs more'; END IF;
  SELECT * INTO i FROM public.ffe_items WHERE id = _item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF i.review IS DISTINCT FROM 'Awaiting GM approval' THEN RAISE EXCEPTION 'That item is not waiting for you'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = i.project_id;
  IF NOT _approve AND n IS NULL THEN
    RAISE EXCEPTION 'Say why, so the designer knows what to look for instead';
  END IF;

  PERFORM set_config('ws.reviewing', 'on', true);
  IF _approve THEN
    UPDATE public.ffe_items SET review = NULL, review_note = NULL, review_by = NULL, review_at = NULL,
      review_prev = NULL, stage = 'Awaiting Quote' WHERE id = _item;
  ELSE
    UPDATE public.ffe_items SET review = 'Out of stock', review_note = n, review_by = auth.uid(),
      review_at = now(), stage = 'Issue / Replacement' WHERE id = _item;
  END IF;
  PERFORM set_config('ws.reviewing', '', true);

  IF _approve THEN
    PERFORM public.ws_ffe_tell_coordinators(i.lead_id, i.project_id,
      format('%s — %s approved by the GM, you can buy it', coalesce(p.client, p.name), i.ref), coalesce(n, i.item));
    IF p.designer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
      VALUES (p.designer_id, 'ffe_reselect',
        format('%s — your replacement for %s was approved', coalesce(p.client, p.name), i.ref), n, i.lead_id, i.project_id);
    END IF;
  ELSIF p.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (p.designer_id, 'ffe_reselect',
      format('%s — %s costs too much, please choose again', coalesce(p.client, p.name), i.ref), n, i.lead_id, i.project_id);
  END IF;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_decide_change(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_ffe_decide_change(uuid, boolean, text) TO authenticated;

-- The coordinator may now send the whole list back too, not just the GM.
CREATE OR REPLACE FUNCTION public.ws_return_ffe_list(_project uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE p public.projects; u uuid; who text; n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF public.ws_role(auth.uid()) NOT IN ('gm', 'coordinator') THEN
    RAISE EXCEPTION 'Only the GM or the coordinator can send a confirmed FF&E list back to the designer';
  END IF;
  SELECT * INTO p FROM public.projects WHERE id = _project FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF p.confirmed_at IS NULL THEN RAISE EXCEPTION 'The FF&E list isn''t confirmed yet'; END IF;
  IF n IS NULL THEN RAISE EXCEPTION 'Say what needs checking before sending the list back'; END IF;
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();

  PERFORM set_config('ws.confirming', 'on', true);
  UPDATE public.projects SET confirmed_at = NULL, confirmed_by = NULL WHERE id = _project;
  PERFORM set_config('ws.confirming', '', true);

  IF p.designer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (p.designer_id, 'ffe_confirm',
      format('%s — %s sent the FF&E list back to you to re-check and confirm', coalesce(p.client, p.name),
             coalesce(who, 'Someone')), n, p.lead_id, p.id);
  END IF;
  FOR u IN SELECT user_id FROM public.workspace_members WHERE role = 'coordinator' AND active LOOP
    IF u = auth.uid() THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, kind, title, body, lead_id, project_id)
    VALUES (u, 'project', coalesce(p.client, p.name) || ' — FF&E list sent back for re-checking, hold new orders', n, p.lead_id, p.id);
  END LOOP;
  PERFORM public.ws_ffe_tell_gm(p.lead_id, p.id,
    format('%s — %s sent the whole FF&E list back to the designer', coalesce(p.client, p.name),
           coalesce(who, 'Someone')), n, false);
END $f$;

-- Nothing on hold gets bought, and the hold moves only through the functions above.
CREATE OR REPLACE FUNCTION public.ws_ffe_review_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF coalesce(current_setting('ws.reviewing', true), '') = 'on' THEN RETURN NEW; END IF;
  IF (NEW.review, NEW.review_note, NEW.review_by, NEW.review_at, NEW.review_prev)
     IS DISTINCT FROM (OLD.review, OLD.review_note, OLD.review_by, OLD.review_at, OLD.review_prev) THEN
    RAISE EXCEPTION 'Use the out-of-stock and approval buttons to change what an item is waiting for';
  END IF;
  IF OLD.review IS NOT NULL AND NEW.stage IS DISTINCT FROM OLD.stage
     AND NEW.stage NOT IN ('Issue / Replacement', 'Awaiting Quote') THEN
    RAISE EXCEPTION '% is waiting on "%" — it can''t be moved to % until that is settled',
      coalesce(OLD.ref, OLD.item), OLD.review, NEW.stage;
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS ffe_items_review_guard ON public.ffe_items;
CREATE TRIGGER ffe_items_review_guard BEFORE UPDATE ON public.ffe_items
FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_review_guard();

-- Every change to a confirmed list reaches the GM; the ones that cost more wait for them.
CREATE OR REPLACE FUNCTION public.ws_ffe_change_to_gm(_item uuid, _oldt numeric, _newt numeric, _what text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE i public.ffe_items; p public.projects; who text;
BEGIN
  SELECT * INTO i FROM public.ffe_items WHERE id = _item;
  IF i.project_id IS NULL THEN RETURN; END IF;
  SELECT * INTO p FROM public.projects WHERE id = i.project_id;
  IF p.confirmed_at IS NULL THEN RETURN; END IF;
  IF public.ws_role(auth.uid()) = 'gm' THEN RETURN; END IF;
  SELECT full_name INTO who FROM public.workspace_members WHERE user_id = auth.uid();

  IF _newt > _oldt AND i.review IS NULL THEN
    PERFORM set_config('ws.reviewing', 'on', true);
    UPDATE public.ffe_items SET review = 'Awaiting GM approval', review_by = auth.uid(), review_at = now(),
      review_note = format('%s changed %s. Line total %s → %s.', coalesce(who, 'Someone'), _what, round(_oldt, 2), round(_newt, 2))
     WHERE id = _item;
    PERFORM set_config('ws.reviewing', '', true);
    PERFORM public.ws_ffe_tell_gm(i.lead_id, i.project_id,
      format('%s — %s costs more than it did, your approval needed', coalesce(p.client, p.name), i.ref),
      format('%s changed %s on "%s". Line total %s → %s (up %s).', coalesce(who, 'Someone'), _what, i.item,
             round(_oldt, 2), round(_newt, 2), round(_newt - _oldt, 2)), false);
    PERFORM public.ws_ffe_tell_coordinators(i.lead_id, i.project_id,
      format('%s — %s is waiting on the GM, don''t order it yet', coalesce(p.client, p.name), i.ref), i.item);
  ELSE
    PERFORM public.ws_ffe_tell_gm(i.lead_id, i.project_id,
      format('%s — the confirmed FF&E list was changed', coalesce(p.client, p.name)), NULL, true);
  END IF;
END $f$;
REVOKE ALL ON FUNCTION public.ws_ffe_change_to_gm(uuid, numeric, numeric, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_item_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE c numeric;
BEGIN
  IF coalesce(current_setting('ws.reviewing', true), '') = 'on'
     OR coalesce(current_setting('ws.converting', true), '') = 'on'
     OR coalesce(current_setting('ws.reband', true), '') = 'on' THEN RETURN NULL; END IF;
  IF (NEW.item, NEW.qty, NEW.supplier_id, NEW.supplier_name, NEW.product_url, NEW.spec, NEW.dims, NEW.finish)
     IS NOT DISTINCT FROM
     (OLD.item, OLD.qty, OLD.supplier_id, OLD.supplier_name, OLD.product_url, OLD.spec, OLD.dims, OLD.finish)
  THEN RETURN NULL; END IF;
  SELECT unit_cost INTO c FROM public.ffe_item_costs WHERE item_id = NEW.id;
  PERFORM public.ws_ffe_change_to_gm(NEW.id, coalesce(OLD.qty, 0) * coalesce(c, 0),
                                     coalesce(NEW.qty, 0) * coalesce(c, 0), 'the specification');
  RETURN NULL;
END $f$;
DROP TRIGGER IF EXISTS ffe_items_change_to_gm ON public.ffe_items;
CREATE TRIGGER ffe_items_change_to_gm AFTER UPDATE ON public.ffe_items
FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_item_changed();

CREATE OR REPLACE FUNCTION public.ws_ffe_cost_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE q numeric; oldc numeric := CASE WHEN TG_OP = 'UPDATE' THEN OLD.unit_cost END;
BEGIN
  IF coalesce(current_setting('ws.reviewing', true), '') = 'on'
     OR coalesce(current_setting('ws.converting', true), '') = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND NEW.unit_cost IS NOT DISTINCT FROM OLD.unit_cost THEN RETURN NULL; END IF;
  SELECT qty INTO q FROM public.ffe_items WHERE id = NEW.item_id;
  IF q IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.ws_ffe_change_to_gm(NEW.item_id, coalesce(NEW.unit_cost, 0) * q, coalesce(NEW.unit_cost, 0) * q, 'the unit cost');
  ELSE
    PERFORM public.ws_ffe_change_to_gm(NEW.item_id, coalesce(oldc, 0) * q, coalesce(NEW.unit_cost, 0) * q, 'the unit cost');
  END IF;
  RETURN NULL;
END $f$;
DROP TRIGGER IF EXISTS ffe_item_costs_change_to_gm ON public.ffe_item_costs;
CREATE TRIGGER ffe_item_costs_change_to_gm AFTER INSERT OR UPDATE ON public.ffe_item_costs
FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_cost_changed();
