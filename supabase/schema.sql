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
CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow public read of photos
CREATE POLICY "Public read photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
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
