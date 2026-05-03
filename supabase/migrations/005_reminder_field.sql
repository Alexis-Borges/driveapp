-- ============================================================
-- DriveApp - Migration 005 : champ reminder_sent_at sur lessons
-- ============================================================
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
