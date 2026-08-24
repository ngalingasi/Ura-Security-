-- ============================================================================
-- HR & Payroll module — v2 schema (dual-reference design)
-- ============================================================================
-- REVISION NOTE: the first version of this migration created a standalone
-- `hr_employees` table with its own login/role system, parallel to URA's
-- own `users` table. Per direction, that's been dropped. There is no
-- third "employee" identity anymore.
--
-- Instead, every HR/Payroll record (leave application, salary
-- assignment, payroll run, attendance) points at EITHER:
--   - a row in URA's own `users` table (staff who log in), OR
--   - a row in URA's own `security_guards` table (guards — personnel
--     records, no login)
-- via a pair of nullable columns: `user_id` and `guard_id`, with exactly
-- one of the two populated per row. This lets both kinds of people be
-- assigned leave, salary, and attendance without merging or duplicating
-- URA's existing person tables.
--
-- `hr_employment_profiles` is the one new "attach HR info to a person"
-- table — it holds the fields neither `users` nor `security_guards` has
-- (department, designation, title, bank, joining date, contract info),
-- again via the same dual user_id/guard_id reference.
--
-- Role/permissions: URA's existing role enum (viewer/user/manager/admin/
-- super_admin) and `auth()` middleware are used directly — there is no
-- separate HR role/rights table anymore.
--
-- Run this manually against URA's database before deploying the backend
-- code. If you already ran the v1 migration, drop those tables first —
-- see the DROP block at the bottom of this file (commented out; uncomment
-- if migrating from v1).
-- ============================================================================

-- ── Reference data (unchanged from v1) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_departments (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(150) NOT NULL,
  region               VARCHAR(100) NULL,
  created_by           INT UNSIGNED NULL,     -- users.user_id (admin who created it)
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_designations (
  designation_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  designation_name  VARCHAR(150) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_titles (
  title_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title_name  VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_banks (
  bank_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bank_name   VARCHAR(150) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_leave_types (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  days        INT UNSIGNED NOT NULL DEFAULT 0,
  allow_fare  TINYINT(1) DEFAULT 0,
  created_by  INT UNSIGNED NULL,   -- users.user_id
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_salary_scales (
  salary_scale_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scale_name          VARCHAR(100) NOT NULL,
  scale_amount        DECIMAL(14,2) NOT NULL,
  scale_increament    DECIMAL(14,2) NULL,
  created_by          INT UNSIGNED NULL,   -- users.user_id
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Employment profile — the one new "attach HR info to a person" table ────

CREATE TABLE IF NOT EXISTS hr_employment_profiles (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id               INT UNSIGNED NULL,   -- -> users.user_id
  guard_id              INT UNSIGNED NULL,   -- -> security_guards.guard_id
  department_id         INT UNSIGNED NULL,
  designation_id        INT UNSIGNED NULL,
  title_id              INT UNSIGNED NULL,
  bank_id               INT UNSIGNED NULL,
  bank_acc              VARCHAR(50)  NULL,
  pf_number             VARCHAR(50)  NULL,
  joining_date          DATE NULL,
  contract_types        VARCHAR(50)  NULL,
  contract_start_date   DATE NULL,
  contract_end_date     DATE NULL,
  created_by            INT UNSIGNED NULL,   -- users.user_id (who set this up)
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_employment_user  (user_id),
  UNIQUE KEY uq_hr_employment_guard (guard_id),
  KEY idx_hr_employment_department (department_id),
  FOREIGN KEY (user_id)    REFERENCES users(user_id)                   ON DELETE CASCADE,
  FOREIGN KEY (guard_id)   REFERENCES security_guards(guard_id)        ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id)                   ON DELETE SET NULL,
  CONSTRAINT chk_hr_employment_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
  -- department_id/designation_id/title_id/bank_id are deliberately NOT
  -- foreign keys — see PORT_NOTES.md "schema safety" section: the ported
  -- write path never existence-checks these dropdown-selected IDs, and
  -- an FK here would reject writes the original app would have accepted.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- NOTE: the CHECK constraint above is enforced on MySQL 8.0.16+ / MariaDB
-- 10.2+. On older versions it's silently ignored — the application layer
-- (employment.model.js) enforces the same rule regardless.

-- ── Attendance ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_attendance (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NULL,   -- -> users.user_id
  guard_id          INT UNSIGNED NULL,   -- -> security_guards.guard_id
  vendor_number     VARCHAR(50) NULL,
  attendance_date   DATE NOT NULL,
  in_time           TIME NULL,
  in_method         VARCHAR(20) DEFAULT 'manual',
  out_time          TIME NULL,
  out_method        VARCHAR(20) DEFAULT 'manual',
  created_by        INT UNSIGNED NULL,   -- users.user_id
  modified_by       INT UNSIGNED NULL,   -- users.user_id
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hr_attendance_date (attendance_date),
  FOREIGN KEY (user_id)     REFERENCES users(user_id)            ON DELETE CASCADE,
  FOREIGN KEY (guard_id)    REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)  REFERENCES users(user_id)            ON DELETE SET NULL,
  FOREIGN KEY (modified_by) REFERENCES users(user_id)            ON DELETE SET NULL,
  CONSTRAINT chk_hr_attendance_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Leaves ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_leave_applications (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                     INT UNSIGNED NULL,   -- -> users.user_id
  guard_id                    INT UNSIGNED NULL,   -- -> security_guards.guard_id
  leave_type_id               INT UNSIGNED NULL,
  start_date                  DATE NOT NULL,
  end_date                    DATE NOT NULL,
  leave_days                  INT UNSIGNED NULL,
  reason                      VARCHAR(500) NULL,
  region_id                   VARCHAR(20)  NULL,
  region_name                 VARCHAR(100) NULL,
  district_id                 VARCHAR(20)  NULL,
  district_name               VARCHAR(100) NULL,
  village                     VARCHAR(150) NULL,
  fare_region_to_region       DECIMAL(12,2) DEFAULT 0,
  fare_district_to_village    DECIMAL(12,2) DEFAULT 0,
  fare_miscellaneous          DECIMAL(12,2) DEFAULT 0,
  total_fare                  DECIMAL(12,2) DEFAULT 0,
  status                      VARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected|cancelled
  rejection_reason            VARCHAR(500) NULL,
  approved_by                 INT UNSIGNED NULL,   -- users.user_id (always a URA user — guards don't approve)
  approved_at                 TIMESTAMP NULL,
  created_by                  INT UNSIGNED NULL,   -- users.user_id — who submitted this (self, or HR on a guard's behalf)
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by                  INT UNSIGNED NULL,   -- users.user_id
  deleted_at                  TIMESTAMP NULL,
  KEY idx_hr_leave_apps_status (status),
  KEY idx_hr_leave_apps_leave_type (leave_type_id),
  FOREIGN KEY (user_id)      REFERENCES users(user_id)            ON DELETE CASCADE,
  FOREIGN KEY (guard_id)     REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by)  REFERENCES users(user_id)            ON DELETE SET NULL,
  FOREIGN KEY (created_by)   REFERENCES users(user_id)            ON DELETE SET NULL,
  FOREIGN KEY (updated_by)   REFERENCES users(user_id)            ON DELETE SET NULL,
  CONSTRAINT chk_hr_leave_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
  -- leave_type_id intentionally not an FK — see hr_employment_profiles note.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_leave_application_relatives (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  leave_application_id        INT UNSIGNED NOT NULL,
  full_name                   VARCHAR(150) NOT NULL,
  relationship                VARCHAR(50)  NULL,
  fare_region_to_region       DECIMAL(12,2) DEFAULT 0,
  fare_district_to_village    DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (leave_application_id) REFERENCES hr_leave_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Payroll ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_salary_assignments (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NULL,   -- -> users.user_id
  guard_id          INT UNSIGNED NULL,   -- -> security_guards.guard_id
  salary_scale_id   INT UNSIGNED NOT NULL,
  salary_amount     DECIMAL(14,2) NOT NULL,
  created_by        INT UNSIGNED NULL,   -- users.user_id
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_salary_assignment_user  (user_id),
  UNIQUE KEY uq_hr_salary_assignment_guard (guard_id),
  KEY idx_hr_salary_assignments_scale (salary_scale_id),
  FOREIGN KEY (user_id)    REFERENCES users(user_id)            ON DELETE CASCADE,
  FOREIGN KEY (guard_id)   REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id)            ON DELETE SET NULL,
  CONSTRAINT chk_hr_salary_assignment_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
  -- salary_scale_id intentionally not an FK — see hr_employment_profiles note.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_payroll (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NULL,   -- -> users.user_id
  guard_id        INT UNSIGNED NULL,   -- -> security_guards.guard_id
  salary_month    DATE NOT NULL,
  gross_salary    DECIMAL(14,2) NOT NULL,
  deductions      DECIMAL(14,2) DEFAULT 0,
  net_salary      DECIMAL(14,2) NOT NULL,
  created_by      INT UNSIGNED NULL,   -- users.user_id
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_payroll_user_month  (user_id, salary_month),
  UNIQUE KEY uq_hr_payroll_guard_month (guard_id, salary_month),
  FOREIGN KEY (user_id)    REFERENCES users(user_id)            ON DELETE CASCADE,
  FOREIGN KEY (guard_id)   REFERENCES security_guards(guard_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id)            ON DELETE SET NULL,
  CONSTRAINT chk_hr_payroll_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- Migrating from the v1 (hr_employees-based) migration? Uncomment and run
-- this first — there's no automatic data migration since v1 was never
-- deployed to production per our conversation.
-- ============================================================================
-- DROP TABLE IF EXISTS hr_employee_attachments;
-- DROP TABLE IF EXISTS hr_employee_children;
-- DROP TABLE IF EXISTS hr_employee_courses;
-- DROP TABLE IF EXISTS hr_employee_experiences;
-- DROP TABLE IF EXISTS hr_employee_nextkins;
-- DROP TABLE IF EXISTS hr_employee_relatives;
-- DROP TABLE IF EXISTS hr_employee_skills;
-- DROP TABLE IF EXISTS hr_employee_educations;
-- DROP TABLE IF EXISTS hr_role_permitted_rights;
-- DROP TABLE IF EXISTS hr_submenus;
-- DROP TABLE IF EXISTS hr_menus;
-- DROP TABLE IF EXISTS hr_employee_salary_scales;
-- DROP TABLE IF EXISTS hr_employees;
-- DROP TABLE IF EXISTS hr_roles;

-- ============================================================================
-- End of HR & Payroll module migration (v2 — dual-reference design).
-- ============================================================================
