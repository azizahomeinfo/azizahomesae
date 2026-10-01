CREATE OR REPLACE FUNCTION public.ws_submit_design_package(_design uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare
  d public.designs%rowtype;
  b public.requirement_briefs%rowtype;
  c_id uuid;
  n_images int; n_items int; n_uncosted int;
  missing text[] := '{}';
begin
  select * into d from public.designs where id = _design for update;
  if not found then raise exception 'Design not found'; end if;
  if d.status <> 'Draft' then raise exception 'Only a draft design version can be submitted'; end if;

  -- Images: at least one render OR one mood board. FF&E: has items, every item costed.
  select count(*) into n_images from public.design_images
   where design_id = d.id and (kind ilike '%render%' or kind ilike '%mood%');
  select count(*) into n_items from public.ffe_items where lead_id = d.lead_id;
  select count(*) into n_uncosted from public.ffe_items i
    left join public.ffe_item_costs c on c.item_id = i.id
   where i.lead_id = d.lead_id and c.unit_cost is null;
  if n_images = 0 then missing := missing || 'no renders or mood board uploaded'::text; end if;
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