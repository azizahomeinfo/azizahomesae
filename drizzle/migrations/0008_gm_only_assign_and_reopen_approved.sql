create or replace function public.ws_assign_brief(_brief uuid, _designer uuid)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare b public.requirement_briefs%rowtype;
begin
  if not public.is_gm(auth.uid()) then
    raise exception 'Only the GM can assign a brief';
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

create or replace function public.ws_brief_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  uid uuid := auth.uid();
  gm boolean; is_sales boolean; is_des boolean; sales_edit boolean; des_edit boolean;
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
      -- assignment is GM-only now
      or (old.status = 'Submitted' and new.status = 'Assigned' and gm)
      or (old.status = 'Assigned' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'In Design' and new.status = 'Design Ready' and (gm or is_des))
      or (old.status = 'Revision Requested' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'Design Ready' and new.status = 'Design Approved' and (gm or is_sales))
      or (old.status = 'Design Ready' and new.status = 'Revision Requested' and (gm or is_sales)
          and length(trim(coalesce(new.revision_note, ''))) > 0)
      -- a client can ask for changes after approving; reopening design is how that is handled
      or (old.status = 'Design Approved' and new.status = 'In Design' and (gm or is_sales or is_des))
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

drop policy if exists "briefs: staff on the lead or a designer claiming it update" on public.requirement_briefs;
create policy "briefs: staff on the lead update" on public.requirement_briefs
  for update to authenticated
  using (public.can_see_lead(auth.uid(), lead_id))
  with check (public.can_see_lead(auth.uid(), lead_id));