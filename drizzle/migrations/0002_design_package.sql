create type public.design_status as enum ('Draft','Submitted','Accepted','Rejected');

alter table public.designs
  add column status public.design_status not null default 'Draft',
  add column feedback text,
  add column reject_reason text,
  add column decided_at timestamptz,
  add column decided_by uuid references public.workspace_members(user_id) on delete set null;

alter table public.design_images
  add column kind text not null default '3D render',
  add column file_name text,
  add column width int,
  add column height int;

create index designs_lead_idx on public.designs(lead_id, version desc);
create index design_images_sort_idx on public.design_images(design_id, sort_order);