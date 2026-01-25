-- Add duration tracking to actions and beliefs
-- These fields track time commitment for timeline calculation

-- ============================================
-- Add duration_days to bold_takes
-- ============================================
ALTER TABLE bold_takes ADD COLUMN duration_days INTEGER DEFAULT 30;

-- ============================================
-- Add duration_days to practice_beliefs
-- ============================================
ALTER TABLE practice_beliefs ADD COLUMN duration_days INTEGER DEFAULT 0;

-- ============================================
-- Convert downside to NUMERIC for monetary values
-- ============================================
-- First, update the bets table to change downside from TEXT to NUMERIC
-- This handles both new numeric entries and existing text entries
ALTER TABLE bets
  ALTER COLUMN downside TYPE NUMERIC USING
    CASE
      WHEN downside ~ '^\$?[0-9,]+(\.[0-9]{2})?$' THEN
        regexp_replace(downside, '[^0-9.]', '', 'g')::NUMERIC
      ELSE NULL
    END;

-- ============================================
-- Make timeline nullable (now calculated from actions)
-- ============================================
ALTER TABLE bets ALTER COLUMN timeline DROP NOT NULL;

-- ============================================
-- Add comment documenting the change
-- ============================================
COMMENT ON COLUMN bold_takes.duration_days IS 'Time commitment in days for this action (used for timeline calculation)';
COMMENT ON COLUMN practice_beliefs.duration_days IS 'Time in days to validate this belief (used for timeline calculation)';
COMMENT ON COLUMN bets.downside IS 'Monetary downside risk in dollars (numeric value)';
COMMENT ON COLUMN bets.timeline IS 'Text description of timeline (deprecated - use calculated_timeline from actions sum)';
