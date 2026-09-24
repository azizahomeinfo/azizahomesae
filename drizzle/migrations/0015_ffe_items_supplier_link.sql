alter table public.ffe_items
  add column supplier_name    text,
  add column supplier_contact text,
  add column product_url      text,
  add constraint ffe_items_product_url_https
    check (product_url is null or product_url ~ '^https?://');

comment on column public.ffe_items.sku    is 'DEPRECATED: removed from the designer sheet';
comment on column public.ffe_items.finish is 'DEPRECATED: replaced by notes + product_url';
comment on column public.ffe_items.supplier_id is 'Set when the supplier is in the book; supplier_name always holds what was typed.';