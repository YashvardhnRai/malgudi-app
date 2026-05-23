-- Malgudi Ops — Notification System Migration
-- Run this in the Supabase SQL editor

-- ============================================================
-- UPLOAD SCHEDULE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_upload_schedule_outlet_hour
  ON upload_schedule(outlet_id, hour);

ALTER TABLE upload_schedule DISABLE ROW LEVEL SECURITY;

-- Insert schedule for all active outlets
-- Every 2 hours: 8,10,12,14,16,18,20,22
INSERT INTO upload_schedule (outlet_id, hour, label)
SELECT o.id, s.h, s.label
FROM outlets o
CROSS JOIN (VALUES
  (8,  'Morning Opening'),
  (10, 'Mid-Morning'),
  (12, 'Lunch Prep'),
  (14, 'After Lunch'),
  (16, 'Afternoon'),
  (18, 'Evening Prep'),
  (20, 'Dinner Service'),
  (22, 'Closing')
) AS s(h, label)
WHERE o.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  outlet_id UUID REFERENCES outlets(id),
  manager_phone TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_email_read
  ON notifications(recipient_email, is_read, created_at DESC);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
