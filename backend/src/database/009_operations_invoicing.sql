-- ============================================================
-- Ura Security – Migration 009
-- Operations: Invoices, Expenses, Payments
--
-- Replicates the Invoice/Expense/Payment capability from the
-- Bandari/Admin system's Operations module (Strategic Partners
-- pattern) — adapted to this codebase's conventions:
--   - No `module` column — Bandari tags rows by which of its 4
--     operational categories they belong to; Ura has just one
--     unified billing context, so that distinction doesn't apply.
--   - Reuses the EXISTING `clients` table directly rather than
--     introducing a parallel op_clients table.
--   - No GePG / control-number columns — that's Bandari/TPFCS's
--     Government Payment Gateway integration, which was still
--     unwired there (TODO placeholders only) and isn't part of
--     this system. Payments here are manual (evidence upload)
--     only.
--   - No reusable catalog-items table — line items are free text,
--     matching what was actually asked for (invoice/expense/
--     payment), not the fuller Bandari feature set.
--
-- Numbering: DDMMYYYY-NN, one shared sequence across invoices and
-- expenses independently (same scheme as Bandari's).
-- ============================================================

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE  op_invoices (
  invoice_id      INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(30)    NOT NULL COMMENT 'DDMMYYYY-NN',
  client_id       INT UNSIGNED   NOT NULL,
  issued_date     DATE           NOT NULL,
  due_date        DATE           NULL,
  status          ENUM('invoiced','approved','paid','cancelled') NOT NULL DEFAULT 'invoiced',
  notes           TEXT           NULL,

  subtotal        DECIMAL(15,2)  NOT NULL DEFAULT 0,

  wht_enabled     TINYINT(1)     NOT NULL DEFAULT 1,
  wht_rate        DECIMAL(5,2)   NOT NULL DEFAULT 5.00,
  wht_amount      DECIMAL(15,2)  NOT NULL DEFAULT 0,

  vat_enabled     TINYINT(1)     NOT NULL DEFAULT 1,
  vat_rate        DECIMAL(5,2)   NOT NULL DEFAULT 18.00,
  vat_amount      DECIMAL(15,2)  NOT NULL DEFAULT 0,

  total_amount    DECIMAL(15,2)  NOT NULL DEFAULT 0 COMMENT 'subtotal + vat_amount - wht_amount',

  approved_by     INT UNSIGNED   NULL,
  approved_at     DATETIME       NULL,
  paid_at         DATETIME       NULL,
  cancelled_by    INT UNSIGNED   NULL,
  cancelled_at    DATETIME       NULL,
  cancellation_reason TEXT       NULL,

  created_by      INT UNSIGNED   NULL,
  updated_by      INT UNSIGNED   NULL,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_op_invoice_number (invoice_number),
  CONSTRAINT fk_op_invoice_client   FOREIGN KEY (client_id)   REFERENCES clients(client_id) ON DELETE RESTRICT,
  CONSTRAINT fk_op_invoice_approver FOREIGN KEY (approved_by) REFERENCES users(user_id)     ON DELETE SET NULL,
  CONSTRAINT fk_op_invoice_creator  FOREIGN KEY (created_by)  REFERENCES users(user_id)     ON DELETE SET NULL,
  INDEX idx_op_invoice_client (client_id),
  INDEX idx_op_invoice_status (status),
  INDEX idx_op_invoice_issued (issued_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Invoice line items ───────────────────────────────────────────────────────
CREATE TABLE  op_invoice_line_items (
  line_id      INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT UNSIGNED  NOT NULL,
  description  TEXT          NOT NULL,
  unit         VARCHAR(50)   NOT NULL DEFAULT 'unit',
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(15,2) NOT NULL DEFAULT 0,
  line_total   DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order   SMALLINT      NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_op_invoice_line_invoice FOREIGN KEY (invoice_id) REFERENCES op_invoices(invoice_id) ON DELETE CASCADE,
  INDEX idx_op_invoice_line_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Invoice payments (manual, evidence-upload only) ──────────────────────────
CREATE TABLE  op_invoice_payments (
  payment_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  invoice_id     INT UNSIGNED  NOT NULL,
  amount         DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_by        INT UNSIGNED  NULL,
  evidence_path  VARCHAR(500)  NULL,
  evidence_name  VARCHAR(200)  NULL,
  notes          TEXT          NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_op_payment_invoice FOREIGN KEY (invoice_id) REFERENCES op_invoices(invoice_id) ON DELETE CASCADE,
  CONSTRAINT fk_op_payment_payer   FOREIGN KEY (paid_by)    REFERENCES users(user_id)          ON DELETE SET NULL,
  INDEX idx_op_payment_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE  op_expenses (
  expense_id      INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  expense_number  VARCHAR(30)   NOT NULL COMMENT 'DDMMYYYY-NN',
  client_id       INT UNSIGNED  NULL COMMENT 'Optional — some expenses are internal, not client-billable',
  expense_date    DATE          NOT NULL,
  notes           TEXT          NULL,
  total_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED  NULL,
  updated_by      INT UNSIGNED  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_op_expense_number (expense_number),
  CONSTRAINT fk_op_expense_client  FOREIGN KEY (client_id)  REFERENCES clients(client_id) ON DELETE SET NULL,
  CONSTRAINT fk_op_expense_creator FOREIGN KEY (created_by) REFERENCES users(user_id)     ON DELETE SET NULL,
  INDEX idx_op_expense_client (client_id),
  INDEX idx_op_expense_date   (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Expense line items ────────────────────────────────────────────────────────
CREATE TABLE  op_expense_line_items (
  line_id      INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  expense_id   INT UNSIGNED  NOT NULL,
  description  TEXT          NOT NULL,
  unit         VARCHAR(50)   NOT NULL DEFAULT 'unit',
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(15,2) NOT NULL DEFAULT 0,
  line_total   DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order   SMALLINT      NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_op_expense_line_expense FOREIGN KEY (expense_id) REFERENCES op_expenses(expense_id) ON DELETE CASCADE,
  INDEX idx_op_expense_line_expense (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
