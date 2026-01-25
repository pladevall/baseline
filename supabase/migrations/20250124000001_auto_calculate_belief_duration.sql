-- Auto-calculate belief duration from sum of linked action durations
-- This migration creates a function and trigger to automatically update belief duration_days
-- when linked actions are added, updated, or deleted

-- ============================================
-- Function: Recalculate Belief Duration
-- ============================================
-- Calculates belief duration as sum of linked action durations
CREATE OR REPLACE FUNCTION recalculate_belief_duration(belief_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    total_duration INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(COALESCE(duration_days, 30)), 0)
    INTO total_duration
    FROM bold_takes
    WHERE belief_id = belief_id_param;

    RETURN total_duration;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger Function: Auto-update Belief Duration
-- ============================================
-- Triggered when actions (bold_takes) change
CREATE OR REPLACE FUNCTION update_belief_duration_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the belief's duration when an action is added/updated/deleted
    IF TG_OP = 'DELETE' THEN
        IF OLD.belief_id IS NOT NULL THEN
            UPDATE practice_beliefs
            SET duration_days = recalculate_belief_duration(OLD.belief_id)
            WHERE id = OLD.belief_id;
        END IF;
        RETURN OLD;
    ELSE
        -- For INSERT or UPDATE
        IF NEW.belief_id IS NOT NULL THEN
            UPDATE practice_beliefs
            SET duration_days = recalculate_belief_duration(NEW.belief_id)
            WHERE id = NEW.belief_id;
        END IF;

        -- If belief_id changed in UPDATE, recalculate old belief too
        IF TG_OP = 'UPDATE' AND OLD.belief_id IS DISTINCT FROM NEW.belief_id AND OLD.belief_id IS NOT NULL THEN
            UPDATE practice_beliefs
            SET duration_days = recalculate_belief_duration(OLD.belief_id)
            WHERE id = OLD.belief_id;
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Drop and Recreate Trigger
-- ============================================
DROP TRIGGER IF EXISTS action_duration_change ON bold_takes;

CREATE TRIGGER action_duration_change
AFTER INSERT OR UPDATE OR DELETE ON bold_takes
FOR EACH ROW
EXECUTE FUNCTION update_belief_duration_trigger();

-- ============================================
-- Recalculate All Existing Belief Durations
-- ============================================
UPDATE practice_beliefs
SET duration_days = recalculate_belief_duration(id)
WHERE id IN (
    SELECT DISTINCT belief_id FROM bold_takes WHERE belief_id IS NOT NULL
);

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION recalculate_belief_duration IS 'Auto-calculates belief duration as sum of linked action durations';
COMMENT ON FUNCTION update_belief_duration_trigger IS 'Trigger to auto-update belief duration when actions change';
