drop policy "suppliers: GM and coordinators maintain" on public.suppliers;
create policy "suppliers: GM, coordinator and designer maintain" on public.suppliers for insert
  with check (public.ws_role(auth.uid()) in ('gm','coordinator','designer'));
create policy "suppliers: GM, coordinator and designer edit" on public.suppliers for update
  using (public.ws_role(auth.uid()) in ('gm','coordinator','designer'))
  with check (public.ws_role(auth.uid()) in ('gm','coordinator','designer'));
create policy "suppliers: GM deletes" on public.suppliers for delete
  using (public.is_gm(auth.uid()));