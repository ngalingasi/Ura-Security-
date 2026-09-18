const httpStatus         = require('http-status');
const { query }          = require('../database/db');
const ApiError            = require('../utils/ApiError');

const SAFE_FIELDS = `item_id, name, description, default_rate, unit, kind, status, created_by, created_at, updated_at`;

const findAll = async ({ kind, status } = {}) => {
  let where = '1=1';
  const params = [];
  if (kind)   { where += ' AND kind = ?';   params.push(kind); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  return query(`SELECT ${SAFE_FIELDS} FROM op_catalog_items WHERE ${where} ORDER BY name`, params);
};

const findById = async (id) => {
  const rows = await query(`SELECT ${SAFE_FIELDS} FROM op_catalog_items WHERE item_id = ?`, [id]);
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Catalog item not found');
  return rows[0];
};

const create = async (body, creatorId) => {
  const { name, description = null, default_rate = 0, unit = 'unit', kind = 'invoice', status = 'active' } = body;
  if (!name) throw new ApiError(httpStatus.BAD_REQUEST, 'name is required');

  const result = await query(
    `INSERT INTO op_catalog_items (name, description, default_rate, unit, kind, status, created_by)
     VALUES (?,?,?,?,?,?,?)`,
    [name, description, parseFloat(default_rate) || 0, unit, kind, status, creatorId || null]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = ['name', 'description', 'default_rate', 'unit', 'kind', 'status'];
  const fields = Object.keys(body).filter((k) => ALLOWED.includes(k));
  if (!fields.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');

  const set = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (f === 'default_rate' ? parseFloat(body[f]) || 0 : body[f]));
  await query(`UPDATE op_catalog_items SET ${set} WHERE item_id = ?`, [...values, id]);
  return findById(id);
};

const deactivate = async (id) => {
  await findById(id); // 404s if missing
  await query(`UPDATE op_catalog_items SET status = 'inactive' WHERE item_id = ?`, [id]);
};

module.exports = { findAll, findById, create, update, deactivate };
