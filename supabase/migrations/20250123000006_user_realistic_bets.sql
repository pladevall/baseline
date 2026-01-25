-- Populate realistic seed data with user's actual bets
-- Clears existing sample bets and replaces with real business opportunities

-- ============================================
-- Delete existing sample bets and related data
-- ============================================
DELETE FROM bold_takes WHERE bet_id IN (SELECT id FROM bets);
DELETE FROM practice_beliefs WHERE bet_id IN (SELECT id FROM bets);
DELETE FROM bets;

-- ============================================
-- BET #1: Systematic Outbound Revenue Machine
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
    'Systematic Outbound Revenue Machine',
    'Create a scalable, data-driven outbound sales engine combining AI automation (Claude Code + Typefully/Ordinal integration), systematic lead generation, and optimized conversion funnels to generate 200+ qualified meetings and close 40 customers at $5k/month within 2026.',
    'Strong (10x)',
    10,
    50,  -- Will be auto-calculated from beliefs/actions
    'active',
    NOW(),
    NOW()
) RETURNING id AS bet1_id;

-- Get Bet #1 ID for foreign key references
WITH bet1 AS (
    SELECT id FROM bets WHERE name = 'Systematic Outbound Revenue Machine' LIMIT 1
)

-- Beliefs for Bet #1
INSERT INTO practice_beliefs (
    bet_id,
    belief,
    status,
    confidence,
    evidence,
    duration_days,
    created_at,
    updated_at
)
SELECT
    bet1.id,
    belief,
    status,
    confidence,
    NULL,
    duration_days,
    NOW(),
    NOW()
FROM bet1, (VALUES
    ('AI-powered personalization at scale beats manual outreach', 'testing'::text, 75, 0),
    ('Data platform buyers respond to technical depth + practical use cases', 'testing'::text, 80, 0),
    ('5% meeting-to-customer conversion is achievable with proper qualification', 'untested'::text, 60, 0)
) AS beliefs(belief, status, confidence, duration_days);

-- Actions for Bet #1
WITH bet1 AS (
    SELECT id FROM bets WHERE name = 'Systematic Outbound Revenue Machine' LIMIT 1
),
beliefs_map AS (
    SELECT
        pb.id as belief_id,
        pb.belief,
        ROW_NUMBER() OVER (ORDER BY pb.created_at) as belief_num
    FROM practice_beliefs pb, bet1
    WHERE pb.bet_id = bet1.id
)
INSERT INTO bold_takes (
    bet_id,
    belief_id,
    date,
    description,
    status,
    confidence,
    duration_days,
    fear,
    outcome,
    learning,
    created_at
)
SELECT
    bet1.id,
    CASE
        WHEN action_num = 1 THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 1)
        WHEN action_num = 2 THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 2)
        WHEN action_num IN (3, 4, 5) THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 3)
        ELSE NULL
    END,
    CURRENT_DATE,
    description,
    status,
    confidence,
    duration_days,
    NULL,
    NULL,
    NULL,
    NOW()
FROM bet1, (VALUES
    (1, 'Ship automated LinkedIn content pipeline (Claude Code + Typefully)', 'committed'::text, 85, 7),
    (2, 'Build 1,000+ qualified lead database with enrichment (Ordinal + manual research)', 'committed'::text, 90, 30),
    (3, 'Create 3 proven outbound sequences (connection → demo → close) with A/B testing', 'committed'::text, 70, 45),
    (4, 'Execute 200 customer meetings with systematic CRM tracking', 'committed'::text, 75, 180),
    (5, 'Generate 10 customer case studies/testimonials for social proof', 'committed'::text, 80, 90)
) AS actions(action_num, description, status, confidence, duration_days);

-- ============================================
-- BET #2: AI-Native Analytics Product Moat
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
    'AI-Native Analytics Product Moat',
    'Build AI agents directly into Index that eliminate manual data work (SQL writing, dashboard creation, insight generation) to create defensible differentiation and 10x faster time-to-insight vs. traditional BI tools.',
    'Outsized (50x)',
    50,
    50,  -- Will be auto-calculated from beliefs/actions
    'active',
    NOW(),
    NOW()
) RETURNING id AS bet2_id;

-- Get Bet #2 ID for foreign key references
WITH bet2 AS (
    SELECT id FROM bets WHERE name = 'AI-Native Analytics Product Moat' LIMIT 1
)

-- Beliefs for Bet #2
INSERT INTO practice_beliefs (
    bet_id,
    belief,
    status,
    confidence,
    evidence,
    duration_days,
    created_at,
    updated_at
)
SELECT
    bet2.id,
    belief,
    status,
    confidence,
    NULL,
    duration_days,
    NOW(),
    NOW()
FROM bet2, (VALUES
    ('AI agents will replace 90% of manual BI work within 3 years', 'testing'::text, 60, 0),
    ('Natural language → insight is the new UX paradigm for analytics', 'testing'::text, 70, 0),
    ('First-mover advantage in "AI analytics" category compounds exponentially', 'untested'::text, 55, 0)
) AS beliefs(belief, status, confidence, duration_days);

-- Actions for Bet #2
WITH bet2 AS (
    SELECT id FROM bets WHERE name = 'AI-Native Analytics Product Moat' LIMIT 1
),
beliefs_map AS (
    SELECT
        pb.id as belief_id,
        pb.belief,
        ROW_NUMBER() OVER (ORDER BY pb.created_at) as belief_num
    FROM practice_beliefs pb, bet2
    WHERE pb.bet_id = bet2.id
)
INSERT INTO bold_takes (
    bet_id,
    belief_id,
    date,
    description,
    status,
    confidence,
    duration_days,
    fear,
    outcome,
    learning,
    created_at
)
SELECT
    bet2.id,
    CASE
        WHEN action_num = 1 THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 1)
        WHEN action_num IN (2, 4) THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 2)
        WHEN action_num IN (3, 5) THEN (SELECT belief_id FROM beliefs_map WHERE belief_num = 3)
        ELSE NULL
    END,
    CURRENT_DATE,
    description,
    status,
    confidence,
    duration_days,
    NULL,
    NULL,
    NULL,
    NOW()
FROM bet2, (VALUES
    (1, 'Ship AI query assistant that writes SQL from natural language', 'committed'::text, 60, 30),
    (2, 'Deploy first agent prototype to 5 beta users with feedback loop', 'committed'::text, 60, 30),
    (3, 'Create "AI analytics" category content (10 Twitter threads, 3 blog posts)', 'committed'::text, 80, 60),
    (4, 'Build public demo showing 10x speed advantage over Looker/Tableau', 'committed'::text, 70, 45),
    (5, 'Generate industry report positioning Index as AI analytics leader', 'done'::text, 90, 30)
) AS actions(action_num, description, status, confidence, duration_days);

-- ============================================
-- Trigger confidence recalculation for both bets
-- ============================================
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'Systematic Outbound Revenue Machine' LIMIT 1));
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'AI-Native Analytics Product Moat' LIMIT 1));

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE bets IS 'Strategic bets with realistic business opportunities';
