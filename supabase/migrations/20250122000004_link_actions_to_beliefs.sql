-- Link existing actions to beliefs via belief_id
-- This establishes the parent-child relationship for nested display

-- ============================================
-- Link "Index (Startup)" bet actions to beliefs
-- ============================================

-- Link "Ship prototype" action to "AI agents" belief
UPDATE bold_takes
SET belief_id = (
  SELECT id FROM practice_beliefs
  WHERE bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)')
  AND belief LIKE 'AI agents will replace%'
  LIMIT 1
)
WHERE description = 'Ship first agent prototype to 5 beta users'
  AND bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)');

-- Link "Get paying customer" action to "AI agents" belief
UPDATE bold_takes
SET belief_id = (
  SELECT id FROM practice_beliefs
  WHERE bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)')
  AND belief LIKE 'AI agents will replace%'
  LIMIT 1
)
WHERE description = 'Get first paying customer ($500/mo)'
  AND bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)');

-- Link "Twitter threads" action to "Building in public" belief
UPDATE bold_takes
SET belief_id = (
  SELECT id FROM practice_beliefs
  WHERE bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)')
  AND belief LIKE 'Building in public%'
  LIMIT 1
)
WHERE description = 'Publish 10 Twitter threads on agent automation learnings'
  AND bet_id = (SELECT id FROM bets WHERE name = 'Index (Startup)');

-- ============================================
-- Link "High-Conviction Investments" bet actions to beliefs
-- ============================================

-- Link "Research DeFi" action to "Crypto infrastructure" belief
UPDATE bold_takes
SET belief_id = (
  SELECT id FROM practice_beliefs
  WHERE bet_id = (SELECT id FROM bets WHERE name = 'High-Conviction Investments')
  AND belief LIKE 'Crypto infrastructure%'
  LIMIT 1
)
WHERE description = 'Research top 20 DeFi protocols by TVL'
  AND bet_id = (SELECT id FROM bets WHERE name = 'High-Conviction Investments');

-- Link "Deploy $10k" action to "Crypto infrastructure" belief
UPDATE bold_takes
SET belief_id = (
  SELECT id FROM practice_beliefs
  WHERE bet_id = (SELECT id FROM bets WHERE name = 'High-Conviction Investments')
  AND belief LIKE 'Crypto infrastructure%'
  LIMIT 1
)
WHERE description = 'Deploy $10k into highest conviction position'
  AND bet_id = (SELECT id FROM bets WHERE name = 'High-Conviction Investments');
