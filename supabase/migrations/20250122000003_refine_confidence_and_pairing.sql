-- Rename conviction to confidence and change scale from 1-10 to 0-100
-- Add belief_id to bold_takes for linking actions to specific beliefs
-- Update bet descriptions to be money-focused and <50 chars

-- ============================================
-- Update conviction → confidence column
-- ============================================

-- Drop the old constraint first
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_conviction_check;

-- Rename the column
ALTER TABLE bets RENAME COLUMN conviction TO confidence;

-- Update existing data: convert 1-10 scale to 0-100 (multiply by 10)
UPDATE bets SET confidence = confidence * 10;

-- Add new constraint for 0-100 scale
ALTER TABLE bets ADD CONSTRAINT bets_confidence_check CHECK (confidence BETWEEN 0 AND 100);

-- ============================================
-- Add belief_id to bold_takes for pairing
-- ============================================

-- Add belief_id foreign key column
ALTER TABLE bold_takes
ADD COLUMN belief_id UUID REFERENCES practice_beliefs(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX idx_bold_takes_belief_id ON bold_takes(belief_id);

-- ============================================
-- Update bet descriptions to be money-focused and <50 chars
-- ============================================

UPDATE bets SET description = 'Build AI agents to generate $100M ARR'
WHERE name = 'Index (Startup)';

UPDATE bets SET description = 'Deploy $1M to generate $50M returns'
WHERE name = 'High-Conviction Investments';

UPDATE bets SET description = 'Earn $300K/yr for financial stability'
WHERE name = 'Salary / Career Hedge';
