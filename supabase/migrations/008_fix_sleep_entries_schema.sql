-- Ensure all columns exist in sleep_entries
-- This fixes cases where the table was created with an incorrect or outdated schema

ALTER TABLE sleep_entries 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS sleep_score INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS duration_score INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS bedtime_score INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS interruption_score INTEGER DEFAULT 0 NOT NULL;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload config';
