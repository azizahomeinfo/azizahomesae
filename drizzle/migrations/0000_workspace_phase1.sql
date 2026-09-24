-- Aziza Home Workspace — Phase 1 schema

create type public.workspace_role  as enum ('gm','sales','designer','coordinator');
create type public.lead_status     as enum ('New Lead','Contacted','Qualified','Proposal Sent','Won','Lost');
create type public.brief_status    as enum ('Draft','Submitted','Assigned','In Design','Design Ready','Design Approved','Revision Requested');
create type public.proposal_status as enum ('Draft','Sent','Accepted','Rejected');
create type public.project_stage   as enum ('Contract / Deposit','Site Survey','Design','Client Approval','Procurement','Production','Installation','Snagging','Handover','Closed');
create type public.pay_status      as enum ('Not Due','Pending','Partially Paid','Paid','Overdue');
create type public.risk_level      as enum ('Green','Yellow','Red');
create type public.task_priority   as enum ('Low','Medium','High');

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

create table public.workspace_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  full_name  text not null,
  role       public.workspace_role not null,
  title      text,
  active     boolean not null default true,
  is_demo    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.workspace_members enable row level security;

create or replace function public.ws_role(_uid uuid)
returns public.workspace_role
language sql stable security definer set search_path = public as $fn$
  select role from public.workspace_members where user_id = _uid and active
$fn$;

create or replace function public.is_ws_member(_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.workspace_members where user_id = _uid and active)
$fn$;

create or replace function public.is_gm(_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.workspace_members
    where user_id = _uid and active and role = 'gm'
  )
$fn$;

create policy "members: readable by staff"
  on public.workspace_members for select
  using (public.is_ws_member(auth.uid()));

create policy "members: GM manages roster"
  on public.workspace_members for all
  using (public.is_gm(auth.uid()))
  with check (public.is_gm(auth.uid()));

create sequence public.lead_ref_seq start 1050;

create table public.leads (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique default ('L-' || nextval('public.lead_ref_seq')),
  name           text not null,
  phone          text,
  email          text,
  property       text,
  building       text,
  location       text,
  unit_type      text,
  size           text,
  handover_status text,
  exp_handover   date,
  use_type       text,
  budget         numeric(12,2),
  target_date    date,
  scope          text,
  style          text,
  refs           text,
  floor_plan     text,
  source         text,
  sales_id       uuid references public.workspace_members(user_id) on delete set null,
  designer_id    uuid references public.workspace_members(user_id) on delete set null,
  status         public.lead_status not null default 'New Lead',
  last_contact   date,
  next_follow    date,
  notes          text,
  lost_reason    text,
  converted_project_id uuid,
  is_demo        boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.leads enable row level security;
create index leads_sales_idx    on public.leads(sales_id);
create index leads_designer_idx on public.leads(designer_id);
create index leads_status_idx   on public.leads(status);
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

create or replace function public.can_see_lead(_uid uuid, _lead uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.leads l
    where l.id = _lead
      and (public.is_gm(_uid) or l.sales_id = _uid or l.designer_id = _uid)
  )
$fn$;

create policy "leads: GM sees all, sales own, designer assigned"
  on public.leads for select
  using (public.is_gm(auth.uid()) or sales_id = auth.uid() or designer_id = auth.uid());

create policy "leads: sales and GM create"
  on public.leads for insert
  with check (
    public.is_gm(auth.uid())
    or (public.ws_role(auth.uid()) = 'sales' and sales_id = auth.uid())
  );

create policy "leads: owner, assigned designer or GM updates"
  on public.leads for update
  using (public.is_gm(auth.uid()) or sales_id = auth.uid() or designer_id = auth.uid())
  with check (public.is_gm(auth.uid()) or sales_id = auth.uid() or designer_id = auth.uid());

create policy "leads: GM deletes"
  on public.leads for delete
  using (public.is_gm(auth.uid()));

create table public.requirement_briefs (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null unique references public.leads(id) on delete cascade,
  status         public.brief_status not null default 'Draft',
  designer_id    uuid references public.workspace_members(user_id) on delete set null,
  rooms          jsonb not null default '[]'::jsonb,
  must_haves     text,
  avoid          text,
  colour_notes   text,
  budget_notes   text,
  access_notes   text,
  extra          jsonb not null default '{}'::jsonb,
  revision_note  text,
  submitted_at   timestamptz,
  assigned_at    timestamptz,
  ready_at       timestamptz,
  approved_at    timestamptz,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.requirement_briefs enable row level security;
create trigger briefs_touch before update on public.requirement_briefs
  for each row execute function public.touch_updated_at();

create policy "briefs: visible with the lead, plus unassigned queue"
  on public.requirement_briefs for select
  using (
    public.can_see_lead(auth.uid(), lead_id)
    or (public.ws_role(auth.uid()) = 'designer' and status = 'Submitted')
  );

create policy "briefs: staff on the lead write"
  on public.requirement_briefs for insert
  with check (public.can_see_lead(auth.uid(), lead_id));

create policy "briefs: staff on the lead or a designer claiming it update"
  on public.requirement_briefs for update
  using (
    public.can_see_lead(auth.uid(), lead_id)
    or (public.ws_role(auth.uid()) = 'designer' and status = 'Submitted')
  )
  with check (public.can_see_lead(auth.uid(), lead_id) or designer_id = auth.uid());

create table public.designs (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  version     integer not null default 1,
  designer_id uuid references public.workspace_members(user_id) on delete set null,
  summary     text,
  notes       text,
  submitted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (lead_id, version)
);
alter table public.designs enable row level security;
create trigger designs_touch before update on public.designs
  for each row execute function public.touch_updated_at();

create table public.design_images (
  id         uuid primary key default gen_random_uuid(),
  design_id  uuid not null references public.designs(id) on delete cascade,
  storage_path text not null,
  caption    text,
  room       text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.design_images enable row level security;
create index design_images_design_idx on public.design_images(design_id);

create policy "designs: visible with the lead"
  on public.designs for select using (public.can_see_lead(auth.uid(), lead_id));
create policy "designs: designer on the lead or GM writes"
  on public.designs for all
  using (public.can_see_lead(auth.uid(), lead_id))
  with check (public.can_see_lead(auth.uid(), lead_id));

create policy "design images: follow their design"
  on public.design_images for all
  using (exists (select 1 from public.designs d
                 where d.id = design_id and public.can_see_lead(auth.uid(), d.lead_id)))
  with check (exists (select 1 from public.designs d
                 where d.id = design_id and public.can_see_lead(auth.uid(), d.lead_id)));

create table public.proposals (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  version     integer not null default 1,
  status      public.proposal_status not null default 'Draft',
  design_id   uuid references public.designs(id) on delete set null,
  currency    text not null default 'AED',
  subtotal    numeric(12,2),
  discount    numeric(12,2) default 0,
  total       numeric(12,2),
  valid_until date,
  line_items  jsonb not null default '[]'::jsonb,
  terms       text,
  sent_at     timestamptz,
  decided_at  timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (lead_id, version)
);
alter table public.proposals enable row level security;
create trigger proposals_touch before update on public.proposals
  for each row execute function public.touch_updated_at();

create policy "proposals: visible with the lead"
  on public.proposals for select using (public.can_see_lead(auth.uid(), lead_id));
create policy "proposals: sales owner or GM writes"
  on public.proposals for all
  using (public.is_gm(auth.uid())
         or exists (select 1 from public.leads l where l.id = lead_id and l.sales_id = auth.uid()))
  with check (public.is_gm(auth.uid())
         or exists (select 1 from public.leads l where l.id = lead_id and l.sales_id = auth.uid()));

create sequence public.project_ref_seq start 2607;

create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique default ('AZ-' || nextval('public.project_ref_seq')),
  lead_id        uuid references public.leads(id) on delete set null,
  name           text not null,
  client         text,
  property       text,
  unit           text,
  unit_type      text,
  location       text,
  sales_id       uuid references public.workspace_members(user_id) on delete set null,
  designer_id    uuid references public.workspace_members(user_id) on delete set null,
  coordinator_id uuid references public.workspace_members(user_id) on delete set null,
  start_date     date,
  handover_date  date,
  actual_handover date,
  stage          public.project_stage not null default 'Contract / Deposit',
  risk           public.risk_level not null default 'Green',
  overall_pct    integer not null default 0 check (overall_pct between 0 and 100),
  proc_pct       integer not null default 0 check (proc_pct between 0 and 100),
  value          numeric(12,2),
  est_proc       numeric(12,2),
  est_ops        numeric(12,2),
  act_proc       numeric(12,2) default 0,
  act_ops        numeric(12,2) default 0,
  received       numeric(12,2) default 0,
  next_due       text,
  next_due_date  date,
  pay_status     public.pay_status not null default 'Not Due',
  notes          text,
  is_demo        boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.projects enable row level security;
create index projects_stage_idx on public.projects(stage);
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

create or replace function public.can_see_project(_uid uuid, _project uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.projects p
    where p.id = _project
      and (public.is_gm(_uid) or p.sales_id = _uid
           or p.designer_id = _uid or p.coordinator_id = _uid)
  )
$fn$;

create policy "projects: GM sees all, staff see their own"
  on public.projects for select
  using (public.is_gm(auth.uid()) or sales_id = auth.uid()
         or designer_id = auth.uid() or coordinator_id = auth.uid());

create policy "projects: GM or sales create"
  on public.projects for insert
  with check (public.is_gm(auth.uid()) or public.ws_role(auth.uid()) = 'sales');

create policy "projects: assigned staff and GM update"
  on public.projects for update
  using (public.is_gm(auth.uid()) or sales_id = auth.uid()
         or designer_id = auth.uid() or coordinator_id = auth.uid())
  with check (public.is_gm(auth.uid()) or sales_id = auth.uid()
         or designer_id = auth.uid() or coordinator_id = auth.uid());

create policy "projects: GM deletes"
  on public.projects for delete using (public.is_gm(auth.uid()));

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete cascade,
  title       text not null,
  detail      text,
  assignee_id uuid references public.workspace_members(user_id) on delete set null,
  due_date    date,
  priority    public.task_priority not null default 'Medium',
  done        boolean not null default false,
  done_at     timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tasks_one_parent check (num_nonnulls(project_id, lead_id) = 1)
);
alter table public.tasks enable row level security;
create index tasks_assignee_idx on public.tasks(assignee_id) where not done;
create index tasks_project_idx  on public.tasks(project_id);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

create policy "tasks: assignee or anyone on the parent"
  on public.tasks for select
  using (assignee_id = auth.uid()
    or (project_id is not null and public.can_see_project(auth.uid(), project_id))
    or (lead_id    is not null and public.can_see_lead(auth.uid(), lead_id)));

create policy "tasks: staff on the parent write"
  on public.tasks for all
  using (assignee_id = auth.uid()
    or (project_id is not null and public.can_see_project(auth.uid(), project_id))
    or (lead_id    is not null and public.can_see_lead(auth.uid(), lead_id)))
  with check ((project_id is not null and public.can_see_project(auth.uid(), project_id))
    or (lead_id  is not null and public.can_see_lead(auth.uid(), lead_id)));

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete cascade,
  author_id   uuid not null references public.workspace_members(user_id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  mentions    uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  constraint comments_one_parent check (num_nonnulls(project_id, lead_id) = 1)
);
alter table public.comments enable row level security;
create index comments_project_idx on public.comments(project_id, created_at desc);
create index comments_lead_idx    on public.comments(lead_id, created_at desc);

create policy "comments: readable with the parent"
  on public.comments for select
  using ((project_id is not null and public.can_see_project(auth.uid(), project_id))
      or (lead_id  is not null and public.can_see_lead(auth.uid(), lead_id)));

create policy "comments: post as yourself on something you can see"
  on public.comments for insert
  with check (author_id = auth.uid()
    and ((project_id is not null and public.can_see_project(auth.uid(), project_id))
      or (lead_id  is not null and public.can_see_lead(auth.uid(), lead_id))));

create policy "comments: edit your own"
  on public.comments for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments: delete your own, or GM"
  on public.comments for delete using (author_id = auth.uid() or public.is_gm(auth.uid()));

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.workspace_members(user_id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  lead_id     uuid references public.leads(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  read        boolean not null default false,
  emailed_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index notifications_inbox_idx on public.notifications(user_id, created_at desc);

create policy "notifications: your own only"
  on public.notifications for select using (user_id = auth.uid());
create policy "notifications: mark your own read"
  on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: staff may notify a colleague"
  on public.notifications for insert with check (public.is_ws_member(auth.uid()));

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.tasks;

-- NOTE: bucket 'workspace' (private) created via the storage API; SQL inserts into storage.buckets are not allowed.

create policy "workspace files: staff read"
  on storage.objects for select
  using (bucket_id = 'workspace' and public.is_ws_member(auth.uid()));
create policy "workspace files: staff upload"
  on storage.objects for insert
  with check (bucket_id = 'workspace' and public.is_ws_member(auth.uid()));
create policy "workspace files: uploader or GM removes"
  on storage.objects for delete
  using (bucket_id = 'workspace' and (owner = auth.uid() or public.is_gm(auth.uid())));

create table public.workspace_invites (
  email      text primary key,
  full_name  text not null,
  role       public.workspace_role not null,
  title      text,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.workspace_invites enable row level security;

create policy "invites: GM manages"
  on public.workspace_invites for all
  using (public.is_gm(auth.uid()))
  with check (public.is_gm(auth.uid()));

create or replace function public.handle_new_workspace_user()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare inv public.workspace_invites%rowtype;
begin
  select * into inv from public.workspace_invites
   where lower(email) = lower(new.email);
  if found then
    insert into public.workspace_members (user_id, email, full_name, role, title)
    values (new.id, lower(new.email), inv.full_name, inv.role, inv.title)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $fn$;

create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute function public.handle_new_workspace_user();

insert into public.workspace_invites (email, full_name, role, title) values
  ('azizahomeinfo@gmail.com', 'Veronica Xu', 'gm', 'General Manager')
on conflict (email) do nothing;

-- Data API access (required: public schema has no default grants). RLS above still governs rows.
grant select, insert, update, delete on
  public.workspace_members, public.leads, public.requirement_briefs, public.designs,
  public.design_images, public.proposals, public.projects, public.tasks,
  public.comments, public.notifications, public.workspace_invites
to authenticated;
grant all on
  public.workspace_members, public.leads, public.requirement_briefs, public.designs,
  public.design_images, public.proposals, public.projects, public.tasks,
  public.comments, public.notifications, public.workspace_invites
to service_role;
grant usage, select on sequence public.lead_ref_seq, public.project_ref_seq to authenticated, service_role;