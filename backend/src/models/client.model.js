const httpStatus          = require('http-status');
const { query }           = require('../database/db');
const ApiError            = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const SAFE_FIELDS =
  `c.client_id, c.name, c.contact_person, c.email, c.phone,
   c.address, c.region, c.contract_number, c.service_type,
   c.guards_required, c.contract_start, c.contract_end,
   c.emergency_name, c.emergency_phone, c.emergency_relation,
   c.status, c.notes, c.created_by, c.created_at, c.updated_at`;

const findAll = async ({ page, limit, status, region, service_type, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (status)       { where += ' AND c.status = ?';       params.push(status); }
  if (region)       { where += ' AND c.region = ?';       params.push(region); }
  if (service_type) { where += ' AND c.service_type = ?'; params.push(service_type); }
  if (search) {
    where += ' AND (c.name LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM clients c WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM clients c
     WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  return paginate(rows, countRow.total);
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM clients c WHERE c.client_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');

  const client = rows[0];
  // attach post sites summary
  client.sites = await query(
    `SELECT site_id, name, location, guards_required, risk_level, status
     FROM post_sites WHERE client_id = ? ORDER BY name`,
    [id]
  );
  return client;
};

const create = async (body, creatorId = null) => {
  const {
    name, contact_person, email = null, phone, address = null, region,
    contract_number = null, service_type, guards_required = 1,
    contract_start, contract_end = null,
    emergency_name = null, emergency_phone = null, emergency_relation = null,
    status = 'active', notes = null,
  } = body;

  if (contract_number) {
    const exists = await query(
      'SELECT client_id FROM clients WHERE contract_number = ?',
      [contract_number]
    );
    if (exists.length) throw new ApiError(httpStatus.CONFLICT, 'Contract number already exists');
  }

  const result = await query(
    `INSERT INTO clients
       (name, contact_person, email, phone, address, region,
        contract_number, service_type, guards_required,
        contract_start, contract_end,
        emergency_name, emergency_phone, emergency_relation,
        status, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      name, contact_person, email || null, phone, address || null, region,
      contract_number || null, service_type, Number(guards_required),
      contract_start, contract_end || null,
      emergency_name || null, emergency_phone || null, emergency_relation || null,
      status, notes || null, creatorId,
    ]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = [
    'name', 'contact_person', 'email', 'phone', 'address', 'region',
    'contract_number', 'service_type', 'guards_required',
    'contract_start', 'contract_end',
    'emergency_name', 'emergency_phone', 'emergency_relation',
    'status', 'notes',
  ];
  const fields = Object.keys(body).filter((k) => ALLOWED.includes(k));
  if (!fields.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');

  const set    = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f] ?? null);
  await query(`UPDATE clients SET ${set} WHERE client_id = ?`, [...values, id]);
  return findById(id);
};

const remove = async (id) => {
  await query(`UPDATE clients SET status = 'inactive' WHERE client_id = ?`, [id]);
};

const getRegions      = async () => query('SELECT * FROM regions ORDER BY name',       []);
const getServiceTypes = async () => query('SELECT * FROM service_types ORDER BY name', []);

module.exports = { findAll, findById, create, update, remove, getRegions, getServiceTypes };
