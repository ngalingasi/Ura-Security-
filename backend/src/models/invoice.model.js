const httpStatus          = require('http-status');
const { query, transaction, connQuery } = require('../database/db');
const ApiError             = require('../utils/ApiError');
const { buildPagination }  = require('../utils/helpers');

const toDateOnly = (v) => {
  if (!v) return null;
  if (typeof v === 'string' && v.includes('T')) return v.slice(0, 10);
  return v || null;
};

const pad = (n, len = 2) => String(n).padStart(len, '0');

/** Shared DDMMYYYY-NN number generator — one sequence per table (invoices
 *  and expenses number independently of each other). */
const generateNumber = async (table, numberColumn) => {
  const now = new Date();
  const prefix = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
  const like = `${prefix}-%`;
  const rows = await query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(${numberColumn}, '-', -1) AS UNSIGNED)) AS last
     FROM ${table} WHERE ${numberColumn} LIKE ?`,
    [like]
  );
  const seq = (rows?.[0]?.last || 0) + 1;
  return `${prefix}-${pad(seq, 2)}`;
};

/** total_amount = subtotal + vat_amount - wht_amount. Both computed on the
 *  subtotal (not on each other). Either tax independently toggleable — a
 *  disabled tax contributes 0 regardless of its stored rate. */
const recalcTotals = (lines, { whtEnabled, whtRate, vatEnabled, vatRate }) => {
  const subtotal = parseFloat(lines.reduce((s, l) => s + Number(l.line_total), 0).toFixed(2));
  const wht_amount = whtEnabled ? parseFloat((subtotal * (whtRate / 100)).toFixed(2)) : 0;
  const vat_amount = vatEnabled ? parseFloat((subtotal * (vatRate / 100)).toFixed(2)) : 0;
  const total_amount = parseFloat((subtotal + vat_amount - wht_amount).toFixed(2));
  return { subtotal, wht_amount, vat_amount, total_amount };
};

const prepareLines = (line_items) => line_items.map((l, idx) => {
  const qty = parseFloat(l.quantity) || 0;
  const price = parseFloat(l.unit_price) || 0;
  return {
    item_id: l.item_id || null,
    description: l.description || '',
    unit: l.unit || 'unit',
    quantity: qty,
    unit_price: price,
    line_total: parseFloat((qty * price).toFixed(2)),
    sort_order: l.sort_order ?? idx,
  };
});

const findById = async (id) => {
  const rows = await query(
    `SELECT i.*, c.name AS client_name, c.contract_number AS client_code,
            c.address AS client_address, c.phone AS client_phone, c.email AS client_email
     FROM op_invoices i
     LEFT JOIN clients c ON c.client_id = i.client_id
     WHERE i.invoice_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
  const invoice = rows[0];
  invoice.items = await query(
    `SELECT * FROM op_invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, line_id`,
    [id]
  );
  return invoice;
};

const findAll = async ({ page, limit, status, client_id, date_from, date_to, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where = '1=1';
  const params = [];
  if (status)    { where += ' AND i.status = ?';       params.push(status); }
  if (client_id) { where += ' AND i.client_id = ?';    params.push(client_id); }
  if (date_from) { where += ' AND i.issued_date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND i.issued_date <= ?'; params.push(date_to); }
  if (search)    { where += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM op_invoices i LEFT JOIN clients c ON c.client_id = i.client_id WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT i.*, c.name AS client_name, c.contract_number AS client_code
     FROM op_invoices i LEFT JOIN clients c ON c.client_id = i.client_id
     WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  return paginate(rows, countRow.total);
};

const create = async (body, creatorId) => {
  const {
    client_id, issued_date, due_date = null, notes = null,
    wht_enabled = true, wht_rate = 5,
    vat_enabled = true, vat_rate = 18,
    line_items = [],
  } = body;

  if (!client_id)   throw new ApiError(httpStatus.BAD_REQUEST, 'client_id is required');
  if (!issued_date) throw new ApiError(httpStatus.BAD_REQUEST, 'issued_date is required');
  if (!line_items.length) throw new ApiError(httpStatus.BAD_REQUEST, 'At least one line item is required');

  const invoice_number = await generateNumber('op_invoices', 'invoice_number');
  const preparedLines = prepareLines(line_items);

  const whtEnabled = !!wht_enabled;
  const vatEnabled = !!vat_enabled;
  const whtRate = Number.isFinite(parseFloat(wht_rate)) ? parseFloat(wht_rate) : 5;
  const vatRate = Number.isFinite(parseFloat(vat_rate)) ? parseFloat(vat_rate) : 18;
  const { subtotal, wht_amount, vat_amount, total_amount } = recalcTotals(preparedLines, { whtEnabled, whtRate, vatEnabled, vatRate });

  const invoiceId = await transaction(async (conn) => {
    const result = await connQuery(conn,
      `INSERT INTO op_invoices
         (invoice_number, client_id, issued_date, due_date, notes,
          subtotal, wht_enabled, wht_rate, wht_amount, vat_enabled, vat_rate, vat_amount, total_amount, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, client_id, toDateOnly(issued_date), toDateOnly(due_date), notes,
       subtotal, whtEnabled ? 1 : 0, whtRate, wht_amount, vatEnabled ? 1 : 0, vatRate, vat_amount, total_amount, creatorId]
    );
    const id = result.insertId;
    for (const line of preparedLines) {
      await connQuery(conn,
        `INSERT INTO op_invoice_line_items (invoice_id, item_id, description, unit, quantity, unit_price, line_total, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, line.item_id, line.description, line.unit, line.quantity, line.unit_price, line.line_total, line.sort_order]
      );
    }
    return id;
  });

  return findById(invoiceId);
};

const update = async (id, body, updatorId) => {
  const inv = await findById(id);
  if (inv.status !== 'invoiced') throw new ApiError(httpStatus.CONFLICT, 'Only invoiced (unapproved) invoices can be edited');

  const whtEnabled = body.wht_enabled !== undefined ? !!body.wht_enabled : !!inv.wht_enabled;
  const vatEnabled = body.vat_enabled !== undefined ? !!body.vat_enabled : !!inv.vat_enabled;
  const whtRate = body.wht_rate !== undefined ? parseFloat(body.wht_rate) : parseFloat(inv.wht_rate);
  const vatRate = body.vat_rate !== undefined ? parseFloat(body.vat_rate) : parseFloat(inv.vat_rate);

  let lines = inv.items;
  await transaction(async (conn) => {
    if (body.line_items) {
      await connQuery(conn, 'DELETE FROM op_invoice_line_items WHERE invoice_id = ?', [id]);
      lines = prepareLines(body.line_items);
      for (const line of lines) {
        await connQuery(conn,
          `INSERT INTO op_invoice_line_items (invoice_id, item_id, description, unit, quantity, unit_price, line_total, sort_order)
           VALUES (?,?,?,?,?,?,?,?)`,
          [id, line.item_id, line.description, line.unit, line.quantity, line.unit_price, line.line_total, line.sort_order]
        );
      }
    }

    const { subtotal, wht_amount, vat_amount, total_amount } = recalcTotals(lines, { whtEnabled, whtRate, vatEnabled, vatRate });
    const fields = ['subtotal = ?', 'wht_enabled = ?', 'wht_rate = ?', 'wht_amount = ?',
                     'vat_enabled = ?', 'vat_rate = ?', 'vat_amount = ?', 'total_amount = ?', 'updated_by = ?'];
    const params = [subtotal, whtEnabled ? 1 : 0, whtRate, wht_amount, vatEnabled ? 1 : 0, vatRate, vat_amount, total_amount, updatorId || null];
    if (body.due_date !== undefined) { fields.push('due_date = ?'); params.push(toDateOnly(body.due_date)); }
    if (body.notes    !== undefined) { fields.push('notes = ?');    params.push(body.notes); }
    params.push(id);
    await connQuery(conn, `UPDATE op_invoices SET ${fields.join(', ')} WHERE invoice_id = ?`, params);
  });

  return findById(id);
};

const approve = async (id, approverId) => {
  const inv = await findById(id);
  if (inv.status !== 'invoiced') {
    throw new ApiError(httpStatus.CONFLICT, `Invoice is ${inv.status} — only invoiced (unapproved) invoices can be approved`);
  }
  await query(`UPDATE op_invoices SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE invoice_id = ?`, [approverId, id]);
  return findById(id);
};

const cancel = async (id, cancellerId, reason) => {
  const inv = await findById(id);
  if (inv.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid invoices cannot be cancelled');
  await query(
    `UPDATE op_invoices SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW(), cancellation_reason = ? WHERE invoice_id = ?`,
    [cancellerId, reason || null, id]
  );
  return findById(id);
};

const recordPayment = async (invoiceId, { amount, evidence_path, evidence_name, notes }, paidById) => {
  const inv = await findById(invoiceId);
  if (inv.status !== 'approved') throw new ApiError(httpStatus.CONFLICT, 'Only approved invoices can be marked as paid');

  await transaction(async (conn) => {
    await connQuery(conn,
      `INSERT INTO op_invoice_payments (invoice_id, amount, paid_by, evidence_path, evidence_name, notes)
       VALUES (?,?,?,?,?,?)`,
      [invoiceId, amount || inv.total_amount, paidById, evidence_path || null, evidence_name || null, notes || null]
    );
    await connQuery(conn, `UPDATE op_invoices SET status = 'paid', paid_at = NOW() WHERE invoice_id = ?`, [invoiceId]);
  });
  return findById(invoiceId);
};

const findPayments = async ({ invoice_id, date_from, date_to } = {}) => {
  let sql = `SELECT p.*, i.invoice_number, i.client_id, c.name AS client_name
             FROM op_invoice_payments p
             JOIN op_invoices i ON i.invoice_id = p.invoice_id
             LEFT JOIN clients c ON c.client_id = i.client_id
             WHERE 1=1`;
  const params = [];
  if (invoice_id) { sql += ' AND p.invoice_id = ?'; params.push(invoice_id); }
  if (date_from)  { sql += ' AND p.paid_at >= ?';   params.push(date_from); }
  if (date_to)    { sql += ' AND p.paid_at <= ?';   params.push(date_to); }
  sql += ' ORDER BY p.paid_at DESC';
  return query(sql, params);
};

module.exports = { findAll, findById, create, update, approve, cancel, recordPayment, findPayments, generateNumber };
