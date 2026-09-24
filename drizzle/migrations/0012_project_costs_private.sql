create table public.project_costs_private (
  project_id uuid primary key references public.projects(id) on delete cascade,
  est_proc   numeric(12,2),
  act_proc   numeric(12,2) default 0,
  est_ops    numeric(12,2),
  act_ops    numeric(12,2) default 0,
  updated_at timestamptz not null default now()
);
alter table public.project_costs_private enable row level security;
grant select, insert, update, delete on public.project_costs_private to authenticated;
grant all on public.project_costs_private to service_role;

insert into public.project_costs_private (project_id, est_proc, act_proc, est_ops, act_ops)
  select id, est_proc, act_proc, est_ops, act_ops from public.projects;

update public.projects set est_proc=null, act_proc=0, est_ops=null, act_ops=0;
revoke select, insert, update on public.projects from anon, authenticated;
grant select (id, code, lead_id, name, client, property, unit, unit_type, location, sales_id, designer_id,
              coordinator_id, start_date, handover_date, actual_handover, stage, risk, overall_pct, proc_pct,
              value, received, next_due, next_due_date, pay_status, notes, drive_url, is_demo, created_by,
              created_at, updated_at)
  on public.projects to authenticated;
grant insert (id, code, lead_id, name, client, property, unit, unit_type, location, sales_id, designer_id,
              coordinator_id, start_date, handover_date, stage, risk, value, received, next_due, next_due_date,
              pay_status, notes, drive_url, created_by)
  on public.projects to authenticated;
grant update (name, client, property, unit, unit_type, location, sales_id, designer_id, coordinator_id,
              start_date, handover_date, actual_handover, stage, risk, overall_pct, proc_pct, value, received,
              next_due, next_due_date, pay_status, notes, drive_url)
  on public.projects to authenticated;

create or replace function public.can_see_project_costs(_uid uuid, _project uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.can_see_project(_uid, _project) and public.ws_role(_uid) in ('gm','designer','coordinator')
$fn$;
create policy "project costs: not for sales" on public.project_costs_private for select
  using (public.can_see_project_costs(auth.uid(), project_id));
create policy "project costs: not for sales, write" on public.project_costs_private for all
  using (public.can_see_project_costs(auth.uid(), project_id))
  with check (public.can_see_project_costs(auth.uid(), project_id));

create trigger project_costs_private_touch before update on public.project_costs_private
  for each row execute function public.touch_updated_at();

comment on column public.projects.est_proc is 'DEPRECATED: moved to project_costs_private.est_proc';
comment on column public.projects.act_proc is 'DEPRECATED: moved to project_costs_private.act_proc';
comment on column public.projects.est_ops is 'DEPRECATED: moved to project_costs_private.est_ops';
comment on column public.projects.act_ops is 'DEPRECATED: moved to project_costs_private.act_ops';