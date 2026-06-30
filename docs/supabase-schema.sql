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

-- ============================================================================
-- SECURE RLS — every policy is scoped to the authenticated user (auth.uid()).
-- Anonymous clients get ZERO access; pre-auth data stays local (AsyncStorage)
-- and syncs on sign-in. See migrations:
--   secure_rls_auth_scoped_policies, secure_invite_and_delete_rpcs
-- NOTE: This block is the canonical, secure replacement for the previous
--       `USING (true)` policies. Do NOT reintroduce permissive policies.
-- ============================================================================

-- Helper functions (SECURITY DEFINER → bypass RLS to avoid policy recursion).
CREATE OR REPLACE FUNCTION public.is_child_owner(p_child_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.children c WHERE c.id = p_child_id AND c.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_access_child(p_child_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.children c   WHERE c.id = p_child_id AND c.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.caregivers cg WHERE cg.child_id = p_child_id AND cg.user_id = auth.uid()::text);
$$;
REVOKE EXECUTE ON FUNCTION public.is_child_owner(text), public.can_access_child(text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.is_child_owner(text), public.can_access_child(text) TO authenticated;

-- children: owner writes; owner + linked caregivers read.
CREATE POLICY children_select ON children FOR SELECT TO authenticated USING (public.can_access_child(id));
CREATE POLICY children_insert ON children FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY children_update ON children FOR UPDATE TO authenticated USING (public.is_child_owner(id)) WITH CHECK (public.is_child_owner(id));
CREATE POLICY children_delete ON children FOR DELETE TO authenticated USING (public.is_child_owner(id));

-- child-linked health data: any account with access to the child.
CREATE POLICY glucose_rw  ON glucose_readings   FOR ALL TO authenticated USING (public.can_access_child(child_id)) WITH CHECK (public.can_access_child(child_id));
CREATE POLICY insulin_rw  ON insulin_logs       FOR ALL TO authenticated USING (public.can_access_child(child_id)) WITH CHECK (public.can_access_child(child_id));
CREATE POLICY meals_rw    ON meals              FOR ALL TO authenticated USING (public.can_access_child(child_id)) WITH CHECK (public.can_access_child(child_id));
CREATE POLICY contacts_rw ON emergency_contacts FOR ALL TO authenticated USING (public.can_access_child(child_id)) WITH CHECK (public.can_access_child(child_id));
CREATE POLICY lessons_rw  ON lesson_progress    FOR ALL TO authenticated USING (public.can_access_child(child_id)) WITH CHECK (public.can_access_child(child_id));

-- caregivers: read within family; owner manages; self-insert/self-remove.
CREATE POLICY caregivers_select ON caregivers FOR SELECT TO authenticated USING (public.can_access_child(child_id));
CREATE POLICY caregivers_insert ON caregivers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text AND public.can_access_child(child_id));
CREATE POLICY caregivers_update ON caregivers FOR UPDATE TO authenticated USING (public.is_child_owner(child_id)) WITH CHECK (public.is_child_owner(child_id));
CREATE POLICY caregivers_delete ON caregivers FOR DELETE TO authenticated USING (user_id = auth.uid()::text OR public.is_child_owner(child_id));

-- invite_codes: only the child owner can see/create/manage codes.
-- (Redemption happens via the redeem_invite_code() RPC — codes are NOT enumerable.)
CREATE POLICY invites_select ON invite_codes FOR SELECT TO authenticated USING (public.is_child_owner(child_id));
CREATE POLICY invites_insert ON invite_codes FOR INSERT TO authenticated WITH CHECK (public.is_child_owner(child_id));
CREATE POLICY invites_update ON invite_codes FOR UPDATE TO authenticated USING (public.is_child_owner(child_id)) WITH CHECK (public.is_child_owner(child_id));
CREATE POLICY invites_delete ON invite_codes FOR DELETE TO authenticated USING (public.is_child_owner(child_id));

-- See migration `secure_invite_and_delete_rpcs` for redeem_invite_code() and
-- delete_child_and_data() (SECURITY DEFINER RPCs, authenticated-only).

-- ── Learning content (public read, editable via service role) ───────────────
-- See migration `create_lessons_and_quiz_tables`. Edited with tools/lessons-admin.html.
create table if not exists public.lessons (
  id text primary key, title text not null, description text not null default '',
  content text not null default '', icon_svg text not null default '',
  order_index int not null default 0, created_at timestamptz not null default now()
);
alter table public.lessons enable row level security;
create policy lessons_read on public.lessons for select to anon, authenticated using (true);

create table if not exists public.quiz_questions (
  id text primary key, question text not null, options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0, explanation_correct text not null default '',
  explanation_wrong text not null default '', order_index int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.quiz_questions enable row level security;
create policy quiz_read on public.quiz_questions for select to anon, authenticated using (true);

-- ── App logs (real-time monitoring) ─────────────────────────────────────────
-- See migration `create_app_logs_table`. Minimal, NON-sensitive telemetry.
-- Clients insert only their own rows; the `llm` edge function writes server rows
-- (source='server') for AI provider health. Monitored via tools/logs-admin.html.
create table if not exists public.app_logs (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid,
  level       text not null default 'info' check (level in ('info','warn','error')),
  event       text not null,
  area        text,
  detail      text,
  provider    text,
  ok          boolean,
  source      text not null default 'client' check (source in ('client','server')),
  platform    text,
  app_version text,
  client_ts   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_app_logs_created on public.app_logs(created_at desc);
create index if not exists idx_app_logs_level   on public.app_logs(level, created_at desc);
create index if not exists idx_app_logs_event   on public.app_logs(event, created_at desc);
create index if not exists idx_app_logs_user    on public.app_logs(user_id, created_at desc);
alter table public.app_logs enable row level security;
create policy app_logs_insert on public.app_logs
  for insert to authenticated with check (user_id = auth.uid());
revoke all on public.app_logs from anon;
