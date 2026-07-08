-- Daily outlet cash closing with server-calculated reconciliation totals.
-- Apply after 20260630_counter_temperature_rounds.sql.

begin;

create table if not exists public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  business_date date not null,
  opening_cash_balance numeric(12,2) not null check (opening_cash_balance >= 0),
  cash_sales_as_per_pos numeric(12,2) not null check (cash_sales_as_per_pos >= 0),
  upi_sales numeric(12,2) not null default 0 check (upi_sales >= 0),
  card_sales numeric(12,2) not null default 0 check (card_sales >= 0),
  aggregator_sales numeric(12,2) not null default 0 check (aggregator_sales >= 0),
  cash_expenses numeric(12,2) not null default 0 check (cash_expenses >= 0),
  cash_deposited_or_handed_over numeric(12,2) not null default 0
    check (cash_deposited_or_handed_over >= 0),
  physical_cash_counted numeric(12,2) not null check (physical_cash_counted >= 0),
  expected_cash numeric(12,2) generated always as (
    opening_cash_balance + cash_sales_as_per_pos - cash_expenses - cash_deposited_or_handed_over
  ) stored,
  difference_amount numeric(12,2) generated always as (
    physical_cash_counted - (
      opening_cash_balance + cash_sales_as_per_pos - cash_expenses - cash_deposited_or_handed_over
    )
  ) stored,
  status text not null check (
    status in ('balanced', 'shortage', 'excess', 'needs_review')
  ),
  counted_by text not null,
  verified_by text,
  submitted_by uuid references public.users(id) on delete set null,
  submitted_by_email text not null,
  submitted_at timestamptz not null default now(),
  notes text,
  proof_photo_url text,
  pos_closing_report_photo_url text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_by_email text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(outlet_id, business_date)
);

create index if not exists idx_cash_closings_date_status
  on public.cash_closings(business_date desc, status, outlet_id);

create or replace function public.sync_cash_closing_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cash_difference numeric(12,2);
begin
  cash_difference := new.physical_cash_counted - (
    new.opening_cash_balance + new.cash_sales_as_per_pos
    - new.cash_expenses - new.cash_deposited_or_handed_over
  );

  new.status := case
    when new.proof_photo_url is null
      or new.pos_closing_report_photo_url is null
      or nullif(btrim(new.verified_by), '') is null
      then 'needs_review'
    when cash_difference < 0 then 'shortage'
    when cash_difference > 0 then 'excess'
    else 'balanced'
  end;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_cash_closing_status_trigger on public.cash_closings;
create trigger sync_cash_closing_status_trigger
before insert or update of
  opening_cash_balance,
  cash_sales_as_per_pos,
  cash_expenses,
  cash_deposited_or_handed_over,
  physical_cash_counted,
  verified_by,
  proof_photo_url,
  pos_closing_report_photo_url
on public.cash_closings
for each row execute function public.sync_cash_closing_status();

alter table public.cash_closings enable row level security;

drop policy if exists "cash closings read by assignment" on public.cash_closings;
drop policy if exists "cash closings insert by assignment" on public.cash_closings;
drop policy if exists "cash closings update by ceo" on public.cash_closings;

create policy "cash closings read by assignment"
on public.cash_closings for select to authenticated
using (
  public.current_app_role() = 'CEO'
  or outlet_id = public.current_app_outlet_id()
);

create policy "cash closings insert by assignment"
on public.cash_closings for insert to authenticated
with check (
  public.current_app_role() = 'CEO'
  or (
    public.current_app_role() in ('MANAGER', 'STAFF')
    and outlet_id = public.current_app_outlet_id()
  )
);

create policy "cash closings update by ceo"
on public.cash_closings for update to authenticated
using (public.current_app_role() = 'CEO')
with check (public.current_app_role() = 'CEO');

commit;
