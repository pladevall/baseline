-- Database functions for confidence rollup and auto-calculation
-- These functions automatically recalculate bet confidence when beliefs/actions change

-- ============================================
-- Function: Recalculate Bet Confidence
-- ============================================
-- Calculates weighted average confidence from beliefs and actions
-- Weighted by duration_days (longer commitments = more weight)
CREATE OR REPLACE FUNCTION recalculate_bet_confidence(bet_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    weighted_sum NUMERIC := 0;
    total_weight INTEGER := 0;
    item_confidence INTEGER;
    item_duration INTEGER;
BEGIN
    -- Sum weighted confidence from beliefs
    FOR item_confidence, item_duration IN
        SELECT confidence, COALESCE(duration_days, 0)
        FROM practice_beliefs
        WHERE bet_id = bet_id_param
    LOOP
        weighted_sum := weighted_sum + (item_confidence * item_duration);
        total_weight := total_weight + item_duration;
    END LOOP;

    -- Sum weighted confidence from actions (bold_takes)
    FOR item_confidence, item_duration IN
        SELECT confidence, COALESCE(duration_days, 30)
        FROM bold_takes
        WHERE bet_id = bet_id_param
    LOOP
        weighted_sum := weighted_sum + (item_confidence * item_duration);
        total_weight := total_weight + item_duration;
    END LOOP;

    -- Return weighted average (or NULL if no items)
    IF total_weight = 0 THEN
        RETURN NULL;
    ELSE
        RETURN ROUND(weighted_sum::NUMERIC / total_weight)::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-update Bet Confidence
-- ============================================
-- Triggered when beliefs change
CREATE OR REPLACE FUNCTION update_bet_confidence_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the bet's computed_confidence when a belief changes
    UPDATE bets
    SET computed_confidence = recalculate_bet_confidence(COALESCE(NEW.bet_id, OLD.bet_id))
    WHERE id = COALESCE(NEW.bet_id, OLD.bet_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS belief_confidence_change ON practice_beliefs;
DROP TRIGGER IF EXISTS action_confidence_change ON bold_takes;

-- Create triggers
CREATE TRIGGER belief_confidence_change
AFTER INSERT OR UPDATE OR DELETE ON practice_beliefs
FOR EACH ROW
EXECUTE FUNCTION update_bet_confidence_trigger();

CREATE TRIGGER action_confidence_change
AFTER INSERT OR UPDATE OR DELETE ON bold_takes
FOR EACH ROW
EXECUTE FUNCTION update_bet_confidence_trigger();

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION recalculate_bet_confidence IS 'Calculates weighted average confidence from beliefs and actions, weighted by duration_days';
COMMENT ON FUNCTION update_bet_confidence_trigger IS 'Automatically updates bet confidence when beliefs or actions change';
