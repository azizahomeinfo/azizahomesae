-- Renders to sales and the costed FF&E to the GM go out together, in one transaction.
CREATE OR REPLACE FUNCTION public.ws_submit_design_package(_design uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  d public.designs%rowtype;
  b public.requirement_briefs%rowtype;
  c_id uuid;
  n_renders int; n_items int; n_uncosted int;
  missing text[] := '{}';
begin
  select * into d from public.designs where id = _design for update;
  if not found then raise exception 'Design not found'; end if;
  if d.status <> 'Draft' then raise exception 'Only a draft design version can be submitted'; end if;

  select count(*) into n_renders from public.design_images where design_id = d.id and kind ilike '%render%';
  select count(*) into n_items from public.ffe_items where lead_id = d.lead_id;
  select count(*) into n_uncosted from public.ffe_items i
    left join public.ffe_item_costs c on c.item_id = i.id
   where i.lead_id = d.lead_id and c.unit_cost is null;
  if n_renders = 0 then missing := missing || 'no renders uploaded'::text; end if;
  if n_items = 0 then missing := missing || 'the FF&E list is empty'::text;
  elsif n_uncosted > 0 then missing := missing || format('%s item%s no unit cost', n_uncosted, case when n_uncosted = 1 then ' has' else 's have' end); end if;
  if array_length(missing, 1) > 0 then
    raise exception 'Can''t submit the design package — %', array_to_string(missing, '; ');
  end if;

  -- FF&E first: the design guard requires the costing to be with the GM.
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
REVOKE ALL ON FUNCTION public.ws_submit_design_package(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ws_submit_design_package(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ws_design_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); r public.workspace_role;
begin
  if uid is null then return new; end if;
  if new.status in ('Accepted','Rejected')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    r := public.ws_role(uid);
    if not (r = 'gm' or (r = 'sales' and exists (
        select 1 from public.leads l where l.id = new.lead_id and l.sales_id = uid))) then
      raise exception 'Only the sales owner or the GM can decide a design';
    end if;
  end if;
  -- A design version is only shared together with the FF&E going to the GM (ws_submit_design_package).
  if new.status = 'Submitted' and (tg_op = 'INSERT' or old.status is distinct from 'Submitted') then
    if not exists (select 1 from public.ffe_costings c
                    where c.lead_id = new.lead_id and c.status in ('Submitted','Quoted')) then
      raise exception 'Share the design and submit the FF&E together';
    end if;
  end if;
  return new;
end $function$;