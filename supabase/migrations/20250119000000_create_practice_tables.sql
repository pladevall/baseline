-- Bold Practice Integration Tables
-- Creates tables for daily practice, bold takes, beliefs, goals, and streak tracking

-- ============================================
-- Daily practice entries
-- ============================================
CREATE TABLE practice_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  winning_vision TEXT,
  belief_examined TEXT,
  belief_test TEXT,
  bold_risk TEXT,
  bold_risk_fear TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Bold takes history
-- ============================================
CREATE TABLE bold_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  fear TEXT,
  status TEXT DEFAULT 'committed' CHECK (status IN ('committed', 'done', 'skipped')),
  outcome TEXT,
  learning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Beliefs tracker
-- ============================================
CREATE TABLE practice_beliefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belief TEXT NOT NULL,
  status TEXT DEFAULT 'untested' CHECK (status IN ('untested', 'testing', 'proven', 'disproven')),
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Practice goals (separate from fitness goals)
-- ============================================
CREATE TABLE practice_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Financial', 'Product', 'Growth', 'Personal')),
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  quarter TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Practice streak tracking (singleton pattern)
-- ============================================
CREATE TABLE practice_streak (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE
);

-- Initialize streak row
INSERT INTO practice_streak (id, current_streak, longest_streak) VALUES (1, 0, 0);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE practice_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bold_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_streak ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Permissive policies (single user for now)
-- ============================================
CREATE POLICY "Allow all practice_entries" ON practice_entries FOR ALL USING (true);
CREATE POLICY "Allow all bold_takes" ON bold_takes FOR ALL USING (true);
CREATE POLICY "Allow all practice_beliefs" ON practice_beliefs FOR ALL USING (true);
CREATE POLICY "Allow all practice_goals" ON practice_goals FOR ALL USING (true);
CREATE POLICY "Allow all practice_streak" ON practice_streak FOR ALL USING (true);

-- ============================================
-- Indexes for common queries
-- ============================================
CREATE INDEX idx_practice_entries_date ON practice_entries(date DESC);
CREATE INDEX idx_bold_takes_date ON bold_takes(date DESC);
CREATE INDEX idx_bold_takes_status ON bold_takes(status);
CREATE INDEX idx_practice_beliefs_status ON practice_beliefs(status);
CREATE INDEX idx_practice_goals_category ON practice_goals(category);
