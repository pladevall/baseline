-- Ensure preferences table exists (failed to create in 006 due to partial error)
CREATE TABLE IF NOT EXISTS sleep_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_bedtime TIME DEFAULT '22:30:00',
  target_wake_time TIME DEFAULT '06:30:00',
  target_duration_minutes INTEGER DEFAULT 480,
  bedtime_window_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
