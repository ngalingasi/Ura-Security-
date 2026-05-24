const httpStatus          = require('http-status');
const { query }           = require('../database/db');
const ApiError            = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const SAFE_FIELDS =
  `ps.site_id, ps.client_id, ps.name, ps.location,
   ps.guards_required, ps.shift_details, ps.supervisor_name,
   ps.risk_level, ps.instructions, ps.status,
   ps.created_by, ps.created_at, ps.updated_at,
   c.name AS client_name`;

const findAll = async ({ page, limit, client_id, risk_level, status, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (client_id)  { where += ' AND ps.client_id = ?';  params.push(client_id); }
  if (risk_level) { where += ' AND ps.risk_level = ?'; params.push(risk_level); }
  if (status)     { where += ' AND ps.status = ?';     params.push(status); }
  if (search) {
    where += ' AND (ps.name LIKE ? OR ps.location LIKE ? OR c.name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM post_sites ps
     JOIN clients c ON c.client_id = ps.client_id WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT ${SAFE_FIELDS}
     FROM post_sites ps JOIN clients c ON c.client_id = ps.client_id
     WHERE ${where} ORDER BY ps.created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  return paginate(rows, countRow.total);
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS}
     FROM post_sites ps JOIN clients c ON c.client_id = ps.client_id
     WHERE ps.site_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Post site not found');

  const site = rows[0];
  // active assignments at this site
  site.active_assignments = await query(
    `SELECT ga.assignment_id, sg.full_name AS guard_name, sg.phone, ga.shift, ga.start_date
     FROM guard_assignments ga
     JOIN security_guards sg ON sg.guard_id = ga.guard_id
     WHERE ga.site_id = ? AND ga.status = 'active'`,
    [id]
  );
  return site;
};

const findByClient = async (clientId) =>
  query(
    `SELECT site_id, name, location, guards_required, risk_level, status
     FROM post_sites WHERE client_id = ? ORDER BY name`,
    [clientId]
  );

const create = async (body, creatorId = null) => {
  const {
    client_id, name, location, guards_required = 1,
    shift_details = null, supervisor_name = null,
    risk_level = 'medium', instructions = null, status = 'active',
  } = body;

  const result = await query(
    `INSERT INTO post_sites
       (client_id, name, location, guards_required, shift_details,
        supervisor_name, risk_level, instructions, status, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      client_id, name, location, Number(guards_required),
      shift_details || null, supervisor_name || null,
      risk_level, instructions || null, status, creatorId,
    ]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = [
    'client_id', 'name', 'location', 'guards_required', 'shift_details',
    'supervisor_name', 'risk_level', 'instructions', 'status',
  ];
  const fields = Object.keys(body).filter((k) => ALLOWED.includes(k));
  if (!fields.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');

  const set    = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f] ?? null);
  await query(`UPDATE post_sites SET ${set} WHERE site_id = ?`, [...values, id]);
  return findById(id);
};

const remove = async (id) => {
  await query(`UPDATE post_sites SET status = 'inactive' WHERE site_id = ?`, [id]);
};

module.exports = { findAll, findById, findByClient, create, update, remove };
