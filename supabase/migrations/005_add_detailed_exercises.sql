-- Add exercises_detailed column to lifting_workouts table
ALTER TABLE lifting_workouts
ADD COLUMN IF NOT EXISTS exercises_detailed JSONB;
