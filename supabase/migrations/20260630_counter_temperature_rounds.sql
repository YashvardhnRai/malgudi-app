-- Five-photo counter temperature rounds every two hours from 07:30 IST.
-- Apply after 20260606_production_hardening.sql and 20260619_restaurant_features.sql.

begin;

create table if not exists public.counter_temperature_rounds (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  submitted_by uuid references public.users(id) on delete set null,
  submitted_by_email text not null,
  round_date date not null,
  slot_key text not null check (
    slot_key in (
      'counter-0730',
      'counter-0930',
      'counter-1130',
      'counter-1330',
      'counter-1530',
      'counter-1730',
      'counter-1930',
      'counter-2130'
    )
  ),
  scheduled_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  status text not null check (status in ('SUBMITTED', 'LATE')),
  note text,
  created_at timestamptz not null default now(),
  unique(outlet_id, round_date, slot_key)
);

create table if not exists public.counter_temperature_readings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.counter_temperature_rounds(id) on delete cascade,
  item_key text not null check (
    item_key in ('BATTER', 'COCONUT_CHUTNEY', 'RED_CHUTNEY', 'SAMBAR', 'COUNTER')
  ),
  temperature_c numeric(5,2),
  photo_upload_id uuid references public.photo_uploads(id) on delete set null,
  photo_url text not null,
  created_at timestamptz not null default now(),
  unique(round_id, item_key),
  check (
    (item_key = 'COUNTER' and temperature_c is null)
    or (item_key <> 'COUNTER' and temperature_c is not null)
  )
);

create index if not exists idx_counter_rounds_outlet_date
  on public.counter_temperature_rounds(outlet_id, round_date, scheduled_at);

create index if not exists idx_counter_readings_round
  on public.counter_temperature_readings(round_id, item_key);

alter table public.counter_temperature_rounds enable row level security;
alter table public.counter_temperature_readings enable row level security;

drop policy if exists "counter rounds read by assignment" on public.counter_temperature_rounds;
drop policy if exists "counter rounds insert by assignment" on public.counter_temperature_rounds;
drop policy if exists "counter readings read by assignment" on public.counter_temperature_readings;
drop policy if exists "counter readings insert by assignment" on public.counter_temperature_readings;

create policy "counter rounds read by assignment"
on public.counter_temperature_rounds for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "counter rounds insert by assignment"
on public.counter_temperature_rounds for insert to authenticated
with check (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "counter readings read by assignment"
on public.counter_temperature_readings for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or exists (
    select 1
    from public.counter_temperature_rounds round
    where round.id = counter_temperature_readings.round_id
      and round.outlet_id = public.current_app_outlet_id()
  )
);

create policy "counter readings insert by assignment"
on public.counter_temperature_readings for insert to authenticated
with check (
  public.current_app_role() = 'CEO'
  or exists (
    select 1
    from public.counter_temperature_rounds round
    where round.id = counter_temperature_readings.round_id
      and round.outlet_id = public.current_app_outlet_id()
  )
);

commit;
