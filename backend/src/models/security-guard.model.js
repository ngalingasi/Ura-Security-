const httpStatus          = require('http-status');
const { query }           = require('../database/db');
const ApiError            = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const SAFE_FIELDS =
  `sg.guard_id, sg.full_name, sg.phone, sg.email, sg.national_id,
   sg.address, sg.gender, sg.date_of_birth,
   sg.next_of_kin_name, sg.next_of_kin_phone, sg.next_of_kin_relation,
   sg.emergency_contact, sg.employment_date,
   sg.photo_url, sg.documents_url,
   sg.guard_status, sg.notes,
   sg.created_by, sg.created_at, sg.updated_at`;

const findAll = async ({ page, limit, guard_status, gender, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (guard_status) { where += ' AND sg.guard_status = ?'; params.push(guard_status); }
  if (gender)       { where += ' AND sg.gender = ?';       params.push(gender); }
  if (search) {
    where += ' AND (sg.full_name LIKE ? OR sg.phone LIKE ? OR sg.national_id LIKE ? OR sg.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM security_guards sg WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM security_guards sg
     WHERE ${where} ORDER BY sg.full_name ASC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  // Attach current active assignment for each guard
  for (const g of rows) {
    const [assign] = await query(
      `SELECT ga.assignment_id, ga.shift, ga.start_date,
              c.name AS client_name, ps.name AS site_name
       FROM guard_assignments ga
       JOIN clients c    ON c.client_id = ga.client_id
       JOIN post_sites ps ON ps.site_id  = ga.site_id
       WHERE ga.guard_id = ? AND ga.status = 'active'
       LIMIT 1`,
      [g.guard_id]
    );
    g.current_assignment = assign || null;
  }

  return paginate(rows, countRow.total);
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM security_guards sg WHERE sg.guard_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Guard not found');

  const guard = rows[0];

  guard.assignments = await query(
    `SELECT ga.assignment_id, ga.shift, ga.start_date, ga.end_date, ga.status,
            c.name AS client_name, ps.name AS site_name
     FROM guard_assignments ga
     JOIN clients c    ON c.client_id = ga.client_id
     JOIN post_sites ps ON ps.site_id  = ga.site_id
     WHERE ga.guard_id = ? ORDER BY ga.start_date DESC`,
    [id]
  );
  return guard;
};

const create = async (body, creatorId = null) => {
  const {
    full_name, phone, email = null, national_id, address = null,
    gender = 'male', date_of_birth = null,
    next_of_kin_name = null, next_of_kin_phone = null, next_of_kin_relation = null,
    emergency_contact = null, employment_date = null,
    photo_url = null, documents_url = null,
    guard_status = 'active', notes = null,
  } = body;

  // Unique check on national_id
  const existing = await query(
    'SELECT guard_id FROM security_guards WHERE national_id = ? OR (email IS NOT NULL AND email = ?)',
    [national_id, email]
  );
  if (existing.length) throw new ApiError(httpStatus.CONFLICT, 'National ID or email already registered');

  const result = await query(
    `INSERT INTO security_guards
       (full_name, phone, email, national_id, address, gender, date_of_birth,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relation,
        emergency_contact, employment_date, photo_url, documents_url,
        guard_status, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      full_name, phone, email || null, national_id, address || null,
      gender, date_of_birth || null,
      next_of_kin_name || null, next_of_kin_phone || null, next_of_kin_relation || null,
      emergency_contact || null, employment_date || null,
      photo_url || null, documents_url || null,
      guard_status, notes || null, creatorId,
    ]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = [
    'full_name', 'phone', 'email', 'address', 'gender', 'date_of_birth',
    'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relation',
    'emergency_contact', 'employment_date', 'photo_url', 'documents_url',
    'guard_status', 'notes',
  ];
  const fields = Object.keys(body).filter((k) => ALLOWED.includes(k));
  if (!fields.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');

  const set    = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f] ?? null);
  await query(`UPDATE security_guards SET ${set} WHERE guard_id = ?`, [...values, id]);
  return findById(id);
};

module.exports = { findAll, findById, create, update };
