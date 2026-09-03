-- ============================================================================
-- Itemized payroll components (allowances & deductions) — one-time migration.
-- URA Security System — adapted from the TPFCS/Bandari version for this
-- system's dual-reference person model.
--
-- IMPORTANT TYPE NOTE: unlike TPFCS (whose users.id is signed int(11)), this
-- system's users.user_id and security_guards.guard_id are both
-- int(10) UNSIGNED — confirmed directly against ura_security.sql. All FK
-- columns below use INT UNSIGNED to match exactly, or CREATE TABLE will
-- fail with errno 150 (foreign key type mismatch) exactly like the TPFCS
-- migration did before that fix.
--
-- Design:
--   - hr_payroll_components: admin-configurable catalog (e.g. "House Rent
--     Allowance", "EPF") — person-agnostic, same shape as TPFCS's version,
--     no dual-reference needed since it's just definitions, not tied to a
--     specific person.
--   - hr_employee_payroll_components: which components apply to which
--     PERSON (user OR guard) and at what value — set individually, no
--     inheritance from salary scale. Uses the exact same dual-reference +
--     CHECK-constraint pattern as hr_salary_assignments/hr_payroll, since a
--     person here is either a `users` row or a `security_guards` row, never
--     both.
--   - hr_payroll_line_items: a FROZEN snapshot of each component's computed
--     amount at the moment a given month's payroll is generated, against
--     hr_payroll.id (aliased as payroll_id in fetchGeneratedPayrolls'
--     UNION query — the frontend refers to it as payroll.payroll_id, not
--     payroll.id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_payroll_components (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150)   NOT NULL,
  type            ENUM('earning','deduction') NOT NULL,
  calc_method     ENUM('fixed','percent_of_basic') NOT NULL DEFAULT 'fixed',
  default_value   DECIMAL(15,2)  NOT NULL DEFAULT 0 COMMENT 'TSH amount if fixed, or percentage (e.g. 5 = 5%) if percent_of_basic',
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by      INT UNSIGNED       NULL,   -- users.user_id
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_employee_payroll_components (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED       NULL,   -- -> users.user_id
  guard_id        INT UNSIGNED       NULL,   -- -> security_guards.guard_id
  component_id    INT UNSIGNED   NOT NULL,
  value           DECIMAL(15,2)  NOT NULL DEFAULT 0 COMMENT 'Overrides the component default for this specific person — fixed TSH or percent, matching the component''s calc_method',
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  assigned_by     INT UNSIGNED       NULL,   -- users.user_id
  assigned_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_epc_user  (user_id, component_id),
  UNIQUE KEY uq_hr_epc_guard (guard_id, component_id),
  KEY idx_hr_epc_component (component_id),
  FOREIGN KEY (user_id)      REFERENCES users(user_id)              ON DELETE CASCADE,
  FOREIGN KEY (guard_id)     REFERENCES security_guards(guard_id)   ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES hr_payroll_components(id)   ON DELETE CASCADE,
  FOREIGN KEY (assigned_by)  REFERENCES users(user_id)              ON DELETE SET NULL,
  CONSTRAINT chk_hr_epc_one_person CHECK (
    (user_id IS NOT NULL AND guard_id IS NULL) OR
    (user_id IS NULL AND guard_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hr_payroll_line_items (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payroll_id      INT UNSIGNED   NOT NULL,   -- -> hr_payroll.id
  component_id    INT UNSIGNED       NULL COMMENT 'Reference only — name/type/amount below are snapshotted so historical slips stay accurate even if the component is later renamed/removed',
  name            VARCHAR(150)   NOT NULL,
  type            ENUM('earning','deduction') NOT NULL,
  calc_method     ENUM('fixed','percent_of_basic') NOT NULL,
  rate_value      DECIMAL(15,2)  NOT NULL COMMENT 'The raw fixed/percent value used at generation time',
  amount          DECIMAL(15,2)  NOT NULL COMMENT 'The actual computed TSH amount for this payroll',
  sort_order      SMALLINT       NOT NULL DEFAULT 0,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hr_payroll_line_items_payroll (payroll_id),
  FOREIGN KEY (payroll_id) REFERENCES hr_payroll(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
