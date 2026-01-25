-- Replace Index beliefs/actions with updated placeholders

WITH index_bet AS (
    SELECT id FROM bets WHERE name = 'Index' LIMIT 1
),
deleted_actions AS (
    DELETE FROM bold_takes
    WHERE bet_id = (SELECT id FROM index_bet)
),
deleted_beliefs AS (
    DELETE FROM practice_beliefs
    WHERE bet_id = (SELECT id FROM index_bet)
),
inserted_beliefs AS (
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
        index_bet.id,
        belief,
        'testing'::text,
        50,
        NULL,
        0,
        NOW(),
        NOW()
    FROM index_bet, (VALUES
        ('Shipping Index Next will drive X'),
        ('Open sourcing Index will drive Y')
    ) AS beliefs(belief)
    RETURNING id, belief
),
beliefs_map AS (
    SELECT id, belief, ROW_NUMBER() OVER (ORDER BY belief) AS belief_num
    FROM inserted_beliefs
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
    index_bet.id,
    CASE
        WHEN action_num = 1 THEN (SELECT id FROM beliefs_map WHERE belief_num = 1)
        WHEN action_num = 2 THEN (SELECT id FROM beliefs_map WHERE belief_num = 2)
        ELSE NULL
    END,
    CURRENT_DATE,
    description,
    'committed'::text,
    50,
    30,
    NULL,
    NULL,
    NULL,
    NOW()
FROM index_bet, (VALUES
    (1, 'Placeholder action A'),
    (2, 'Placeholder action B')
) AS actions(action_num, description);
