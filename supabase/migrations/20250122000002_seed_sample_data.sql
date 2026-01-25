-- Seed sample beliefs and actions with duration data and downside values

-- ============================================
-- Update downside values for existing bets
-- ============================================
UPDATE bets SET downside = 1500000 WHERE name = 'Index (Startup)';  -- $1.5M (5 years × $300k salary)
UPDATE bets SET downside = 100000 WHERE name = 'High-Conviction Investments';  -- $100k capital at risk
UPDATE bets SET downside = 0 WHERE name = 'Salary / Career Hedge';  -- No downside, pure hedge

-- ============================================
-- Sample Beliefs for "Index (Startup)" bet
-- ============================================
INSERT INTO practice_beliefs (belief, status, bet_id, duration_days, created_at) VALUES
(
  'AI agents will replace 90% of sales/customer success work within 5 years',
  'testing',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  90,
  NOW()
),
(
  'Building in public creates unfair advantages in distribution',
  'proven',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  0,
  NOW()
),
(
  'Venture-scale outcomes require 10x better product, not 10% better',
  'untested',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  60,
  NOW()
);

-- ============================================
-- Sample Actions for "Index (Startup)" bet
-- ============================================
INSERT INTO bold_takes (description, status, bet_id, duration_days, date, fear) VALUES
(
  'Ship first agent prototype to 5 beta users',
  'committed',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  30,
  CURRENT_DATE,
  'The product won''t be good enough and they''ll churn immediately'
),
(
  'Get first paying customer ($500/mo)',
  'committed',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  45,
  CURRENT_DATE,
  'No one will pay for an unproven product'
),
(
  'Publish 10 Twitter threads on agent automation learnings',
  'done',
  (SELECT id FROM bets WHERE name = 'Index (Startup)'),
  20,
  CURRENT_DATE - INTERVAL '10 days',
  NULL
);

-- ============================================
-- Sample Beliefs for "High-Conviction Investments" bet
-- ============================================
INSERT INTO practice_beliefs (belief, status, bet_id, duration_days, created_at) VALUES
(
  'Crypto infrastructure plays will outperform consumer apps 10:1',
  'testing',
  (SELECT id FROM bets WHERE name = 'High-Conviction Investments'),
  180,
  NOW()
),
(
  'Market timing beats asset selection for 80% of returns',
  'disproven',
  (SELECT id FROM bets WHERE name = 'High-Conviction Investments'),
  0,
  NOW()
);

-- ============================================
-- Sample Actions for "High-Conviction Investments" bet
-- ============================================
INSERT INTO bold_takes (description, status, bet_id, duration_days, date) VALUES
(
  'Research top 20 DeFi protocols by TVL',
  'done',
  (SELECT id FROM bets WHERE name = 'High-Conviction Investments'),
  7,
  CURRENT_DATE - INTERVAL '5 days'
),
(
  'Deploy $10k into highest conviction position',
  'committed',
  (SELECT id FROM bets WHERE name = 'High-Conviction Investments'),
  14,
  CURRENT_DATE
);

-- ============================================
-- Sample Actions for "Salary / Career Hedge" bet
-- ============================================
INSERT INTO bold_takes (description, status, bet_id, duration_days, date) VALUES
(
  'Update LinkedIn profile and resume',
  'skipped',
  (SELECT id FROM bets WHERE name = 'Salary / Career Hedge'),
  3,
  CURRENT_DATE - INTERVAL '30 days'
);
