create or replace function public.can_touch_workspace_object(_uid uuid, _name text)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare kind text := split_part(_name, '/', 1);
        seg  text := split_part(_name, '/', 2);
        id   uuid;
begin
  if _uid is null then return false; end if;
  -- anything not following the convention is GM-only rather than open by default
  if seg !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.is_gm(_uid);
  end if;
  id := seg::uuid;
  if kind = 'designs'  then return public.can_see_lead(_uid, id);    end if;
  if kind in ('projects','snags') then return public.can_see_project(_uid, id); end if;
  return public.is_gm(_uid);
end $fn$;

drop policy "workspace files: staff read"   on storage.objects;
drop policy "workspace files: staff upload" on storage.objects;
create policy "workspace files: read what you can see" on storage.objects for select
  using (bucket_id = 'workspace' and public.can_touch_workspace_object(auth.uid(), name));
create policy "workspace files: upload where you can see" on storage.objects for insert
  with check (bucket_id = 'workspace' and public.can_touch_workspace_object(auth.uid(), name));