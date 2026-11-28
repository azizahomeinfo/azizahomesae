-- "From the designer interface they need to check all item list and snagging when the unit is done...
--  generate the check list of the items based on the signed contract, so make sure when sales handover
--  then all is there" (Veronica, 2026-11-28).
--
-- The handover checklist was eight process labels — "Inventory list signed" was a single tick covering
-- a hundred items. This adds a line-by-line check over the contract list itself. No snapshot table: the
-- FF&E list IS the contract line for line (her standing rule), and ws_contract_sections builds the
-- client's document from exactly these rows, so a check keyed on ffe_items.id can never drift from it.
-- Internal rows are excluded there and excluded here: the client never signed for them.
create table if not exists public.handover_checks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  item_id     uuid not null references public.ffe_items(id) on delete cascade,
  present     boolean not null default false,
  note        text,
  checked_at  timestamptz,
  checked_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  unique (item_id)
);
create index if not exists handover_checks_project on public.handover_checks(project_id);

alter table public.handover_checks enable row level security;

drop policy if exists "handover checks: visible with the project" on public.handover_checks;
create policy "handover checks: visible with the project" on public.handover_checks
  for select using (public.can_see_project(auth.uid(), project_id));

drop policy if exists "handover checks: project staff write" on public.handover_checks;
create policy "handover checks: project staff write" on public.handover_checks
  for all using (public.can_see_project(auth.uid(), project_id))
       with check (public.can_see_project(auth.uid(), project_id));

grant select, insert, update, delete on public.handover_checks to authenticated;

drop trigger if exists handover_checks_touch on public.handover_checks;
create trigger handover_checks_touch before update on public.handover_checks
  for each row execute function public.touch_updated_at();
