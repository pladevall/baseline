-- Remove Personal bet and seed Investments belief/actions

-- Delete Personal bet and any linked data
DELETE FROM bold_takes
WHERE bet_id IN (SELECT id FROM bets WHERE name = 'Personal');

DELETE FROM practice_beliefs
WHERE bet_id IN (SELECT id FROM bets WHERE name = 'Personal');

DELETE FROM bets
WHERE name = 'Personal';

-- Ensure Investments belief exists
WITH investments_bet AS (
    SELECT id FROM bets WHERE name = 'Investments' LIMIT 1
),
inserted_belief AS (
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
        investments_bet.id,
        'Investing Scout money to build track record',
        'testing'::text,
        70,
        NULL,
        0,
        NOW(),
        NOW()
    FROM investments_bet
    WHERE NOT EXISTS (
        SELECT 1
        FROM practice_beliefs
        WHERE bet_id = investments_bet.id
          AND belief = 'Investing Scout money to build track record'
    )
    RETURNING id
),
belief_target AS (
    SELECT id FROM inserted_belief
    UNION ALL
    SELECT pb.id
    FROM practice_beliefs pb, investments_bet
    WHERE pb.bet_id = investments_bet.id
      AND pb.belief = 'Investing Scout money to build track record'
    LIMIT 1
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
    investments_bet.id,
    belief_target.id,
    CURRENT_DATE,
    action_description,
    'committed'::text,
    70,
    30,
    NULL,
    NULL,
    NULL,
    NOW()
FROM investments_bet, belief_target,
(VALUES
    ('Invest in Company A'),
    ('Invest in Company B'),
    ('Invest in Company C')
) AS actions(action_description)
WHERE NOT EXISTS (
    SELECT 1
    FROM bold_takes
    WHERE bet_id = investments_bet.id
      AND description = action_description
);

-- Recalculate confidence for Investments bet
SELECT recalculate_bet_confidence((SELECT id FROM bets WHERE name = 'Investments' LIMIT 1));
