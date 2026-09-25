-- A design can only be shared while its costing is freshly Submitted: a Quoted costing left over from an earlier version no longer counts.
CREATE OR REPLACE FUNCTION public.ws_design_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); r public.workspace_role;
begin
  if uid is null then return new; end if;
  if new.status in ('Accepted','Rejected')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    r := public.ws_role(uid);
    if not (r = 'gm' or (r = 'sales' and exists (
        select 1 from public.leads l where l.id = new.lead_id and l.sales_id = uid))) then
      raise exception 'Only the sales owner or the GM can decide a design';
    end if;
  end if;
  if new.status = 'Submitted' and (tg_op = 'INSERT' or old.status is distinct from 'Submitted') then
    if not exists (select 1 from public.ffe_costings c
                    where c.lead_id = new.lead_id and c.status = 'Submitted') then
      raise exception 'Share the design and submit the FF&E together';
    end if;
  end if;
  return new;
end $function$;