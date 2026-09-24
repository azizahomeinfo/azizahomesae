alter table public.ffe_costings add column if not exists quoted_by uuid references public.workspace_members(user_id);
grant select (quoted_by), insert (quoted_by), update (quoted_by) on public.ffe_costings to authenticated;
grant all on public.ffe_costings to service_role;

create or replace function public.ws_costing_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gm boolean;
begin
  if uid is null then return new; end if;
  gm := public.is_gm(uid);
  if tg_op = 'INSERT' then
    if not gm and (new.status not in ('Draft','Submitted') or new.options <> '[]'::jsonb or new.version <> 1
                   or new.quoted_by is not null or new.quoted_at is not null) then
      raise exception 'Only the GM can set the quotation';
    end if;
    return new;
  end if;
  if not gm and (new.options is distinct from old.options
                 or new.version is distinct from old.version
                 or (new.status is distinct from old.status and new.status in ('Quoted','Returned'))
                 or new.quoted_at is distinct from old.quoted_at
                 or new.quoted_by is distinct from old.quoted_by) then
    raise exception 'Only the GM can set the quotation';
  end if;
  if not gm and new.status is distinct from old.status
     and public.ws_role(uid) is distinct from 'designer' then
    raise exception 'Only the designer or the GM can submit the FF&E list';
  end if;
  return new;
end $$;
revoke execute on function public.ws_costing_guard() from public, anon, authenticated;