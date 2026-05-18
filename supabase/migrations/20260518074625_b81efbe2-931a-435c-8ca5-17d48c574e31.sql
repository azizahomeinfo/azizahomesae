create table if not exists public.ab_events (
  id uuid primary key default gen_random_uuid(),
  experiment text not null,
  variant text not null check (variant in ('A','B')),
  event_type text not null check (event_type in ('view','cta_click')),
  session_id text not null,
  language text,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists ab_events_experiment_idx on public.ab_events (experiment, variant, event_type, created_at);

alter table public.ab_events enable row level security;

create policy "anyone can insert ab events"
  on public.ab_events for insert
  to anon, authenticated
  with check (true);

create policy "authenticated can read ab events"
  on public.ab_events for select
  to authenticated
  using (true);