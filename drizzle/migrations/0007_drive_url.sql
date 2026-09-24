alter table public.leads    add column drive_url text;
alter table public.projects add column drive_url text;
alter table public.leads    add constraint leads_drive_url_https
  check (drive_url is null or drive_url ~ '^https://');
alter table public.projects add constraint projects_drive_url_https
  check (drive_url is null or drive_url ~ '^https://');