create table public.ffe_costing_private (
  costing_id  uuid primary key references public.ffe_costings(id) on delete cascade,
  markup_pct  numeric(5,2) not null default 35,
  gm_notes    text,
  return_note text,
  updated_at  timestamptz not null default now()
);
grant select, insert, update, delete on public.ffe_costing_private to authenticated;
grant all on public.ffe_costing_private to service_role;
alter table public.ffe_costing_private enable row level security;

insert into public.ffe_costing_private (costing_id, markup_pct, gm_notes, return_note)
  select id, markup_pct, gm_notes, return_note from public.ffe_costings;

-- Retire the internal columns on the client-facing table: scrub them and cut off API access.
update public.ffe_costings set markup_pct = 0, gm_notes = null, return_note = null where id is not null;
revoke select, insert, update on public.ffe_costings from anon, authenticated;
grant select (id, project_id, lead_id, status, version, options, submitted_at, quoted_at, created_at, updated_at)
  on public.ffe_costings to authenticated;
grant insert (id, project_id, lead_id, status, version, options, submitted_at, quoted_at)
  on public.ffe_costings to authenticated;
grant update (project_id, lead_id, status, version, options, submitted_at, quoted_at)
  on public.ffe_costings to authenticated;
comment on column public.ffe_costings.markup_pct is 'DEPRECATED: moved to ffe_costing_private.markup_pct';
comment on column public.ffe_costings.gm_notes is 'DEPRECATED: moved to ffe_costing_private.gm_notes';
comment on column public.ffe_costings.return_note is 'DEPRECATED: moved to ffe_costing_private.return_note';

create or replace function public.can_see_costing_private(_uid uuid, _costing uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.ffe_costings c
     where c.id = _costing
       and public.can_see_ffe(_uid, c.lead_id, c.project_id)
       and public.ws_role(_uid) in ('gm','designer','coordinator'))
$fn$;

create policy "costing private: not for sales" on public.ffe_costing_private for select
  using (public.can_see_costing_private(auth.uid(), costing_id));
create policy "costing private: not for sales, write" on public.ffe_costing_private for all
  using (public.can_see_costing_private(auth.uid(), costing_id))
  with check (public.can_see_costing_private(auth.uid(), costing_id));

create trigger ffe_costing_private_touch before update on public.ffe_costing_private
  for each row execute function public.touch_updated_at();