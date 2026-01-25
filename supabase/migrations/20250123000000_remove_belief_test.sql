-- Remove belief_test field from practice_entries
-- This field is redundant - the bold_risk (action) IS the belief test
-- Simplified flow: Vision → Belief → Action → Fear

ALTER TABLE practice_entries DROP COLUMN IF EXISTS belief_test;

-- Update comment documenting removal
COMMENT ON TABLE practice_entries IS 'Daily practice entries tracking vision, beliefs, actions, and fears. Simplified from 5 fields to 4 core fields for cleaner UX.';
