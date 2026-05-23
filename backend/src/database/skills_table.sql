-- ============================================================
-- Ura Security – Skills Tables Migration
-- Run this after migration.sql (users table must exist first)
-- ============================================================

-- ── Skills master list ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  skill_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  category   VARCHAR(100) NOT NULL DEFAULT 'General',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_skill_name (name),
  INDEX idx_skill_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── User ↔ Skill junction table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_skills (
  user_id  INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
  CONSTRAINT fk_us_skill FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
