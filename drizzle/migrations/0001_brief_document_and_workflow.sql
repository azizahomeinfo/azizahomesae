-- New brief document columns (additive; old placeholder columns retired, not dropped)
alter table public.requirement_briefs
  add column header      jsonb not null default '{}'::jsonb,
  add column style       jsonb not null default '{}'::jsonb,
  add column colours     jsonb not null default '[]'::jsonb,
  add column ffe         jsonb not null default '[]'::jsonb,
  add column bedrooms    jsonb not null default '[]'::jsonb,
  add column lists       jsonb not null default '{}'::jsonb,
  add column attachments jsonb not null default '{}'::jsonb;

comment on column public.requirement_briefs.rooms        is 'DEPRECATED: replaced by header/ffe/bedrooms';
comment on column public.requirement_briefs.must_haves   is 'DEPRECATED: replaced by style';
comment on column public.requirement_briefs.avoid        is 'DEPRECATED: replaced by style.dislikes';
comment on column public.requirement_briefs.colour_notes is 'DEPRECATED: replaced by colours';
comment on column public.requirement_briefs.budget_notes is 'DEPRECATED: replaced by header.budget';
comment on column public.requirement_briefs.access_notes is 'DEPRECATED: replaced by lists';

-- Assign a submitted brief: a designer claims it for themselves, or the GM assigns anyone.
-- Needed because a designer is not yet on the lead, so RLS would block setting leads.designer_id.
create or replace function public.ws_assign_brief(_brief uuid, _designer uuid)
returns void
language plpgsql security definer set search_path = public as $fn$
declare b public.requirement_briefs%rowtype;
begin
  if not (public.is_gm(auth.uid())
          or (public.ws_role(auth.uid()) = 'designer' and _designer = auth.uid())) then
    raise exception 'Not allowed to assign this brief';
  end if;
  if public.ws_role(_designer) is distinct from 'designer' then
    raise exception 'Assignee must be an active designer';
  end if;
  select * into b from public.requirement_briefs where id = _brief for update;
  if not found then raise exception 'Brief not found'; end if;
  if b.status <> 'Submitted' then raise exception 'Brief is no longer awaiting a designer'; end if;
  update public.requirement_briefs
     set status = 'Assigned', designer_id = _designer, assigned_at = now()
   where id = _brief;
  update public.leads set designer_id = _designer where id = b.lead_id;
end $fn$;

-- Queue of submitted briefs with the lead summary a designer needs before claiming.
create or replace function public.ws_brief_queue()
returns table (brief_id uuid, lead_id uuid, status public.brief_status, submitted_at timestamptz,
               name text, property text, unit_type text, budget numeric, target_date date)
language sql stable security definer set search_path = public as $fn$
  select b.id, b.lead_id, b.status, b.submitted_at, l.name, l.property, l.unit_type, l.budget, l.target_date
    from public.requirement_briefs b join public.leads l on l.id = b.lead_id
   where b.status = 'Submitted'
     and (public.is_gm(auth.uid()) or public.ws_role(auth.uid()) = 'designer')
   order by b.submitted_at nulls last
$fn$;

revoke all on function public.ws_assign_brief(uuid, uuid) from public, anon;
revoke all on function public.ws_brief_queue() from public, anon;
grant execute on function public.ws_assign_brief(uuid, uuid) to authenticated;
grant execute on function public.ws_brief_queue() to authenticated;

-- Server-side enforcement of the brief workflow and editing rights.
create or replace function public.ws_brief_guard()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  gm boolean;
  is_sales boolean;
  is_des boolean;
  sales_edit boolean;
  des_edit boolean;
begin
  if uid is null then return new; end if;
  gm := public.is_gm(uid);
  select (l.sales_id = uid) into is_sales from public.leads l where l.id = new.lead_id;
  is_sales := coalesce(is_sales, false);
  is_des := (old.designer_id = uid);
  sales_edit := (gm or is_sales) and old.status in ('Draft','Revision Requested');
  des_edit := (gm or is_des) and old.status in ('Assigned','In Design');

  if new.status is distinct from old.status then
    if not (
      (old.status = 'Draft' and new.status = 'Submitted' and (gm or is_sales))
      or (old.status = 'Revision Requested' and new.status = 'Submitted' and (gm or is_sales))
      or (old.status = 'Submitted' and new.status = 'Assigned'
          and (gm or (public.ws_role(uid) = 'designer' and new.designer_id = uid)))
      or (old.status = 'Assigned' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'In Design' and new.status = 'Design Ready' and (gm or is_des))
      or (old.status = 'Revision Requested' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'Design Ready' and new.status = 'Design Approved' and (gm or is_sales))
      or (old.status = 'Design Ready' and new.status = 'Revision Requested' and (gm or is_sales)
          and length(trim(coalesce(new.revision_note, ''))) > 0)
    ) then
      raise exception 'Brief cannot move from % to % for this user', old.status, new.status;
    end if;
  end if;

  if (new.header, new.style, new.bedrooms, new.lists, new.attachments)
     is distinct from (old.header, old.style, old.bedrooms, old.lists, old.attachments)
     and not sales_edit then
    raise exception 'This part of the brief is locked at status %', old.status;
  end if;

  if (new.ffe, new.colours) is distinct from (old.ffe, old.colours)
     and not (sales_edit or des_edit) then
    raise exception 'FF&E and colours are locked at status %', old.status;
  end if;

  return new;
end $fn$;

revoke all on function public.ws_brief_guard() from public, anon, authenticated;

create trigger requirement_briefs_guard before update on public.requirement_briefs
  for each row execute function public.ws_brief_guard();