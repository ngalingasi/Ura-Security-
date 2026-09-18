-- ============================================================
-- Ura Security – Migration 010
-- Reusable catalog items for Invoice/Expense line items
--
-- A line item can either reference a catalog entry (item_id set,
-- description/unit/price pre-filled from it but still stored on
-- the line itself and editable) or be pure free text (item_id
-- NULL) — same "mapping or free text" pattern as Bandari's
-- Operations module.
-- ============================================================

CREATE TABLE  op_catalog_items (
  item_id       INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200)  NOT NULL,
  description   TEXT          NULL,
  default_rate  DECIMAL(15,2) NOT NULL DEFAULT 0,
  unit          VARCHAR(50)   NOT NULL DEFAULT 'unit',
  kind          ENUM('invoice','expense') NOT NULL DEFAULT 'invoice',
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by    INT UNSIGNED  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_op_catalog_item_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_op_catalog_item_kind   (kind),
  INDEX idx_op_catalog_item_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE op_invoice_line_items
  ADD COLUMN item_id INT UNSIGNED NULL AFTER invoice_id,
  ADD CONSTRAINT fk_op_invoice_line_item FOREIGN KEY (item_id) REFERENCES op_catalog_items(item_id) ON DELETE SET NULL;

ALTER TABLE op_expense_line_items
  ADD COLUMN item_id INT UNSIGNED NULL AFTER expense_id,
  ADD CONSTRAINT fk_op_expense_line_item FOREIGN KEY (item_id) REFERENCES op_catalog_items(item_id) ON DELETE SET NULL;
