-- Restructure bets from 2 detailed Index-specific bets to 3 top-level category bets:
-- - Index: Contains all current beliefs and actions from the two existing Index bets
-- - Investments: Empty, ready for future bets
-- - Personal: Empty, ready for future bets

-- ============================================
-- BET #1: Create Index category (contains existing Index bet work)
-- ============================================
INSERT INTO bets (
    name,
    description,
    upside,
    upside_multiplier,
    confidence,
    status,
    created_at,
    updated_at
) VALUES (
    'Index',
    'Build Index into a category-defining AI analytics platform through systematic outbound revenue machine and AI-native product differentiation.',
    'Outsized (50x)',
    50,
    50,
    'active',
    NOW(),
    NOW()
);

-- ============================================
-- Link all existing Index beliefs to the new Index bet
-- ============================================
WITH index_bet AS (
    SELECT id FROM bets WHERE name = 'Index' LIMIT 1
),
old_bets AS (
    SELECT id FROM bets
    WHERE name IN (
        'Systematic Outbound Revenue Machine',
        'AI-Native Analytics Product Moat'
    )
)
UPDATE practice_beliefs
SET bet_id = (SELECT id FROM index_bet)
WHERE bet_id IN (SELECT id FROM old_bets);

-- ============================================
-- Link all existing Index actions to the new Index bet
-- ============================================
WITH index_bet AS (
    SELECT id FROM bets WHERE name = 'Index' LIMIT 1
),
old_bets AS (
    SELECT id FROM bets
    WHERE name IN (
        'Systematic Outbound Revenue Machine',
        'AI-Native Analytics Product Moat'
    )
)
UPDATE bold_takes
SET bet_id = (SELECT id FROM index_bet)
WHERE bet_id IN (SELECT id FROM old_bets);

-- ============================================
-- Delete old detailed Index-specific bets
-- ============================================
DELETE FROM bets
WHERE name IN (
    'Systematic Outbound Revenue Machine',
    'AI-Native Analytics Product Moat'
);

-- ============================================
-- BET #2: Investments (Category - empty for now)
-- ============================================
INSERT INTO bets (
    name,
    description,
    upside,
    upside_multiplier,
    confidence,
    status,
    created_at,
    updated_at
) VALUES (
    'Investments',
    'Diversified investment portfolio including index funds, angel investments, and alternative assets.',
    'Moderate (3-5x)',
    4,
    70,
    'active',
    NOW(),
    NOW()
);

-- ============================================
-- BET #3: Personal (Category - empty for now)
-- ============================================
INSERT INTO bets (
    name,
    description,
    upside,
    upside_multiplier,
    confidence,
    status,
    created_at,
    updated_at
) VALUES (
    'Personal',
    'Personal development, health optimization, and relationship building for long-term fulfillment and success.',
    'Linear (1-2x)',
    1.5,
    80,
    'active',
    NOW(),
    NOW()
);

-- ============================================
-- Recalculate confidence for all bets
-- ============================================
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'Index' LIMIT 1));
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'Investments' LIMIT 1));
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'Personal' LIMIT 1));

-- ============================================
-- Update belief durations based on linked actions
-- ============================================
UPDATE practice_beliefs
SET duration_days = recalculate_belief_duration(id)
WHERE bet_id = (SELECT id FROM bets WHERE name = 'Index' LIMIT 1);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE bets IS 'Strategic bets organized as 3 top-level categories: Index, Investments, Personal';
