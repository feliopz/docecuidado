-- Doce Cuidado — Supabase Schema v2
-- Paste in Supabase Dashboard → SQL Editor → New Query → Run
-- IDs are TEXT (the app generates them with Date.now() or as strings)

-- 1. Children
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('boy', 'girl')),
  birthdate DATE,
  diagnosis TEXT CHECK (diagnosis IN ('dm1', 'dm2', 'outro', 'nao_sei')),
  diagnosis_date DATE,
  insulin_types TEXT[] DEFAULT '{}',
  glucose_target_min INT DEFAULT 70,
  glucose_target_max INT DEFAULT 180,
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Glucose Readings
CREATE TABLE IF NOT EXISTS glucose_readings (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  reading_value INT NOT NULL,
  reading_time TIMESTAMPTZ NOT NULL,
  moment TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_glucose_child_time ON glucose_readings(child_id, reading_time DESC);

-- 3. Insulin Logs
CREATE TABLE IF NOT EXISTS insulin_logs (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  insulin_type TEXT NOT NULL,
  dose_units INT NOT NULL,
  applied_time TIMESTAMPTZ NOT NULL,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insulin_child ON insulin_logs(child_id, applied_time DESC);

-- 4. Meals
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  meal_time TIMESTAMPTZ,
  description TEXT,
  calories INT,
  carbs_grams INT,
  protein_grams INT,
  fat_grams INT,
  glycemic_index TEXT,
  image_url TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_child ON meals(child_id, meal_time DESC);

-- 5. Caregivers
CREATE TABLE IF NOT EXISTS caregivers (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  relationship TEXT,
  role TEXT DEFAULT 'caregiver',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_caregivers_child ON caregivers(child_id);

-- 6. Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT DEFAULT 'outro',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  user_id TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, lesson_id)
);

-- 8. Invite Codes (for caregiver/doctor linking)
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE insulin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anonymous access (pre-auth phase)
CREATE POLICY "anon_all_children" ON children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_glucose" ON glucose_readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_insulin" ON insulin_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_meals" ON meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_caregivers" ON caregivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_contacts" ON emergency_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_lessons" ON lesson_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_invites" ON invite_codes FOR ALL USING (true) WITH CHECK (true);
