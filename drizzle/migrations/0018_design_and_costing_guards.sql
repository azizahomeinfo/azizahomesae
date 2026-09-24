create or replace function public.ws_design_guard()
returns trigger language plpgsql security definer set search_path = public as $$
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
  return new;
end $$;
drop trigger if exists designs_guard on public.designs;
create trigger designs_guard before insert or update on public.designs
  for each row execute function public.ws_design_guard();

create or replace function public.ws_costing_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gm boolean;
begin
  if uid is null then return new; end if;
  gm := public.is_gm(uid);
  if tg_op = 'INSERT' then
    if not gm and (new.status not in ('Draft','Submitted') or new.options <> '[]'::jsonb or new.version <> 1) then
      raise exception 'Only the GM can set the quotation';
    end if;
    return new;
  end if;
  if not gm and (new.options is distinct from old.options
                 or new.version is distinct from old.version
                 or (new.status is distinct from old.status and new.status in ('Quoted','Returned'))
                 or new.quoted_at is distinct from old.quoted_at) then
    raise exception 'Only the GM can set the quotation';
  end if;
  if not gm and new.status is distinct from old.status
     and public.ws_role(uid) is distinct from 'designer' then
    raise exception 'Only the designer or the GM can submit the FF&E list';
  end if;
  return new;
end $$;
drop trigger if exists ffe_costings_guard on public.ffe_costings;
create trigger ffe_costings_guard before insert or update on public.ffe_costings
  for each row execute function public.ws_costing_guard();

create or replace function public.ws_costing_private_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or public.is_gm(uid) then return new; end if;
  if tg_op = 'INSERT' then
    if (new.markup_pct <> 35 and new.markup_pct <> 0) or new.gm_notes is not null or new.return_note is not null then
      raise exception 'Only the GM can set the quotation';
    end if;
  elsif (new.markup_pct, new.gm_notes, new.return_note) is distinct from (old.markup_pct, old.gm_notes, old.return_note) then
    raise exception 'Only the GM can set the quotation';
  end if;
  return new;
end $$;
drop trigger if exists ffe_costing_private_guard on public.ffe_costing_private;
create trigger ffe_costing_private_guard before insert or update on public.ffe_costing_private
  for each row execute function public.ws_costing_private_guard();

revoke execute on function public.ws_design_guard() from public, anon, authenticated;
revoke execute on function public.ws_costing_guard() from public, anon, authenticated;
revoke execute on function public.ws_costing_private_guard() from public, anon, authenticated;