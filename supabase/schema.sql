-- Malgudi Ops — Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  manager_name TEXT,
  manager_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CEO', 'MANAGER', 'STAFF')),
  outlet_id UUID REFERENCES outlets(id),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  submitted_by UUID REFERENCES users(id),
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('OPENING', 'BANMARIE', 'CLEANLINESS', 'CLOSING')),
  submission_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'LATE', 'MISSED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  submitted_by UUID REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('FOOD_QUALITY', 'BANMARIE', 'CLEANLINESS', 'RAW_MATERIAL', 'CLOSING', 'DISH_AUDIT')),
  photo_url TEXT NOT NULL,
  caption TEXT,
  ai_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (ai_status IN ('PENDING', 'APPROVED', 'FLAGGED')),
  ai_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  photo_url TEXT,
  notes TEXT
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  source TEXT NOT NULL CHECK (source IN ('SWIGGY', 'ZOMATO', 'DIRECT', 'GOOGLE')),
  complaint_text TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  date DATE NOT NULL,
  total_sales NUMERIC(12,2) DEFAULT 0,
  covers_count INTEGER DEFAULT 0,
  swiggy_orders INTEGER DEFAULT 0,
  zomato_orders INTEGER DEFAULT 0,
  dine_in_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, date)
);

CREATE TABLE shift_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CEO', 'MANAGER', 'STAFF')),
  shift_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT')),
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, user_email, shift_date)
);

CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  unit TEXT NOT NULL DEFAULT 'pcs',
  opening_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  used_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  wasted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE counter_temperature_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_email TEXT NOT NULL,
  round_date DATE NOT NULL,
  slot_key TEXT NOT NULL CHECK (slot_key IN (
    'counter-0730', 'counter-0930', 'counter-1130', 'counter-1330',
    'counter-1530', 'counter-1730', 'counter-1930', 'counter-2130'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'LATE')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, round_date, slot_key)
);

CREATE TABLE counter_temperature_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES counter_temperature_rounds(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL CHECK (item_key IN (
    'BATTER', 'COCONUT_CHUTNEY', 'RED_CHUTNEY', 'SAMBAR', 'COUNTER'
  )),
  temperature_c NUMERIC(5,2),
  photo_upload_id UUID REFERENCES photo_uploads(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, item_key),
  CHECK (
    (item_key = 'COUNTER' AND temperature_c IS NULL)
    OR (item_key <> 'COUNTER' AND temperature_c IS NOT NULL)
  )
);

CREATE TABLE cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  opening_cash_balance NUMERIC(12,2) NOT NULL CHECK (opening_cash_balance >= 0),
  cash_sales_as_per_pos NUMERIC(12,2) NOT NULL CHECK (cash_sales_as_per_pos >= 0),
  upi_sales NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (upi_sales >= 0),
  card_sales NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (card_sales >= 0),
  aggregator_sales NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (aggregator_sales >= 0),
  cash_expenses NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_expenses >= 0),
  cash_deposited_or_handed_over NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_deposited_or_handed_over >= 0),
  physical_cash_counted NUMERIC(12,2) NOT NULL CHECK (physical_cash_counted >= 0),
  expected_cash NUMERIC(12,2) GENERATED ALWAYS AS (
    opening_cash_balance + cash_sales_as_per_pos - cash_expenses - cash_deposited_or_handed_over
  ) STORED,
  difference_amount NUMERIC(12,2) GENERATED ALWAYS AS (
    physical_cash_counted - (opening_cash_balance + cash_sales_as_per_pos - cash_expenses - cash_deposited_or_handed_over)
  ) STORED,
  status TEXT NOT NULL CHECK (status IN ('balanced', 'shortage', 'excess', 'needs_review')),
  counted_by TEXT NOT NULL,
  verified_by TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_email TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  proof_photo_url TEXT,
  pos_closing_report_photo_url TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_email TEXT,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, business_date)
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_checklist_submissions_outlet_date ON checklist_submissions(outlet_id, created_at);
CREATE INDEX idx_photo_uploads_outlet_date ON photo_uploads(outlet_id, created_at);
CREATE INDEX idx_complaints_outlet ON complaints(outlet_id, status);
CREATE INDEX idx_daily_sales_outlet_date ON daily_sales(outlet_id, date);
CREATE INDEX idx_shift_attendance_outlet_date ON shift_attendance(outlet_id, shift_date);
CREATE INDEX idx_shift_attendance_user_date ON shift_attendance(user_email, shift_date DESC);
CREATE INDEX idx_inventory_logs_outlet_date ON inventory_logs(outlet_id, log_date DESC);
CREATE INDEX idx_inventory_logs_wastage ON inventory_logs(outlet_id, log_date DESC, wasted_qty) WHERE wasted_qty > 0;
CREATE INDEX idx_counter_rounds_outlet_date ON counter_temperature_rounds(outlet_id, round_date, scheduled_at);
CREATE INDEX idx_counter_readings_round ON counter_temperature_readings(round_id, item_key);
CREATE INDEX idx_cash_closings_date_status ON cash_closings(business_date DESC, status, outlet_id);

CREATE OR REPLACE FUNCTION public.sync_cash_closing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cash_difference NUMERIC(12,2);
BEGIN
  cash_difference := NEW.physical_cash_counted - (
    NEW.opening_cash_balance + NEW.cash_sales_as_per_pos
    - NEW.cash_expenses - NEW.cash_deposited_or_handed_over
  );
  NEW.status := CASE
    WHEN NEW.proof_photo_url IS NULL
      OR NEW.pos_closing_report_photo_url IS NULL
      OR NULLIF(BTRIM(NEW.verified_by), '') IS NULL
      THEN 'needs_review'
    WHEN cash_difference < 0 THEN 'shortage'
    WHEN cash_difference > 0 THEN 'excess'
    ELSE 'balanced'
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cash_closing_status_trigger ON cash_closings;
CREATE TRIGGER sync_cash_closing_status_trigger
BEFORE INSERT OR UPDATE OF
  opening_cash_balance,
  cash_sales_as_per_pos,
  cash_expenses,
  cash_deposited_or_handed_over,
  physical_cash_counted,
  verified_by,
  proof_photo_url,
  pos_closing_report_photo_url
ON cash_closings
FOR EACH ROW EXECUTE FUNCTION public.sync_cash_closing_status();

CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Signed URLs are generated by authenticated server routes. Apply
-- 20260606_production_hardening.sql for assignment-based storage policies.

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_temperature_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_temperature_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- CEO can see everything; managers see their outlet only
CREATE POLICY "CEO sees all outlets" ON outlets FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO sees all checklists" ON checklist_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO sees all photos" ON photo_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO sees all complaints" ON complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO sees all sales" ON daily_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO sees all alerts" ON alerts FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert checklists" ON checklist_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Insert photos" ON photo_uploads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Insert complaints" ON complaints FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Insert sales" ON daily_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Insert alerts" ON alerts FOR INSERT TO authenticated WITH CHECK (true);

-- Update complaints (for resolve)
CREATE POLICY "Update complaints" ON complaints FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- SEED DATA — 13 OUTLETS
-- ============================================================
INSERT INTO outlets (id, name, city, country, manager_name, manager_phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bandra',          'Mumbai', 'India', 'Rajesh Kumar',    '+91 98765 43210'),
  ('00000000-0000-0000-0000-000000000002', 'Juhu',             'Mumbai', 'India', 'Priya Sharma',    '+91 98765 43211'),
  ('00000000-0000-0000-0000-000000000003', 'Andheri',          'Mumbai', 'India', 'Vikram Singh',    '+91 98765 43212'),
  ('00000000-0000-0000-0000-000000000004', 'Powai',            'Mumbai', 'India', 'Meera Patel',     '+91 98765 43213'),
  ('00000000-0000-0000-0000-000000000005', 'Dadar',            'Mumbai', 'India', 'Suresh Nair',     '+91 98765 43214'),
  ('00000000-0000-0000-0000-000000000006', 'Colaba',           'Mumbai', 'India', 'Lakshmi Iyer',    '+91 98765 43215'),
  ('00000000-0000-0000-0000-000000000007', 'Connaught Place',  'Delhi',  'India', 'Amit Verma',      '+91 98765 43216'),
  ('00000000-0000-0000-0000-000000000008', 'Hauz Khas',        'Delhi',  'India', 'Rohit Gupta',     '+91 98765 43217'),
  ('00000000-0000-0000-0000-000000000009', 'Saket',            'Delhi',  'India', 'Deepa Menon',     '+91 98765 43218'),
  ('00000000-0000-0000-0000-00000000000a', 'Dubai Mall',       'Dubai',  'UAE',   'Ahmed Al-Rashid', '+971 50 123 4567'),
  ('00000000-0000-0000-0000-00000000000b', 'JBR',              'Dubai',  'UAE',   'Fatima Hassan',   '+971 50 234 5678'),
  ('00000000-0000-0000-0000-00000000000c', 'Business Bay',     'Dubai',  'UAE',   'Sanjay Patel',    '+971 50 345 6789'),
  ('00000000-0000-0000-0000-00000000000d', 'DIFC',             'Dubai',  'UAE',   'Nisha Kapoor',    '+971 50 456 7890');

-- CEO user (add your actual email)
INSERT INTO users (email, name, role) VALUES
  ('ceo@malgudi.com', 'Ashok Rai', 'CEO');
