alter table public.ffe_items
  add column sku text,
  add column dims text,
  add column finish text;
alter table public.snags
  add column ref_seq integer;