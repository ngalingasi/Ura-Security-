-- ============================================================
-- Ura Security – Migration 005
-- Add employee_id and photo_url to security_guards
-- Safe to run multiple times (uses IF NOT EXISTS checks)
-- ============================================================

-- Add employee_id (unique badge/employee number)
ALTER TABLE security_guards
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) NULL UNIQUE AFTER guard_id;

-- photo_url already exists from migration 003 — no change needed.
-- If it was somehow missing, add it:
-- ALTER TABLE security_guards ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) NULL;

-- Index for quick lookup by employee_id
ALTER TABLE security_guards
  ADD INDEX IF NOT EXISTS idx_guard_employee_id (employee_id);
