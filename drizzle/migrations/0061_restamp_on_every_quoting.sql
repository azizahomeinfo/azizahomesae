-- Follow-up to 0060. The fingerprint was only stamped when the costing CHANGED to 'Quoted', so a GM
-- re-pricing a list that was already quoted — new options on a standing quote, which is routine — left
-- the previous stamp in place. The next design-only resubmission would then withdraw a price that still
-- stood. Caught on Ewan / L-1104 while putting two options on his quote (2026-11-26).
-- Re-stamp whenever the quotation is actually (re)set: status arrives at 'Quoted', the options change,
-- or quoted_at moves.
create or replace function public.ws_costing_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); gm boolean;
begin
  if new.status = 'Quoted'
     and (tg_op = 'INSERT'
          or old.status is distinct from 'Quoted'
          or new.options is distinct from old.options
          or new.quoted_at is distinct from old.quoted_at) then
    new.quoted_fingerprint := public.ws_ffe_fingerprint(new.lead_id);
  end if;

  if uid is null then return new; end if;
  gm := public.is_gm(uid);
  if not gm and coalesce(current_setting('ws.budget', true), '') <> 'on'
     and (tg_op = 'INSERT' and new.purpose <> 'quote' or tg_op = 'UPDATE' and new.purpose is distinct from old.purpose) then
    raise exception 'Budget approval starts only from "Submit for budget approval"';
  end if;
  if tg_op = 'INSERT' then
    if not gm and (new.status not in ('Draft','Submitted') or new.options <> '[]'::jsonb or new.version <> 1
                   or new.quoted_by is not null or new.quoted_at is not null) then
      raise exception 'Only the GM can set the quotation';
    end if;
    return new;
  end if;
  if not gm and (new.options is distinct from old.options
                 or new.version is distinct from old.version
                 or new.quoted_at is distinct from old.quoted_at
                 or new.quoted_by is distinct from old.quoted_by) then
    raise exception 'Only the GM can set the quotation';
  end if;
  if not gm and new.status is distinct from old.status
     and (new.status = 'Quoted'
          or (new.status = 'Returned' and coalesce(current_setting('ws.resync', true), '') <> 'on')) then
    raise exception 'Only the GM can set the quotation';
  end if;
  if not gm and new.status is distinct from old.status
     and coalesce(current_setting('ws.resync', true), '') <> 'on'
     and public.ws_role(uid) is distinct from 'designer' then
    raise exception 'Only the designer or the GM can submit the FF&E list';
  end if;
  return new;
end $function$;
