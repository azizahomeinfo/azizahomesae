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
