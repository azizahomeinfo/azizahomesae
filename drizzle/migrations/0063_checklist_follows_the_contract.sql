-- The handover checklist was built from the FF&E list, which is NOT what the client signed. Every
-- project with a contract had drifted (Veronica, 2026-11-28: "still not the same as the signed
-- contract item list"), and the gap runs the dangerous way too:
--   Rohit AZ-2643   SIGNED, closed   63 on the contract, 50 on FF&E, 17 contract items never checked
--   Adam Michael    SIGNED            85 / 100, 8 missing
--   Srdjan          SIGNED            61 / 70,  4 missing
--   Luca            ISSUED            55 / 82,  9 missing
-- A contract line that nothing was bought against has no ffe_items row, so a check keyed on
-- ffe_items.id cannot even exist for it. Key on the line instead; keep item_id for provenance where
-- the line does map to a row.
alter table public.handover_checks add column if not exists line_key text;
update public.handover_checks h
   set line_key = lower(btrim(i.room)) || '|' || lower(btrim(i.item))
  from public.ffe_items i
 where i.id = h.item_id and h.line_key is null;
alter table public.handover_checks alter column item_id drop not null;
alter table public.handover_checks drop constraint if exists handover_checks_item_id_key;
alter table public.handover_checks alter column line_key set not null;
create unique index if not exists handover_checks_line on public.handover_checks(project_id, line_key);
comment on column public.handover_checks.line_key is 'lower(room)|lower(item) - identifies the checklist line, so a contract line with no FF&E row can still be ticked.';
comment on column public.handover_checks.item_id is 'The FF&E row this line maps to, when there is one. Null for a contract line nothing was bought against.';
