-- ffe_items uses column-level grants (cost price is hidden). The new lead_id column needs its own grant,
-- and project_id must be updatable so conversion can stamp the project onto the lead's rows.
grant select (lead_id), insert (lead_id) on public.ffe_items to authenticated;
grant update (project_id) on public.ffe_items to authenticated;