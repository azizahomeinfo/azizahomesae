create table public.ffe_item_costs (
  item_id    uuid primary key references public.ffe_items(id) on delete cascade,
  unit_cost  numeric(12,2),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ffe_item_costs to authenticated;
grant all on public.ffe_item_costs to service_role;
alter table public.ffe_item_costs enable row level security;
create trigger ffe_item_costs_touch before update on public.ffe_item_costs for each row execute function public.touch_updated_at();

insert into public.ffe_item_costs (item_id, unit_cost)
  select id, unit_cost from public.ffe_items where unit_cost is not null;

create or replace function public.can_see_costs(_uid uuid, _project uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.can_see_project(_uid, _project)
     and public.ws_role(_uid) in ('gm','designer','coordinator')
$fn$;
revoke execute on function public.can_see_costs(uuid, uuid) from anon;

create policy "item costs: not for sales"
  on public.ffe_item_costs for select
  using (public.can_see_costs(auth.uid(),
        (select project_id from public.ffe_items i where i.id = item_id)));
create policy "item costs: not for sales, write"
  on public.ffe_item_costs for all
  using (public.can_see_costs(auth.uid(),
        (select project_id from public.ffe_items i where i.id = item_id)))
  with check (public.can_see_costs(auth.uid(),
        (select project_id from public.ffe_items i where i.id = item_id)));

-- The old column can't be dropped without breaking the deployed app, so lock it:
-- no API role can read or write ffe_items.unit_cost any more.
revoke select, insert, update on public.ffe_items from anon, authenticated;
grant select (id, project_id, ref, room, category, item, spec, qty, unit, supplier_id, stage, po_ref,
  ordered_on, eta, delivered_on, installed_on, notes, sort_order, created_at, updated_at, sku, dims, finish)
  on public.ffe_items to authenticated;
grant insert (id, project_id, ref, room, category, item, spec, qty, unit, supplier_id, stage, po_ref,
  ordered_on, eta, delivered_on, installed_on, notes, sort_order, sku, dims, finish)
  on public.ffe_items to authenticated;
grant update (ref, room, category, item, spec, qty, unit, supplier_id, stage, po_ref,
  ordered_on, eta, delivered_on, installed_on, notes, sort_order, updated_at, sku, dims, finish)
  on public.ffe_items to authenticated;
comment on column public.ffe_items.unit_cost is 'DEPRECATED: moved to ffe_item_costs; not readable via the API';