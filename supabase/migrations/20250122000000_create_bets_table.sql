-- Create bets table for strategic bets tracking
-- Bets are the parent container for Beliefs and Actions (Bold Takes)

-- ============================================
-- Bets table (Strategic Wagers)
-- ============================================
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g., "Index (Startup)"
  description TEXT,

  -- Sizing Factors
  upside TEXT NOT NULL,                  -- e.g., "Moonshot (100x+)"
  upside_multiplier NUMERIC,             -- e.g., 100
  probability INTEGER,                   -- 0-100%
  downside TEXT,                         -- What you lose if wrong
  timeline TEXT,                         -- e.g., "5-7 Years"
  conviction INTEGER CHECK (conviction BETWEEN 1 AND 10),

  -- Computed/Display
  bet_score NUMERIC,                     -- Calculated ranking score

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Add bet_id to existing tables
-- ============================================
ALTER TABLE bold_takes ADD COLUMN bet_id UUID REFERENCES bets(id);
ALTER TABLE practice_beliefs ADD COLUMN bet_id UUID REFERENCES bets(id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Permissive policy (single user for now)
-- ============================================
CREATE POLICY "Allow all bets" ON bets FOR ALL USING (true);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_score ON bets(bet_score DESC NULLS LAST);
CREATE INDEX idx_bold_takes_bet_id ON bold_takes(bet_id);
CREATE INDEX idx_practice_beliefs_bet_id ON practice_beliefs(bet_id);

-- ============================================
-- Seed default bets
-- Score formula: (upside_multiplier * probability/100) / timeline_years
-- ============================================
INSERT INTO bets (name, description, upside, upside_multiplier, probability, downside, timeline, conviction, status, bet_score) VALUES
(
  'Index (Startup)',
  'Building an outside outcome company through AI agent automation.',
  'Moonshot (100x+)',
  100,
  25,
  'Opportunity cost: ~$300k/yr salary for 5 years',
  '5-7 Years',
  9,
  'active',
  4.17  -- (100 * 0.25) / 6
),
(
  'High-Conviction Investments',
  'Concentrated bets on undervalued assets with massive asymmetry.',
  'Outsized (50x)',
  50,
  20,
  'Capital at risk: current portfolio value',
  '3-10 Years',
  8,
  'active',
  1.54  -- (50 * 0.20) / 6.5
),
(
  'Salary / Career Hedge',
  'The safety net. Employment yields predictable but linear wealth.',
  'Linear (1-2x)',
  1.5,
  95,
  'Capped upside, time opportunity cost',
  'Ongoing',
  4,
  'paused',
  0.14  -- (1.5 * 0.95) / 10
);
