grant select (supplier_name, supplier_contact, product_url),
      insert (supplier_name, supplier_contact, product_url),
      update (supplier_name, supplier_contact, product_url)
  on public.ffe_items to authenticated;