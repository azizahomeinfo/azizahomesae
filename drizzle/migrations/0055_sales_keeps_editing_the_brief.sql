-- Sales keeps editing the brief after it goes to design.
--
-- Veronica, 2026-11-12: "once that is submitted to the GM, she also needs to be able to edit it
-- because sometimes clients told her of additional requirements... especially for the item list
-- and anything else." Previously sales_edit was limited to Draft and Revision Requested, so the
-- moment the brief was submitted every section locked and a late client request had nowhere to go.
--
-- Sales (and the GM) may now edit every section while the brief is still open: Submitted,
-- Assigned, In Design and Design Ready as well. 'Design Approved' stays closed — reopening it to
-- 'In Design' is the deliberate path already in this guard, and that is unchanged.

CREATE OR REPLACE FUNCTION public.ws_brief_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  gm boolean; is_sales boolean; is_des boolean; sales_edit boolean; des_edit boolean;
begin
  if uid is null then return new; end if;
  -- A package lead's brief has no design stage: assigning its designer approves it (ws_assign_lead_designer).
  if coalesce(current_setting('ws.package_brief', true), '') = 'on' then return new; end if;
  gm := public.is_gm(uid);
  select (l.sales_id = uid) into is_sales from public.leads l where l.id = new.lead_id;
  is_sales := coalesce(is_sales, false);
  is_des := (old.designer_id = uid);
  sales_edit := (gm or is_sales)
                and old.status in ('Draft','Revision Requested','Submitted','Assigned','In Design','Design Ready');
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
end $function$;

-- The designer must not silently work from a brief that changed under them. When someone other
-- than the assigned designer edits a brief that is already with design, tell the designer what moved.
CREATE OR REPLACE FUNCTION public.ws_brief_edited_notice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  changed text[] := '{}';  -- array_append, not ||: text[] || unknown parses the literal as an array
  who text;
begin
  if uid is null or new.designer_id is null or uid = new.designer_id then return new; end if;
  if new.status is distinct from old.status then return new; end if;
  if new.status not in ('Assigned','In Design','Design Ready') then return new; end if;

  if new.ffe        is distinct from old.ffe        then changed := array_append(changed, 'the item list'); end if;
  if new.colours    is distinct from old.colours    then changed := array_append(changed, 'colours'); end if;
  if new.style      is distinct from old.style      then changed := array_append(changed, 'style'); end if;
  if new.header     is distinct from old.header     then changed := array_append(changed, 'the brief header'); end if;
  if new.lists      is distinct from old.lists      then changed := array_append(changed, 'the existing items / issues / queries'); end if;
  if new.attachments is distinct from old.attachments then changed := array_append(changed, 'attachments'); end if;
  if array_length(changed, 1) is null then return new; end if;

  select coalesce(m.full_name, m.email, 'Sales') into who from public.workspace_members m where m.user_id = uid;

  insert into public.notifications (user_id, kind, title, body, lead_id)
  select new.designer_id, 'brief',
         format('%s updated the brief for %s', coalesce(who,'Sales'), l.name),
         format('Changed: %s. Open the brief and check it before you carry on.',
                array_to_string(changed, ', ')),
         new.lead_id
    from public.leads l where l.id = new.lead_id;
  return new;
end $function$;

DROP TRIGGER IF EXISTS requirement_briefs_edited_notice ON public.requirement_briefs;
CREATE TRIGGER requirement_briefs_edited_notice
  AFTER UPDATE ON public.requirement_briefs
  FOR EACH ROW EXECUTE FUNCTION public.ws_brief_edited_notice();
