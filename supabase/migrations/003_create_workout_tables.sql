-- Migration: Create workout tracking tables
-- Description: Adds tables for Strava (running) and Hevy (lifting) workout integrations

-- ========================================
-- Strava Connections
-- ========================================
-- Stores Strava OAuth tokens and athlete info
CREATE TABLE IF NOT EXISTS strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- For future auth integration
  access_token TEXT NOT NULL,  -- Encrypted at application layer
  refresh_token TEXT NOT NULL,  -- Required for token refresh
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  athlete_id TEXT NOT NULL,  -- Strava athlete ID
  athlete_name TEXT,  -- Display name
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'connected' CHECK (sync_status IN ('connected', 'error', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id)  -- One connection per Strava athlete
);

-- ========================================
-- Hevy Connections
-- ========================================
-- Stores Hevy API keys for lifting workout sync
CREATE TABLE IF NOT EXISTS hevy_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- For future auth integration
  api_key TEXT NOT NULL,  -- Encrypted at application layer
  connection_name TEXT NOT NULL DEFAULT 'My Hevy',
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'connected' CHECK (sync_status IN ('connected', 'error', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Running Activities (from Strava)
-- ========================================
CREATE TABLE IF NOT EXISTS running_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES strava_connections(id) ON DELETE CASCADE,
  strava_id TEXT NOT NULL,  -- Strava activity ID for deduplication
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  name TEXT,  -- Activity name from Strava
  distance_miles DECIMAL(6,2) NOT NULL,  -- Total distance in miles
  duration_seconds INTEGER NOT NULL,  -- Total moving time
  elevation_gain_feet DECIMAL(8,2),  -- Elevation gain
  average_pace_seconds INTEGER,  -- Seconds per mile
  splits JSONB,  -- Mile splits: [{mile: 1, time_seconds: 480}, ...]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, strava_id)  -- Prevent duplicate activities
);

-- ========================================
-- Lifting Workouts (from Hevy)
-- ========================================
CREATE TABLE IF NOT EXISTS lifting_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES hevy_connections(id) ON DELETE CASCADE,
  hevy_id TEXT NOT NULL,  -- Hevy workout ID for deduplication
  workout_date TIMESTAMP WITH TIME ZONE NOT NULL,
  name TEXT,  -- Workout name
  total_sets INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_reps INTEGER NOT NULL DEFAULT 0,
  total_volume_lbs DECIMAL(10,2),  -- Total weight lifted
  body_parts JSONB,  -- {chest: {sets: 5, reps: 40}, shoulders: {sets: 4, reps: 32}, ...}
  exercises JSONB,  -- Detailed exercise data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, hevy_id)  -- Prevent duplicate workouts
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_strava_connections_user_id ON strava_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_athlete_id ON strava_connections(athlete_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_sync_status ON strava_connections(sync_status);

CREATE INDEX IF NOT EXISTS idx_hevy_connections_user_id ON hevy_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_hevy_connections_sync_status ON hevy_connections(sync_status);

CREATE INDEX IF NOT EXISTS idx_running_activities_connection_id ON running_activities(connection_id);
CREATE INDEX IF NOT EXISTS idx_running_activities_activity_date ON running_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_running_activities_strava_id ON running_activities(strava_id);

CREATE INDEX IF NOT EXISTS idx_lifting_workouts_connection_id ON lifting_workouts(connection_id);
CREATE INDEX IF NOT EXISTS idx_lifting_workouts_workout_date ON lifting_workouts(workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifting_workouts_hevy_id ON lifting_workouts(hevy_id);

-- ========================================
-- Triggers for updated_at
-- ========================================
-- Reuse the update_updated_at_column function from migration 001

CREATE TRIGGER update_strava_connections_updated_at
  BEFORE UPDATE ON strava_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hevy_connections_updated_at
  BEFORE UPDATE ON hevy_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_running_activities_updated_at
  BEFORE UPDATE ON running_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lifting_workouts_updated_at
  BEFORE UPDATE ON lifting_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security
-- ========================================
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hevy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifting_workouts ENABLE ROW LEVEL SECURITY;

-- Permissive policies (will be restricted with auth)
CREATE POLICY "Allow all access to strava_connections" ON strava_connections
  FOR ALL USING (true);

CREATE POLICY "Allow all access to hevy_connections" ON hevy_connections
  FOR ALL USING (true);

CREATE POLICY "Allow all access to running_activities" ON running_activities
  FOR ALL USING (true);

CREATE POLICY "Allow all access to lifting_workouts" ON lifting_workouts
  FOR ALL USING (true);

-- ========================================
-- Documentation
-- ========================================
COMMENT ON TABLE strava_connections IS 'Stores Strava OAuth tokens and athlete metadata';
COMMENT ON TABLE hevy_connections IS 'Stores Hevy API keys for workout sync';
COMMENT ON TABLE running_activities IS 'Running activities fetched from Strava';
COMMENT ON TABLE lifting_workouts IS 'Lifting workouts fetched from Hevy';

COMMENT ON COLUMN running_activities.splits IS 'Array of mile splits: [{mile: 1, time_seconds: 480}, ...]';
COMMENT ON COLUMN lifting_workouts.body_parts IS 'Aggregated stats per body part: {chest: {sets: 5, reps: 40}, ...}';
COMMENT ON COLUMN lifting_workouts.exercises IS 'Detailed exercise data from Hevy';
