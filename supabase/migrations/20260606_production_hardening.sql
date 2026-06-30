-- Malgudi production security hardening.
-- Apply in the Supabase SQL editor before restaurant rollout.

begin;

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.checklist_submissions(id) on delete cascade,
  item_name text not null,
  is_completed boolean not null default false,
  photo_url text,
  notes text
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.current_app_outlet_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select outlet_id
  from public.users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.current_app_outlet_id() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_app_outlet_id() to authenticated;

alter table public.outlets enable row level security;
alter table public.users enable row level security;
alter table public.checklist_submissions enable row level security;
alter table public.checklist_items enable row level security;
alter table public.photo_uploads enable row level security;
alter table public.complaints enable row level security;
alter table public.daily_sales enable row level security;
alter table public.alerts enable row level security;
alter table public.upload_schedule enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "CEO sees all outlets" on public.outlets;
drop policy if exists "CEO sees all checklists" on public.checklist_submissions;
drop policy if exists "CEO sees all photos" on public.photo_uploads;
drop policy if exists "CEO sees all complaints" on public.complaints;
drop policy if exists "CEO sees all sales" on public.daily_sales;
drop policy if exists "CEO sees all alerts" on public.alerts;
drop policy if exists "Insert checklists" on public.checklist_submissions;
drop policy if exists "Insert photos" on public.photo_uploads;
drop policy if exists "Insert complaints" on public.complaints;
drop policy if exists "Insert sales" on public.daily_sales;
drop policy if exists "Insert alerts" on public.alerts;
drop policy if exists "Update complaints" on public.complaints;

drop policy if exists "outlet read by assignment" on public.outlets;
drop policy if exists "user read by self or ceo" on public.users;
drop policy if exists "checklist read by assignment" on public.checklist_submissions;
drop policy if exists "checklist item read by assignment" on public.checklist_items;
drop policy if exists "photo read by assignment" on public.photo_uploads;
drop policy if exists "complaint read by assignment" on public.complaints;
drop policy if exists "sales read by assignment" on public.daily_sales;
drop policy if exists "alert read by assignment" on public.alerts;
drop policy if exists "schedule read by assignment" on public.upload_schedule;
drop policy if exists "notification read by recipient" on public.notifications;

drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "Public read photos" on storage.objects;
drop policy if exists "photo object read by assignment" on storage.objects;
drop policy if exists "photo object insert by assignment" on storage.objects;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

create policy "outlet read by assignment"
on public.outlets for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or id = public.current_app_outlet_id()
);

create policy "user read by self or ceo"
on public.users for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "checklist read by assignment"
on public.checklist_submissions for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "checklist item read by assignment"
on public.checklist_items for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or exists (
    select 1
    from public.checklist_submissions submission
    where submission.id = checklist_items.submission_id
      and submission.outlet_id = public.current_app_outlet_id()
  )
);

create policy "photo read by assignment"
on public.photo_uploads for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "complaint read by assignment"
on public.complaints for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "sales read by assignment"
on public.daily_sales for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "alert read by assignment"
on public.alerts for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "schedule read by assignment"
on public.upload_schedule for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "notification read by recipient"
on public.notifications for select to authenticated
using (
  lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.current_app_role() = 'CEO'
);

create policy "photo object read by assignment"
on storage.objects for select to authenticated
using (
  bucket_id = 'photos'
  and (
    public.current_app_role() = 'CEO'
    or (storage.foldername(name))[1] = public.current_app_outlet_id()::text
  )
);

create policy "photo object insert by assignment"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'photos'
  and (
    public.current_app_role() = 'CEO'
    or (storage.foldername(name))[1] = public.current_app_outlet_id()::text
  )
);

create index if not exists idx_notifications_type_outlet_created
  on public.notifications(type, outlet_id, created_at desc);

create index if not exists idx_users_outlet_role
  on public.users(outlet_id, role);

create index if not exists idx_photo_uploads_outlet_category_created
  on public.photo_uploads(outlet_id, category, created_at desc);

commit;
