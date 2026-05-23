-- ============================================================
-- Ura Security – Database Migration v2
-- Run in order: migration.sql → skills_table.sql → skills_seeder.sql
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name             VARCHAR(200)  NOT NULL,
  username              VARCHAR(100)  NOT NULL UNIQUE,
  email                 VARCHAR(200)  NULL UNIQUE,
  mobile                VARCHAR(30)   NULL,
  gender                ENUM('male','female') NOT NULL DEFAULT 'male',
  avatar                VARCHAR(500)  NULL,
  password_hash         VARCHAR(255)  NOT NULL,
  role                  ENUM('viewer','user','manager','admin','super_admin') NOT NULL DEFAULT 'user',
  status                ENUM('active','inactive') NOT NULL DEFAULT 'active',
  must_change_password  TINYINT(1)    NOT NULL DEFAULT 1,
  last_password_changed DATETIME      NULL,
  created_by            INT UNSIGNED  NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email    (email),
  INDEX idx_users_username (username),
  INDEX idx_users_role     (role),
  INDEX idx_users_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Auth Tokens (refresh & reset) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(1000) NOT NULL UNIQUE,
  user_id     INT UNSIGNED  NOT NULL,
  type        ENUM('refresh','resetPassword','verifyEmail') NOT NULL,
  expires     DATETIME      NOT NULL,
  blacklisted TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_token_user (user_id),
  INDEX idx_token_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── OTP Verifications ─────────────────────────────────────────────────────────
-- Supports email OTP and SMS OTP (mobile column)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(200) NULL,
  mobile     VARCHAR(30)  NULL,
  otp_code   VARCHAR(10)  NOT NULL,
  expires_at DATETIME     NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email   (email),
  INDEX idx_otp_mobile  (mobile),
  INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed: initial super_admin ─────────────────────────────────────────────────
-- Password: Admin@1234  (bcrypt, cost 12)
-- ⚠ Change immediately after first login!
-- Uncomment and run once:
--
-- INSERT INTO users (full_name, username, email, password_hash, role, status, must_change_password)
-- VALUES (
--   'System Administrator', 'admin', 'admin@ura-security.local',
--   '$2a$12$REPLACE_WITH_REAL_BCRYPT_HASH',
--   'super_admin', 'active', 1
-- ) ON DUPLICATE KEY UPDATE user_id = user_id;
