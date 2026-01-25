-- Add downside override and computed confidence fields to bets
-- downside_override: Manual override for automatic downside calculation
-- computed_confidence: Auto-calculated confidence from beliefs/actions

-- ============================================
-- Add Downside Override Field
-- ============================================
ALTER TABLE bets ADD COLUMN downside_override NUMERIC;

-- ============================================
-- Add Computed Confidence Field
-- ============================================
ALTER TABLE bets ADD COLUMN computed_confidence INTEGER CHECK (computed_confidence BETWEEN 0 AND 100);

-- ============================================
-- Note: Existing downside TEXT values are kept as descriptive text
-- Auto-calculation will compute NUMERIC downside from timeline × annual_salary
-- downside_override can be set manually to override auto-calculated value
-- ============================================

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN bets.downside_override IS 'Manual override for downside calculation (null = auto-calculate as timeline_years × annual_salary)';
COMMENT ON COLUMN bets.computed_confidence IS 'Auto-calculated confidence from weighted average of beliefs/actions (weighted by duration_days)';
