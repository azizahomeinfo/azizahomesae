-- B. Sales accept a design for the client, because sales are the ones who show it to them. The GM may
--    still accept, but must say why: Ewan / L-1104 V4 was accepted from the GM account 25 seconds after
--    it arrived, before Stella could put it in front of the client (Veronica, 2026-11-26).
-- C. One quote per revision round. Every resubmission withdrew the GM's price, so Ewan was quoted twice
--    in six minutes. A design-only resubmission now leaves the quote standing when the costed list is
--    exactly what was priced; only a list whose money actually changed goes back for a new quotation.
alter table public.designs      add column if not exists accept_note text;
alter table public.ffe_costings add column if not exists quoted_fingerprint text;
comment on column public.designs.accept_note is 'Why the GM accepted a design instead of the sales owner. Required for that path; shown to sales.';
comment on column public.ffe_costings.quoted_fingerprint is 'The costed list as it stood when the GM quoted. Equal fingerprint = the price still covers this list.';

-- What the GM actually priced: every non-internal line with its quantity and unit cost.
create or replace function public.ws_ffe_fingerprint(_lead uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(md5(string_agg(i.id::text||':'||coalesce(i.qty,0)::text||':'||coalesce(c.unit_cost,-1)::text, '|' order by i.id)), 'empty')
    from public.ffe_items i
    left join public.ffe_item_costs c on c.item_id = i.id
   where i.lead_id = _lead and not i.internal
$function$;

-- Applied live 2026-11-26 (verified by impersonation in rolled-back transactions):
--   ws_costing_guard        stamps quoted_fingerprint whenever the GM sets a quotation
--   ws_design_guard         B: a GM who is not the sales owner must give accept_note
--                           C: a design may be Submitted against a standing quote that still covers the list
--   ws_quote_still_covers   definer helper — ffe_costings is column-granted, so a caller-rights function
--                           cannot read quoted_fingerprint (same trap as ffe_costings.options)
--   ws_submit_design_package  leaves a covering quotation standing instead of withdrawing it
-- Existing 'Quoted' rows were backfilled with the fingerprint of their current list.
