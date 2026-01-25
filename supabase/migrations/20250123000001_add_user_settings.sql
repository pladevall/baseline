-- User settings table for storing global configuration
-- Singleton pattern (id = 1) for single user application

-- ============================================
-- User Settings Table
-- ============================================
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  annual_salary NUMERIC DEFAULT 150000,  -- Opportunity cost in dollars
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with default $150k
INSERT INTO user_settings (id, annual_salary) VALUES (1, 150000)
ON CONFLICT (id) DO UPDATE SET annual_salary = EXCLUDED.annual_salary;

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Permissive policy (single user for now)
-- ============================================
CREATE POLICY "Allow all user_settings" ON user_settings FOR ALL USING (true);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_user_settings_id ON user_settings(id);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE user_settings IS 'Global user settings including opportunity cost for bet calculations';
COMMENT ON COLUMN user_settings.annual_salary IS 'Annual salary/opportunity cost in dollars, used to calculate downside = timeline × salary';
