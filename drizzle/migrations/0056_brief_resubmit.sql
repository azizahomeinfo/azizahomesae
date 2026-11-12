-- Resubmitting a brief after sales changes it.
--
-- 0055 let sales keep editing a brief after it went to design, and notified the designer from a
-- trigger on every update. That was wrong: BriefEditor autosaves 800ms after each keystroke pause,
-- so a single editing session would have fired a stream of notifications at the designer.
--
-- Veronica, 2026-11-12: "every time sales save or update the requirement, it needs to be
-- resubmitted to the GM and also the designer. There's not a button like Resubmit. Once it's
-- resubmitted, the GM and designer need to get a notify."
--
-- So: drop the per-save trigger and give sales an explicit button. The brief keeps its status —
-- a resubmission is not a transition, it is "I changed this, look again" — and stamps
-- resubmitted_at. The notifications are sent by the client alongside the stamp, the same way
-- every other brief action already sends them.

ALTER TABLE public.requirement_briefs ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;
COMMENT ON COLUMN public.requirement_briefs.resubmitted_at IS
  'Last time sales pressed Resubmit after changing a brief that was already with design.';

DROP TRIGGER IF EXISTS requirement_briefs_edited_notice ON public.requirement_briefs;
DROP FUNCTION IF EXISTS public.ws_brief_edited_notice();

-- 2026-11-12, same day: 'Design Approved' was left out of sales_edit above, which meant an approved
-- brief rendered no action bar at all — no Submit, no Resubmit, and every field read-only. Approval
-- is not the end of the client's requests, so it joins the editable set. Reopening to 'In Design'
-- stays available for when the design itself has to be redone.
CREATE OR REPLACE FUNCTION public.ws_brief_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  uid uuid := auth.uid();
  gm boolean; is_sales boolean; is_des boolean; sales_edit boolean; des_edit boolean;
begin
  if uid is null then return new; end if;
  if coalesce(current_setting('ws.package_brief', true), '') = 'on' then return new; end if;
  gm := public.is_gm(uid);
  select (l.sales_id = uid) into is_sales from public.leads l where l.id = new.lead_id;
  is_sales := coalesce(is_sales, false);
  is_des := (old.designer_id = uid);
  sales_edit := (gm or is_sales)
                and old.status in ('Draft','Revision Requested','Submitted','Assigned','In Design','Design Ready','Design Approved');
  des_edit := (gm or is_des) and old.status in ('Assigned','In Design');
  if new.status is distinct from old.status then
    if not (
      (old.status = 'Draft' and new.status = 'Submitted' and (gm or is_sales))
      or (old.status = 'Revision Requested' and new.status = 'Submitted' and (gm or is_sales))
      or (old.status = 'Submitted' and new.status = 'Assigned' and gm)
      or (old.status = 'Assigned' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'In Design' and new.status = 'Design Ready' and (gm or is_des))
      or (old.status = 'Revision Requested' and new.status = 'In Design' and (gm or is_des))
      or (old.status = 'Design Ready' and new.status = 'Design Approved' and (gm or is_sales))
      or (old.status = 'Design Ready' and new.status = 'Revision Requested' and (gm or is_sales)
          and length(trim(coalesce(new.revision_note, ''))) > 0)
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
