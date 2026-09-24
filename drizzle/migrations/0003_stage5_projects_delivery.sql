create type public.proc_stage as enum (
  'Awaiting Quote','Quote Received','Negotiation',
  'Awaiting Approval','Payment Required',
  'Ordered','Supplier Confirmed','In Production',
  'Ready for Delivery','Delivery Scheduled','Delivered',
  'Installation Pending','Installed','Issue / Replacement','Closed');
create type public.costing_status  as enum ('Draft','Submitted','Returned','Quoted');
create type public.issue_status    as enum ('Open','Escalated','Resolved');
create type public.issue_severity  as enum ('Low','Medium','High');
create type public.cr_status       as enum ('Pending Approval','Approved','Rejected');
create type public.snag_status     as enum ('Open','Fixed','Verified');
create type public.supplier_status as enum ('Preferred','Approved','On Watch','Blocked');

create table public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null unique, category text,
  contact text, phone text, email text, lead_time text, payment_terms text,
  rating integer check (rating between 0 and 5),
  status public.supplier_status not null default 'Approved', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.suppliers enable row level security;
create trigger suppliers_touch before update on public.suppliers for each row execute function public.touch_updated_at();
create policy "suppliers: staff read" on public.suppliers for select using (public.is_ws_member(auth.uid()));
create policy "suppliers: GM and coordinators maintain" on public.suppliers for all
  using (public.is_gm(auth.uid()) or public.ws_role(auth.uid()) = 'coordinator')
  with check (public.is_gm(auth.uid()) or public.ws_role(auth.uid()) = 'coordinator');

create table public.ffe_costings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  status public.costing_status not null default 'Draft', version integer not null default 1,
  markup_pct numeric(5,2) not null default 35, options jsonb not null default '[]'::jsonb,
  gm_notes text, return_note text, submitted_at timestamptz, quoted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.ffe_costings enable row level security;
create trigger ffe_costings_touch before update on public.ffe_costings for each row execute function public.touch_updated_at();
create policy "costing: visible with the project" on public.ffe_costings for select using (public.can_see_project(auth.uid(), project_id));
create policy "costing: project staff write" on public.ffe_costings for all
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

create table public.ffe_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ref text, room text not null, category text, item text not null, spec text,
  qty numeric(10,2) not null default 1, unit text, unit_cost numeric(12,2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  stage public.proc_stage not null default 'Awaiting Quote', po_ref text,
  ordered_on date, eta date, delivered_on date, installed_on date, notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.ffe_items enable row level security;
create index ffe_items_project_idx on public.ffe_items(project_id, room, sort_order);
create index ffe_items_stage_idx on public.ffe_items(project_id, stage);
create trigger ffe_items_touch before update on public.ffe_items for each row execute function public.touch_updated_at();
create policy "ffe items: visible with the project" on public.ffe_items for select using (public.can_see_project(auth.uid(), project_id));
create policy "ffe items: project staff write" on public.ffe_items for all
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ref text, title text not null, detail text,
  severity public.issue_severity not null default 'Medium',
  owner_id uuid references public.workspace_members(user_id) on delete set null,
  raised_on date not null default current_date,
  status public.issue_status not null default 'Open', resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.issues enable row level security;
create index issues_project_idx on public.issues(project_id, status);
create trigger issues_touch before update on public.issues for each row execute function public.touch_updated_at();
create policy "issues: visible with the project" on public.issues for select using (public.can_see_project(auth.uid(), project_id));
create policy "issues: project staff write" on public.issues for all
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ref text, title text not null, detail text, source text,
  raised_on date not null default current_date,
  cost_delta numeric(12,2) not null default 0, days_delta integer not null default 0,
  status public.cr_status not null default 'Pending Approval',
  decided_at timestamptz, decided_by uuid references public.workspace_members(user_id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.change_requests enable row level security;
create index crs_project_idx on public.change_requests(project_id, status);
create trigger crs_touch before update on public.change_requests for each row execute function public.touch_updated_at();
create policy "change requests: visible with the project" on public.change_requests for select using (public.can_see_project(auth.uid(), project_id));
create policy "change requests: project staff raise" on public.change_requests for insert with check (public.can_see_project(auth.uid(), project_id));
create policy "change requests: project staff edit" on public.change_requests for update
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));
create policy "change requests: GM deletes" on public.change_requests for delete using (public.is_gm(auth.uid()));

create table public.snags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ref text, area text not null, description text not null,
  owner_id uuid references public.workspace_members(user_id) on delete set null,
  status public.snag_status not null default 'Open', photo_path text, fixed_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.snags enable row level security;
create index snags_project_idx on public.snags(project_id, status);
create trigger snags_touch before update on public.snags for each row execute function public.touch_updated_at();
create policy "snags: visible with the project" on public.snags for select using (public.can_see_project(auth.uid(), project_id));
create policy "snags: project staff write" on public.snags for all
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

create table public.handover_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null, sort_order integer not null, done boolean not null default false,
  done_at timestamptz, done_by uuid references public.workspace_members(user_id) on delete set null,
  unique (project_id, sort_order));
alter table public.handover_items enable row level security;
create policy "handover: visible with the project" on public.handover_items for select using (public.can_see_project(auth.uid(), project_id));
create policy "handover: project staff tick" on public.handover_items for update
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

create or replace function public.seed_handover()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.handover_items (project_id, label, sort_order)
  select new.id, label, ord from (values
    ('Snag list closed', 1), ('Final clean', 2), ('Styling and photography', 3),
    ('Inventory list signed', 4), ('Warranty documents shared', 5),
    ('Keys and access cards returned', 6), ('Final payment received', 7),
    ('Client handover sign-off', 8)) as t(label, ord);
  return new;
end $fn$;
create trigger projects_seed_handover after insert on public.projects
  for each row execute function public.seed_handover();

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null, file_name text not null, category text, size_bytes bigint,
  uploaded_by uuid references public.workspace_members(user_id) on delete set null,
  created_at timestamptz not null default now());
alter table public.project_files enable row level security;
create index project_files_idx on public.project_files(project_id, created_at desc);
create policy "project files: visible with the project" on public.project_files for select using (public.can_see_project(auth.uid(), project_id));
create policy "project files: project staff write" on public.project_files for all
  using (public.can_see_project(auth.uid(), project_id)) with check (public.can_see_project(auth.uid(), project_id));

alter publication supabase_realtime add table public.ffe_items;
alter publication supabase_realtime add table public.issues;
alter publication supabase_realtime add table public.snags;

grant select, insert, update, delete on public.suppliers, public.ffe_costings, public.ffe_items, public.issues,
  public.change_requests, public.snags, public.handover_items, public.project_files to authenticated;
grant all on public.suppliers, public.ffe_costings, public.ffe_items, public.issues,
  public.change_requests, public.snags, public.handover_items, public.project_files to service_role;
revoke execute on function public.seed_handover() from public, anon, authenticated;