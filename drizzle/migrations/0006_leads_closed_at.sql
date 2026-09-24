alter table public.leads add column closed_at timestamptz;

create or replace function public.stamp_lead_closed()
returns trigger language plpgsql as $fn$
begin
  if new.status in ('Won','Lost') and (old.status is distinct from new.status) then
    new.closed_at := now();
  elsif new.status not in ('Won','Lost') then
    new.closed_at := null;
  end if;
  return new;
end $fn$;

create trigger leads_stamp_closed before update on public.leads
  for each row execute function public.stamp_lead_closed();

create trigger leads_stamp_closed_ins before insert on public.leads
  for each row execute function public.stamp_lead_closed();