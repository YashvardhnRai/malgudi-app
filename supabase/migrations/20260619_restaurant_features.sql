-- Malgudi restaurant launch features.
-- Apply after 20260606_production_hardening.sql.

begin;

create table if not exists public.shift_attendance (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text not null,
  user_name text not null,
  role text not null check (role in ('CEO', 'MANAGER', 'STAFF')),
  shift_date date not null,
  status text not null check (status in ('CHECKED_IN', 'CHECKED_OUT')),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(outlet_id, user_email, shift_date)
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  recorded_by uuid references public.users(id) on delete set null,
  item_name text not null,
  category text not null default 'GENERAL',
  unit text not null default 'pcs',
  opening_qty numeric(12,2) not null default 0,
  used_qty numeric(12,2) not null default 0,
  wasted_qty numeric(12,2) not null default 0,
  closing_qty numeric(12,2) not null default 0,
  note text,
  log_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_attendance_outlet_date
  on public.shift_attendance(outlet_id, shift_date);

create index if not exists idx_shift_attendance_user_date
  on public.shift_attendance(user_email, shift_date desc);

create index if not exists idx_inventory_logs_outlet_date
  on public.inventory_logs(outlet_id, log_date desc);

create index if not exists idx_inventory_logs_wastage
  on public.inventory_logs(outlet_id, log_date desc, wasted_qty)
  where wasted_qty > 0;

alter table public.shift_attendance enable row level security;
alter table public.inventory_logs enable row level security;

drop policy if exists "attendance read by assignment" on public.shift_attendance;
drop policy if exists "attendance insert by assignment" on public.shift_attendance;
drop policy if exists "attendance update by owner or ceo" on public.shift_attendance;
drop policy if exists "inventory read by assignment" on public.inventory_logs;
drop policy if exists "inventory insert by assignment" on public.inventory_logs;

create policy "attendance read by assignment"
on public.shift_attendance for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "attendance insert by assignment"
on public.shift_attendance for insert to authenticated
with check (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "attendance update by owner or ceo"
on public.shift_attendance for update to authenticated
using (
  public.current_app_role() = 'CEO'
  or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "inventory read by assignment"
on public.inventory_logs for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "inventory insert by assignment"
on public.inventory_logs for insert to authenticated
with check (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

commit;
