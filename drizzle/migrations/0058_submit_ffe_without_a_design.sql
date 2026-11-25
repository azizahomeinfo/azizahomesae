-- A brief lead whose client wants no design ("just a quote") had no way to send the FF&E list to the GM:
-- "Submit design package" lives on the Renders tab and needs renders, and the FF&E tab's own Submit was
-- restricted to catalog-package leads. Mehdi / L-1110 (Veronica, 2026-11-25): "mehdi doesnt need design
-- only need to submit ffe list to gm but there is no button to submit".
--
-- The list may now go on its own whenever there is NO design carrying images — a package lead as before,
-- and a brief lead the designer has not rendered. The moment a design has images the old rule returns, so
-- renders and the list still reach the GM in one transaction and cannot drift apart. The GM's notification
-- says "(no design)" so an unrendered submission is never mistaken for a complete package.
create or replace function public.ws_submit_package_ffe(_lead uuid)
 returns void
 language plpgsql
 set search_path to 'public'
as $function$
declare c_id uuid; n_items int; n_uncosted int; who text; lname text; d_id uuid; d_ver int;
        is_pkg boolean; has_render boolean;
begin
  select exists (select 1 from public.requirement_briefs
                  where lead_id = _lead and coalesce((extra->>'package')::boolean, false)) into is_pkg;
  select exists (select 1 from public.designs d join public.design_images i on i.design_id = d.id
                  where d.lead_id = _lead) into has_render;
  if not is_pkg and has_render then
    raise exception 'This lead has a design — send the list with the renders ("Submit design package")';
  end if;

  select count(*) into n_items from public.ffe_items where lead_id = _lead and not internal;
  select count(*) into n_uncosted from public.ffe_items i left join public.ffe_item_costs c on c.item_id = i.id
   where i.lead_id = _lead and not i.internal and c.unit_cost is null;
  if n_items = 0 then raise exception 'Can''t submit — the FF&E list is empty'; end if;
  if n_uncosted > 0 then
    raise exception 'Can''t submit — % item% no unit cost. Fill them in (or "Apply standard prices") first.', n_uncosted, case when n_uncosted = 1 then ' has' else 's have' end;
  end if;

  select id into c_id from public.ffe_costings where lead_id = _lead for update;
  if c_id is null then
    -- See ws_submit_design_package: the private row is the seed trigger's job, never this function's.
    insert into public.ffe_costings (lead_id, status, submitted_at) values (_lead, 'Submitted', now()) returning id into c_id;
  else
    if (select status from public.ffe_costings where id = c_id) = 'Quoted' then
      insert into public.notifications (user_id, kind, title, lead_id)
      select l.sales_id, 'costing', format('GM quotation withdrawn for %s — FF&E sent back for re-quoting; hold the proposal', l.name), l.id
        from public.leads l where l.id = _lead and l.sales_id is not null;
    end if;
    update public.ffe_costings set status = 'Submitted', submitted_at = now() where id = c_id;
  end if;

  -- Only a package lead folds a draft render set into this submission; a no-design brief lead has none.
  if is_pkg then
    select d.id, d.version into d_id, d_ver from public.designs d
     where d.lead_id = _lead and d.status = 'Draft'
       and exists (select 1 from public.design_images i where i.design_id = d.id)
     order by d.version desc limit 1;
    if d_id is not null then
      perform set_config('ws.package_design', 'on', true);
      update public.designs set status = 'Accepted', submitted_at = now(), decided_at = now(), decided_by = auth.uid() where id = d_id;
      perform set_config('ws.package_design', 'off', true);
      perform set_config('ws.package_brief', 'on', true);
      update public.requirement_briefs set status = 'Design Approved' where lead_id = _lead and status <> 'Design Approved';
      perform set_config('ws.package_brief', 'off', true);
    end if;
  end if;

  select coalesce(nullif(btrim(m.full_name), ''), 'The designer') into who from public.workspace_members m where m.user_id = auth.uid();
  select name into lname from public.leads where id = _lead;
  insert into public.notifications (user_id, kind, title, lead_id)
  select m.user_id, 'costing',
         format('%s submitted the %sFF&E list%s for %s — final price needed',
                coalesce(who, 'The designer'),
                case when is_pkg then 'package ' else '' end,
                case when d_id is not null then format(' and new design V%s', d_ver)
                     when not is_pkg then ' (no design)' else '' end,
                lname), _lead
    from public.workspace_members m where m.role = 'gm' and m.active and m.user_id is distinct from auth.uid();
end $function$;
