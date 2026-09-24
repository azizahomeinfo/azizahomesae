alter table public.ffe_items
  add column lead_id uuid references public.leads(id) on delete cascade,
  alter column project_id drop not null,
  add constraint ffe_items_has_owner check (num_nonnulls(lead_id, project_id) >= 1);

alter table public.ffe_costings
  drop constraint ffe_costings_project_id_key,
  add column lead_id uuid references public.leads(id) on delete cascade,
  alter column project_id drop not null,
  add constraint ffe_costings_has_owner check (num_nonnulls(lead_id, project_id) >= 1);

create unique index ffe_costings_lead_uniq    on public.ffe_costings(lead_id)    where lead_id is not null;
create unique index ffe_costings_project_uniq on public.ffe_costings(project_id) where project_id is not null;
create index ffe_items_lead_idx on public.ffe_items(lead_id, room, sort_order);

create or replace function public.can_see_ffe(_uid uuid, _lead uuid, _project uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select (_lead is not null and public.can_see_lead(_uid, _lead))
      or (_project is not null and public.can_see_project(_uid, _project))
$fn$;

drop policy "ffe items: visible with the project" on public.ffe_items;
drop policy "ffe items: project staff write"     on public.ffe_items;
create policy "ffe items: visible with the lead or project" on public.ffe_items for select
  using (public.can_see_ffe(auth.uid(), lead_id, project_id));
create policy "ffe items: staff on the lead or project write" on public.ffe_items for all
  using (public.can_see_ffe(auth.uid(), lead_id, project_id))
  with check (public.can_see_ffe(auth.uid(), lead_id, project_id));

drop policy "costing: visible with the project" on public.ffe_costings;
drop policy "costing: project staff write"      on public.ffe_costings;
create policy "costing: visible with the lead or project" on public.ffe_costings for select
  using (public.can_see_ffe(auth.uid(), lead_id, project_id));
create policy "costing: staff on the lead or project write" on public.ffe_costings for all
  using (public.can_see_ffe(auth.uid(), lead_id, project_id))
  with check (public.can_see_ffe(auth.uid(), lead_id, project_id));

create or replace function public.can_see_costs_item(_uid uuid, _item uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.ffe_items i
     where i.id = _item
       and public.can_see_ffe(_uid, i.lead_id, i.project_id)
       and public.ws_role(_uid) in ('gm','designer','coordinator'))
$fn$;
drop policy "item costs: not for sales"        on public.ffe_item_costs;
drop policy "item costs: not for sales, write" on public.ffe_item_costs;
create policy "item costs: not for sales" on public.ffe_item_costs for select
  using (public.can_see_costs_item(auth.uid(), item_id));
create policy "item costs: not for sales, write" on public.ffe_item_costs for all
  using (public.can_see_costs_item(auth.uid(), item_id))
  with check (public.can_see_costs_item(auth.uid(), item_id));