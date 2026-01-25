-- Add confidence fields to beliefs and actions
-- Confidence is 0-100 scale indicating likelihood of success

-- ============================================
-- Add confidence to practice_beliefs
-- ============================================
ALTER TABLE practice_beliefs ADD COLUMN confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100);

-- ============================================
-- Add confidence to bold_takes
-- ============================================
ALTER TABLE bold_takes ADD COLUMN confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100);

-- ============================================
-- Initialize confidence based on status
-- ============================================
-- Beliefs: proven=90%, testing=60%, untested/disproven=50%
UPDATE practice_beliefs SET confidence =
  CASE
    WHEN status = 'proven' THEN 90
    WHEN status = 'testing' THEN 60
    WHEN status = 'disproven' THEN 10
    ELSE 50
  END
WHERE confidence = 50;

-- Actions: done=80%, committed=60%, skipped=20%
UPDATE bold_takes SET confidence =
  CASE
    WHEN status = 'done' THEN 80
    WHEN status = 'committed' THEN 60
    WHEN status = 'skipped' THEN 20
    ELSE 50
  END
WHERE confidence = 50;

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN practice_beliefs.confidence IS 'Confidence level 0-100% that this belief will prove true';
COMMENT ON COLUMN bold_takes.confidence IS 'Confidence level 0-100% that this action will succeed';
