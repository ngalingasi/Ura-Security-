const httpStatus          = require('http-status');
const { query, transaction, connQuery } = require('../database/db');
const ApiError             = require('../utils/ApiError');
const { buildPagination }  = require('../utils/helpers');
const { generateNumber }   = require('./invoice.model');

const toDateOnly = (v) => {
  if (!v) return null;
  if (typeof v === 'string' && v.includes('T')) return v.slice(0, 10);
  return v || null;
};

const prepareLines = (line_items) => line_items.map((l, idx) => {
  const qty = parseFloat(l.quantity) || 0;
  const price = parseFloat(l.unit_price) || 0;
  return {
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
    `SELECT e.*, c.name AS client_name, c.contract_number AS client_code
     FROM op_expenses e LEFT JOIN clients c ON c.client_id = e.client_id
     WHERE e.expense_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Expense not found');
  const expense = rows[0];
  expense.items = await query(
    `SELECT * FROM op_expense_line_items WHERE expense_id = ? ORDER BY sort_order, line_id`,
    [id]
  );
  return expense;
};

const findAll = async ({ page, limit, client_id, date_from, date_to, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where = '1=1';
  const params = [];
  if (client_id) { where += ' AND e.client_id = ?';     params.push(client_id); }
  if (date_from) { where += ' AND e.expense_date >= ?'; params.push(date_from); }
  if (date_to)   { where += ' AND e.expense_date <= ?'; params.push(date_to); }
  if (search)    { where += ' AND (e.expense_number LIKE ? OR e.notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM op_expenses e LEFT JOIN clients c ON c.client_id = e.client_id WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT e.*, c.name AS client_name, c.contract_number AS client_code
     FROM op_expenses e LEFT JOIN clients c ON c.client_id = e.client_id
     WHERE ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  return paginate(rows, countRow.total);
};

const create = async (body, creatorId) => {
  const { client_id = null, expense_date, notes = null, line_items = [] } = body;

  if (!expense_date) throw new ApiError(httpStatus.BAD_REQUEST, 'expense_date is required');
  if (!line_items.length) throw new ApiError(httpStatus.BAD_REQUEST, 'At least one line item is required');

  const expense_number = await generateNumber('op_expenses', 'expense_number');
  const preparedLines = prepareLines(line_items);
  const total_amount = parseFloat(preparedLines.reduce((s, l) => s + l.line_total, 0).toFixed(2));

  const expenseId = await transaction(async (conn) => {
    const result = await connQuery(conn,
      `INSERT INTO op_expenses (expense_number, client_id, expense_date, notes, total_amount, created_by)
       VALUES (?,?,?,?,?,?)`,
      [expense_number, client_id || null, toDateOnly(expense_date), notes, total_amount, creatorId]
    );
    const id = result.insertId;
    for (const line of preparedLines) {
      await connQuery(conn,
        `INSERT INTO op_expense_line_items (expense_id, description, unit, quantity, unit_price, line_total, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [id, line.description, line.unit, line.quantity, line.unit_price, line.line_total, line.sort_order]
      );
    }
    return id;
  });

  return findById(expenseId);
};

const update = async (id, body, updatorId) => {
  await findById(id); // 404s if missing

  let total_amount;
  await transaction(async (conn) => {
    if (body.line_items) {
      await connQuery(conn, 'DELETE FROM op_expense_line_items WHERE expense_id = ?', [id]);
      const lines = prepareLines(body.line_items);
      total_amount = parseFloat(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
      for (const line of lines) {
        await connQuery(conn,
          `INSERT INTO op_expense_line_items (expense_id, description, unit, quantity, unit_price, line_total, sort_order)
           VALUES (?,?,?,?,?,?,?)`,
          [id, line.description, line.unit, line.quantity, line.unit_price, line.line_total, line.sort_order]
        );
      }
    }

    const fields = ['updated_by = ?'];
    const params = [updatorId || null];
    if (total_amount !== undefined) { fields.push('total_amount = ?'); params.push(total_amount); }
    if (body.client_id     !== undefined) { fields.push('client_id = ?');     params.push(body.client_id || null); }
    if (body.expense_date  !== undefined) { fields.push('expense_date = ?');  params.push(toDateOnly(body.expense_date)); }
    if (body.notes         !== undefined) { fields.push('notes = ?');        params.push(body.notes); }
    params.push(id);
    await connQuery(conn, `UPDATE op_expenses SET ${fields.join(', ')} WHERE expense_id = ?`, params);
  });

  return findById(id);
};

const remove = async (id) => {
  await findById(id); // 404s if missing
  await query('DELETE FROM op_expenses WHERE expense_id = ?', [id]);
};

module.exports = { findAll, findById, create, update, remove };
