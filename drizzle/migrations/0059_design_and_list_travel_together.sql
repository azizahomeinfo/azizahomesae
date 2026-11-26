-- The design pipe and the item pipe ran independently, so one client revision reached the GM as two
-- half-updates. Ewan / L-1104, 2026-11-26: sales asked for a redesign (V4 opened as a Draft at 06:47
-- carrying V3's images), the designer sent the FF&E list ALONE at 06:53, the GM re-quoted at 06:56
-- against renders the client will never see, proposal V4 was generated at 06:57 pairing the new price
-- with design V3, and only at 06:59 was V4 submitted — withdrawing that quote again. Two quotes and a
-- mismatched proposal out of one client revision.
--
-- Veronica, 2026-11-26: "The design and FF&E list should be paired to submit to the GM." Her exception
-- stands: when nothing is being redesigned the list still goes alone, for items the client added that
-- no drawing shows.
--
-- DEFERRED on purpose. ws_submit_design_package writes the costing first and the design second, so at
-- statement time the design is still a Draft; by COMMIT it is 'Submitted' and this passes with nothing
-- to special-case. A bare "Resubmit to GM" leaves the draft sitting there and is refused. Checking at
-- commit also means no function needs to announce itself with a flag it could forget to set.
create or replace function public.ws_costing_pairs_design()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare pending_v int;
begin
  if auth.uid() is null or public.is_gm(auth.uid()) then return null; end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return null; end if;
  if new.status <> 'Submitted' then return null; end if;
  -- Budget approval is a different errand and never carries renders.
  if new.purpose is distinct from 'quote' then return null; end if;

  select max(d.version) into pending_v from public.designs d
   where d.lead_id = new.lead_id and d.status = 'Draft'
     and exists (select 1 from public.design_images i where i.design_id = d.id);
  if pending_v is not null then
    raise exception 'Design V% is still a draft — send it together with the list using "Submit design package" on the Renders tab, so the GM prices the list that matches the renders.', pending_v;
  end if;
  return null;
end $function$;

drop trigger if exists ffe_costings_pairs_design on public.ffe_costings;
create constraint trigger ffe_costings_pairs_design
  after insert or update on public.ffe_costings
  deferrable initially deferred
  for each row execute function public.ws_costing_pairs_design();
