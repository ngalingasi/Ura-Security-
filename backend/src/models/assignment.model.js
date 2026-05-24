const httpStatus          = require('http-status');
const { query, transaction, connQuery } = require('../database/db');
const ApiError            = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const SAFE_FIELDS =
  `ga.assignment_id, ga.guard_id, ga.client_id, ga.site_id,
   ga.shift, ga.start_date, ga.end_date, ga.status, ga.notes,
   ga.created_by, ga.created_at, ga.updated_at,
   sg.full_name AS guard_name, sg.phone AS guard_phone,
   c.name  AS client_name,
   ps.name AS site_name`;

const findAll = async ({ page, limit, guard_id, client_id, site_id, status, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (guard_id)  { where += ' AND ga.guard_id = ?';  params.push(guard_id); }
  if (client_id) { where += ' AND ga.client_id = ?'; params.push(client_id); }
  if (site_id)   { where += ' AND ga.site_id = ?';   params.push(site_id); }
  if (status)    { where += ' AND ga.status = ?';    params.push(status); }
  if (search) {
    where += ' AND (sg.full_name LIKE ? OR c.name LIKE ? OR ps.name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const BASE_JOINS = `FROM guard_assignments ga
    JOIN security_guards sg ON sg.guard_id = ga.guard_id
    JOIN clients c          ON c.client_id = ga.client_id
    JOIN post_sites ps      ON ps.site_id  = ga.site_id`;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total ${BASE_JOINS} WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT ${SAFE_FIELDS} ${BASE_JOINS}
     WHERE ${where} ORDER BY ga.created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );
  return paginate(rows, countRow.total);
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS}
     FROM guard_assignments ga
     JOIN security_guards sg ON sg.guard_id = ga.guard_id
     JOIN clients c          ON c.client_id = ga.client_id
     JOIN post_sites ps      ON ps.site_id  = ga.site_id
     WHERE ga.assignment_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');

  const assignment = rows[0];
  assignment.history = await query(
    `SELECT ah.action, ah.notes, ah.changed_at,
            u.full_name AS changed_by_name
     FROM assignment_history ah
     LEFT JOIN users u ON u.user_id = ah.changed_by
     WHERE ah.assignment_id = ? ORDER BY ah.changed_at ASC`,
    [id]
  );
  return assignment;
};

/**
 * Check for duplicate active assignment: same guard + same site
 */
const checkDuplicate = async (guardId, siteId, excludeId = null) => {
  let sql    = `SELECT assignment_id FROM guard_assignments
                WHERE guard_id = ? AND site_id = ? AND status = 'active'`;
  const args = [guardId, siteId];
  if (excludeId) { sql += ' AND assignment_id != ?'; args.push(excludeId); }
  const rows = await query(sql, args);
  return rows.length > 0;
};

const create = async (body, creatorId = null) => {
  const {
    guard_id, client_id, site_id, shift,
    start_date, end_date = null, notes = null,
  } = body;

  // Duplicate prevention
  if (await checkDuplicate(guard_id, site_id)) {
    throw new ApiError(httpStatus.CONFLICT, 'This guard is already actively assigned to this site');
  }

  return transaction(async (conn) => {
    const result = await connQuery(conn,
      `INSERT INTO guard_assignments
         (guard_id, client_id, site_id, shift, start_date, end_date, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?,'active',?)`,
      [guard_id, client_id, site_id, shift, start_date, end_date || null, notes || null, creatorId]
    );
    const assignmentId = result.insertId;

    // Audit entry
    await connQuery(conn,
      `INSERT INTO assignment_history (assignment_id, action, changed_by, notes)
       VALUES (?, 'created', ?, 'Assignment created')`,
      [assignmentId, creatorId]
    );

    return findById(assignmentId);
  });
};

const endAssignment = async (id, userId = null, notes = null) => {
  const rows = await query(
    `SELECT assignment_id, status FROM guard_assignments WHERE assignment_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  if (rows[0].status !== 'active') throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment is not active');

  return transaction(async (conn) => {
    await connQuery(conn,
      `UPDATE guard_assignments
       SET status = 'completed', end_date = CURDATE(), updated_at = NOW()
       WHERE assignment_id = ?`,
      [id]
    );
    await connQuery(conn,
      `INSERT INTO assignment_history (assignment_id, action, changed_by, notes)
       VALUES (?, 'completed', ?, ?)`,
      [id, userId, notes || 'Assignment ended']
    );
    return findById(id);
  });
};

const cancelAssignment = async (id, userId = null, notes = null) => {
  return transaction(async (conn) => {
    await connQuery(conn,
      `UPDATE guard_assignments SET status = 'cancelled', updated_at = NOW() WHERE assignment_id = ?`,
      [id]
    );
    await connQuery(conn,
      `INSERT INTO assignment_history (assignment_id, action, changed_by, notes)
       VALUES (?, 'cancelled', ?, ?)`,
      [id, userId, notes || 'Assignment cancelled']
    );
    return findById(id);
  });
};

module.exports = { findAll, findById, create, endAssignment, cancelAssignment, checkDuplicate };
