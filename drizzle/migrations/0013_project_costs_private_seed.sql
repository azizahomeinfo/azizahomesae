-- Sales convert leads but may not write project costs, so the private row is created server-side.
create or replace function public.seed_project_costs()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.project_costs_private (project_id) values (new.id) on conflict (project_id) do nothing;
  return new;
end $fn$;
revoke execute on function public.seed_project_costs() from public, anon, authenticated;
create trigger projects_seed_costs after insert on public.projects
  for each row execute function public.seed_project_costs();