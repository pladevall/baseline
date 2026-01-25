-- Bold Practice - Original Goals Migration
-- Insert the exact 9 goals from the original Bold Practice app

INSERT INTO practice_goals (name, category, target_value, current_value, unit, quarter, deadline)
VALUES
  -- Financial Goals
  ('Monthly Recurring Revenue', 'Financial', 10000, 0, '$/month', 'Q4 2026', '2026-12-31'),
  ('Managed Customers', 'Financial', 5, 0, 'customers', 'Q4 2026', '2026-12-31'),
  ('Revenue from Software', 'Financial', 50000, 0, '$', 'Q4 2026', '2026-12-31'),
  
  -- Product Goals
  ('Products Launched', 'Product', 3, 0, 'products', 'Q4 2026', '2026-12-31'),
  ('Active Users', 'Product', 1000, 0, 'users', 'Q4 2026', '2026-12-31'),
  
  -- Growth Goals
  ('Outbound Emails Sent', 'Growth', 500, 0, 'emails', 'Q2 2026', '2026-06-30'),
  ('Sales Calls Completed', 'Growth', 100, 0, 'calls', 'Q4 2026', '2026-12-31'),
  
  -- Personal Goals
  ('Bold Risks Taken', 'Personal', 365, 0, 'risks', 'Q4 2026', '2026-12-31'),
  ('Practice Streak (Longest)', 'Personal', 100, 0, 'days', 'Q4 2026', '2026-12-31')
ON CONFLICT DO NOTHING;
