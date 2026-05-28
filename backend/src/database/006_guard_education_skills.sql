-- ============================================================
-- Ura Security – Migration 006
-- Guard Education & Skills (one-to-many)
-- ============================================================

-- ── Education levels lookup ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education_levels (
  level_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO education_levels (name) VALUES
  ('Primary School'),
  ('Secondary School (O-Level)'),
  ('High School (A-Level)'),
  ('Certificate'),
  ('Diploma'),
  ('Bachelor\'s Degree'),
  ('Postgraduate Diploma'),
  ('Master\'s Degree'),
  ('PhD / Doctorate'),
  ('Professional Certification'),
  ('Vocational Training');

-- ── Guard Education ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guard_education (
  education_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guard_id         INT UNSIGNED  NOT NULL,
  level            VARCHAR(100)  NOT NULL,
  institution_name VARCHAR(200)  NOT NULL,
  year_completed   YEAR          NULL,
  attachment_url   VARCHAR(500)  NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_edu_guard FOREIGN KEY (guard_id) REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  INDEX idx_edu_guard (guard_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Guard Skills / Certifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guard_skills (
  skill_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guard_id       INT UNSIGNED  NOT NULL,
  skill_name     VARCHAR(200)  NOT NULL,
  skill_level    ENUM('beginner','intermediate','advanced','expert') NULL,
  attachment_url VARCHAR(500)  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_skill_guard FOREIGN KEY (guard_id) REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  INDEX idx_skill_guard (guard_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
