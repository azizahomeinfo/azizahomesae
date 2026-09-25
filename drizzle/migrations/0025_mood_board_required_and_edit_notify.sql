CREATE OR REPLACE FUNCTION public.ws_submit_design_package(_design uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare
  d public.designs%rowtype;
  b public.requirement_briefs%rowtype;
  c_id uuid;
  n_renders int; n_mood int; n_items int; n_uncosted int;
  missing text[] := '{}';
begin
  select * into d from public.designs where id = _design for update;
  if not found then raise exception 'Design not found'; end if;
  if d.status <> 'Draft' then raise exception 'Only a draft design version can be submitted'; end if;

  select count(*) into n_renders from public.design_images where design_id = d.id and kind ilike '%render%';
  select count(*) into n_mood from public.design_images where design_id = d.id and kind ilike '%mood%';
  select count(*) into n_items from public.ffe_items where lead_id = d.lead_id;
  select count(*) into n_uncosted from public.ffe_items i
    left join public.ffe_item_costs c on c.item_id = i.id
   where i.lead_id = d.lead_id and c.unit_cost is null;
  if n_renders = 0 then missing := missing || 'no renders uploaded'::text; end if;
  if n_mood = 0 then missing := missing || 'no mood board uploaded'::text; end if;
  if n_items = 0 then missing := missing || 'the FF&E list is empty'::text;
  elsif n_uncosted > 0 then missing := missing || format('%s item%s no unit cost', n_uncosted, case when n_uncosted = 1 then ' has' else 's have' end); end if;
  if array_length(missing, 1) > 0 then
    raise exception 'Can''t submit the design package — %', array_to_string(missing, '; ');
  end if;

  select id into c_id from public.ffe_costings where lead_id = d.lead_id for update;
  if c_id is null then
    insert into public.ffe_costings (lead_id, status, submitted_at) values (d.lead_id, 'Submitted', now()) returning id into c_id;
    insert into public.ffe_costing_private (costing_id) values (c_id) on conflict (costing_id) do nothing;
  else
    update public.ffe_costings set status = 'Submitted', submitted_at = now() where id = c_id;
  end if;

  update public.designs set status = 'Submitted', submitted_at = now() where id = d.id;

  select * into b from public.requirement_briefs where lead_id = d.lead_id for update;
  if found then
    if b.status in ('Assigned', 'Revision Requested', 'Design Approved') then
      update public.requirement_briefs set status = 'In Design' where id = b.id;
      b.status := 'In Design';
    end if;
    if b.status = 'In Design' then
      update public.requirement_briefs set status = 'Design Ready', ready_at = now() where id = b.id;
    end if;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.ws_notify_once(_user uuid, _lead uuid, _kind text, _title text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if _user is null or _user = auth.uid() then return; end if;
  if exists (select 1 from public.notifications where user_id = _user and lead_id = _lead and kind = _kind
             and created_at > now() - interval '15 minutes') then return; end if;
  insert into public.notifications (user_id, lead_id, kind, title) values (_user, _lead, _kind, _title);
end $$;
REVOKE ALL ON FUNCTION public.ws_notify_once(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_design_edit_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare _design uuid; _lead uuid; _sales uuid; _client text; _who text;
begin
  if public.ws_role(auth.uid()) is distinct from 'designer' then return null; end if;
  _design := coalesce(NEW.design_id, OLD.design_id);
  select d.lead_id into _lead from public.designs d where d.id = _design and d.status in ('Submitted','Accepted');
  if _lead is null then return null; end if;
  select sales_id, name into _sales, _client from public.leads where id = _lead;
  select full_name into _who from public.workspace_members where user_id = auth.uid();
  perform public.ws_notify_once(_sales, _lead, 'design_edit', format('%s updated the renders for %s', coalesce(_who,'The designer'), _client));
  return null;
end $$;
DROP TRIGGER IF EXISTS design_images_edit_notify ON public.design_images;
CREATE TRIGGER design_images_edit_notify AFTER INSERT OR UPDATE OR DELETE ON public.design_images
  FOR EACH ROW EXECUTE FUNCTION public.ws_design_edit_notify();

CREATE OR REPLACE FUNCTION public.ws_ffe_edit_notify_lead(_lead uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare _client text; _who text; g uuid;
begin
  if _lead is null or public.ws_role(auth.uid()) is distinct from 'designer' then return; end if;
  if not exists (select 1 from public.ffe_costings where lead_id = _lead and status in ('Submitted','Quoted')) then return; end if;
  select name into _client from public.leads where id = _lead;
  select full_name into _who from public.workspace_members where user_id = auth.uid();
  for g in select user_id from public.workspace_members where role = 'gm' and active loop
    perform public.ws_notify_once(g, _lead, 'ffe_edit', format('%s updated the FF&E list for %s', coalesce(_who,'The designer'), _client));
  end loop;
end $$;
REVOKE ALL ON FUNCTION public.ws_ffe_edit_notify_lead(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ws_ffe_item_edit_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ begin perform public.ws_ffe_edit_notify_lead(coalesce(NEW.lead_id, OLD.lead_id)); return null; end $$;
DROP TRIGGER IF EXISTS ffe_items_edit_notify ON public.ffe_items;
CREATE TRIGGER ffe_items_edit_notify AFTER INSERT OR UPDATE OR DELETE ON public.ffe_items
  FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_item_edit_notify();

CREATE OR REPLACE FUNCTION public.ws_ffe_cost_edit_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  perform public.ws_ffe_edit_notify_lead((select lead_id from public.ffe_items where id = coalesce(NEW.item_id, OLD.item_id)));
  return null;
end $$;
DROP TRIGGER IF EXISTS ffe_item_costs_edit_notify ON public.ffe_item_costs;
CREATE TRIGGER ffe_item_costs_edit_notify AFTER INSERT OR UPDATE OR DELETE ON public.ffe_item_costs
  FOR EACH ROW EXECUTE FUNCTION public.ws_ffe_cost_edit_notify();