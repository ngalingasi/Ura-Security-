-- ============================================================
-- Ura Security – Migration 003
-- Clients, Post Sites, Security Guards, Assignments
--
-- Run order:
--   001_migration.sql        (users, tokens, otp)
--   002_skills_table.sql     (skills, user_skills)
--   003_clients_security.sql ← this file
--   004_seeder.sql           (sample data / lookups)
-- ============================================================

-- ── Regions lookup ────────────────────────────────────────────────────────────
CREATE TABLE  regions (
  region_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Service types lookup ──────────────────────────────────────────────────────
CREATE TABLE  service_types (
  type_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Clients ───────────────────────────────────────────────────────────────────
CREATE TABLE  clients (
  client_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(200)  NOT NULL,
  contact_person     VARCHAR(200)  NOT NULL,
  email              VARCHAR(200)  NULL,
  phone              VARCHAR(30)   NOT NULL,
  address            TEXT          NULL,
  region             VARCHAR(100)  NOT NULL,
  contract_number    VARCHAR(100)  NULL UNIQUE,
  service_type       VARCHAR(100)  NOT NULL,
  guards_required    INT UNSIGNED  NOT NULL DEFAULT 1,
  contract_start     DATE          NOT NULL,
  contract_end       DATE          NULL,
  emergency_name     VARCHAR(200)  NULL,
  emergency_phone    VARCHAR(30)   NULL,
  emergency_relation VARCHAR(100)  NULL,
  status             ENUM('active','inactive','pending','expired')
                     NOT NULL DEFAULT 'active',
  notes              TEXT          NULL,
  created_by         INT UNSIGNED  NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_client_status  (status),
  INDEX idx_client_region  (region),
  INDEX idx_client_service (service_type),
  FULLTEXT idx_client_search (name, contact_person, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Post Sites ────────────────────────────────────────────────────────────────
CREATE TABLE  post_sites (
  site_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id        INT UNSIGNED  NOT NULL,
  name             VARCHAR(200)  NOT NULL,
  location         VARCHAR(300)  NOT NULL,
  guards_required  INT UNSIGNED  NOT NULL DEFAULT 1,
  shift_details    VARCHAR(200)  NULL,
  supervisor_name  VARCHAR(200)  NULL,
  risk_level       ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  instructions     TEXT          NULL,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by       INT UNSIGNED  NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_site_client  FOREIGN KEY (client_id)  REFERENCES clients(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_site_creator FOREIGN KEY (created_by) REFERENCES users(user_id)    ON DELETE SET NULL,
  INDEX idx_site_client (client_id),
  INDEX idx_site_status (status),
  INDEX idx_site_risk   (risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Security Guards ───────────────────────────────────────────────────────────
CREATE TABLE  security_guards (
  guard_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name          VARCHAR(200) NOT NULL,
  phone              VARCHAR(30)  NOT NULL,
  email              VARCHAR(200) NULL UNIQUE,
  national_id        VARCHAR(50)  NOT NULL UNIQUE,
  address            TEXT         NULL,
  gender             ENUM('male','female') NOT NULL DEFAULT 'male',
  date_of_birth      DATE         NULL,
  next_of_kin_name   VARCHAR(200) NULL,
  next_of_kin_phone  VARCHAR(30)  NULL,
  next_of_kin_relation VARCHAR(100) NULL,
  emergency_contact  VARCHAR(30)  NULL,
  employment_date    DATE         NULL,
  photo_url          VARCHAR(500) NULL,
  documents_url      VARCHAR(500) NULL,
  guard_status       ENUM('active','inactive','suspended','on_leave')
                     NOT NULL DEFAULT 'active',
  notes              TEXT         NULL,
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_guard_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_guard_status  (guard_status),
  INDEX idx_guard_gender  (gender),
  FULLTEXT idx_guard_search (full_name, phone, national_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Guard Assignments ─────────────────────────────────────────────────────────
-- One guard can be assigned to one active site at a time (enforced at app level)
CREATE TABLE  guard_assignments (
  assignment_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guard_id       INT UNSIGNED NOT NULL,
  client_id      INT UNSIGNED NOT NULL,
  site_id        INT UNSIGNED NOT NULL,
  shift          VARCHAR(100) NOT NULL,
  start_date     DATE         NOT NULL,
  end_date       DATE         NULL,
  notes          TEXT         NULL,
  status         ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  created_by     INT UNSIGNED NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assign_guard   FOREIGN KEY (guard_id)   REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_client  FOREIGN KEY (client_id)  REFERENCES clients(client_id)        ON DELETE CASCADE,
  CONSTRAINT fk_assign_site    FOREIGN KEY (site_id)    REFERENCES post_sites(site_id)        ON DELETE CASCADE,
  CONSTRAINT fk_assign_creator FOREIGN KEY (created_by) REFERENCES users(user_id)             ON DELETE SET NULL,
  INDEX idx_assign_guard  (guard_id),
  INDEX idx_assign_site   (site_id),
  INDEX idx_assign_client (client_id),
  INDEX idx_assign_status (status),
  INDEX idx_assign_dates  (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Assignment History (audit log) ───────────────────────────────────────────
-- Immutable record of all assignment changes for full audit trail
CREATE TABLE  assignment_history (
  history_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id  INT UNSIGNED NOT NULL,
  action         ENUM('created','updated','completed','cancelled') NOT NULL,
  changed_by     INT UNSIGNED NULL,
  changed_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes          TEXT         NULL,
  CONSTRAINT fk_hist_assignment FOREIGN KEY (assignment_id) REFERENCES guard_assignments(assignment_id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user       FOREIGN KEY (changed_by)    REFERENCES users(user_id)                   ON DELETE SET NULL,
  INDEX idx_hist_assignment (assignment_id),
  INDEX idx_hist_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
