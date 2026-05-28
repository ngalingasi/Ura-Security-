const httpStatus          = require('http-status');
const { query }           = require('../database/db');
const ApiError            = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const toDateOnly = (v) => {
  if (!v) return null;
  if (typeof v === 'string' && v.includes('T')) return v.slice(0, 10);
  return v || null;
};

const SAFE_FIELDS =
  `sg.guard_id, sg.employee_id, sg.full_name, sg.phone, sg.email, sg.national_id,
   sg.address, sg.gender, sg.date_of_birth,
   sg.next_of_kin_name, sg.next_of_kin_phone, sg.next_of_kin_relation,
   sg.emergency_contact, sg.employment_date,
   sg.photo_url, sg.documents_url,
   sg.guard_status, sg.notes,
   sg.created_by, sg.created_at, sg.updated_at`;

// ── Helpers to load related data ──────────────────────────────────────────────
const loadEducation = (guardId) =>
  query(
    `SELECT education_id, level, institution_name, year_completed, attachment_url
     FROM guard_education WHERE guard_id = ? ORDER BY year_completed DESC`,
    [guardId]
  );

const loadSkills = (guardId) =>
  query(
    `SELECT skill_id, skill_name, skill_level, attachment_url
     FROM guard_skills WHERE guard_id = ? ORDER BY skill_name ASC`,
    [guardId]
  );

const loadAssignments = (guardId) =>
  query(
    `SELECT ga.assignment_id, ga.shift, ga.start_date, ga.end_date, ga.status,
            c.name AS client_name, ps.name AS site_name
     FROM guard_assignments ga
     LEFT JOIN clients c    ON c.client_id = ga.client_id
     LEFT JOIN post_sites ps ON ps.site_id  = ga.site_id
     WHERE ga.guard_id = ? ORDER BY ga.start_date DESC`,
    [guardId]
  );

const loadCurrentAssignment = async (guardId) => {
  const rows = await query(
    `SELECT ga.assignment_id, ga.shift, ga.start_date,
            c.name AS client_name, ps.name AS site_name
     FROM guard_assignments ga
     JOIN clients c    ON c.client_id = ga.client_id
     JOIN post_sites ps ON ps.site_id  = ga.site_id
     WHERE ga.guard_id = ? AND ga.status = 'active' LIMIT 1`,
    [guardId]
  );
  return rows[0] || null;
};

// ── Queries ───────────────────────────────────────────────────────────────────
const findAll = async ({ page, limit, guard_status, gender, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (guard_status) { where += ' AND sg.guard_status = ?'; params.push(guard_status); }
  if (gender)       { where += ' AND sg.gender = ?';       params.push(gender); }
  if (search) {
    where += ' AND (sg.full_name LIKE ? OR sg.phone LIKE ? OR sg.national_id LIKE ? OR sg.email LIKE ? OR sg.employee_id LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM security_guards sg WHERE ${where}`, params
  );
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM security_guards sg
     WHERE ${where} ORDER BY sg.full_name ASC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  for (const g of rows) {
    g.current_assignment = await loadCurrentAssignment(g.guard_id);
  }

  return paginate(rows, countRow.total);
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM security_guards sg WHERE sg.guard_id = ?`, [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Guard not found');

  const guard = rows[0];
  const [education, skills, assignments] = await Promise.all([
    loadEducation(id),
    loadSkills(id),
    loadAssignments(id),
  ]);
  guard.education   = education;
  guard.skills      = skills;
  guard.assignments = assignments;
  guard.current_assignment = assignments.find(a => a.status === 'active') || null;
  return guard;
};

const getEducationLevels = () =>
  query('SELECT name FROM education_levels ORDER BY level_id', []);

const create = async (body, creatorId = null) => {
  const {
    full_name, employee_id = null, phone, email = null, national_id,
    address = null, gender = 'male', date_of_birth = null,
    next_of_kin_name = null, next_of_kin_phone = null, next_of_kin_relation = null,
    emergency_contact = null, employment_date = null,
    photo_url = null, documents_url = null,
    guard_status = 'active', notes = null,
  } = body;

  const existing = await query(
    'SELECT guard_id FROM security_guards WHERE national_id = ? OR (email IS NOT NULL AND email = ?)',
    [national_id, email]
  );
  if (existing.length) throw new ApiError(httpStatus.CONFLICT, 'National ID or email already registered');

  const result = await query(
    `INSERT INTO security_guards
       (full_name, employee_id, phone, email, national_id, address, gender, date_of_birth,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relation,
        emergency_contact, employment_date, photo_url, documents_url,
        guard_status, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      full_name, employee_id||null, phone, email||null, national_id, address||null,
      gender, toDateOnly(date_of_birth),
      next_of_kin_name||null, next_of_kin_phone||null, next_of_kin_relation||null,
      emergency_contact||null, toDateOnly(employment_date),
      photo_url||null, documents_url||null,
      guard_status, notes||null, creatorId,
    ]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = [
    'full_name','employee_id','national_id','phone','email','address','gender','date_of_birth',
    'next_of_kin_name','next_of_kin_phone','next_of_kin_relation',
    'emergency_contact','employment_date','photo_url','documents_url',
    'guard_status','notes',
  ];
  const fields = Object.keys(body).filter(k => ALLOWED.includes(k));
  if (!fields.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');

  const DATE_FIELDS = new Set(['date_of_birth','employment_date']);
  const set    = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => DATE_FIELDS.has(f) ? toDateOnly(body[f]) : (body[f] ?? null));
  await query(`UPDATE security_guards SET ${set} WHERE guard_id = ?`, [...values, id]);
  return findById(id);
};

// ── Education CRUD ─────────────────────────────────────────────────────────────
const upsertEducation = async (guardId, records) => {
  // Delete removed records
  const incomingIds = records.filter(r => r.education_id).map(r => r.education_id);
  if (incomingIds.length) {
    await query(
      `DELETE FROM guard_education WHERE guard_id = ? AND education_id NOT IN (${incomingIds.map(() => '?').join(',')})`,
      [guardId, ...incomingIds]
    );
  } else {
    await query('DELETE FROM guard_education WHERE guard_id = ?', [guardId]);
  }

  for (const r of records) {
    if (r.education_id) {
      await query(
        `UPDATE guard_education
         SET level=?, institution_name=?, year_completed=?, attachment_url=?
         WHERE education_id=? AND guard_id=?`,
        [r.level, r.institution_name, r.year_completed||null, r.attachment_url||null, r.education_id, guardId]
      );
    } else {
      await query(
        `INSERT INTO guard_education (guard_id, level, institution_name, year_completed, attachment_url)
         VALUES (?,?,?,?,?)`,
        [guardId, r.level, r.institution_name, r.year_completed||null, r.attachment_url||null]
      );
    }
  }
};

// ── Skills CRUD ────────────────────────────────────────────────────────────────
const upsertSkills = async (guardId, records) => {
  const incomingIds = records.filter(r => r.skill_id).map(r => r.skill_id);
  if (incomingIds.length) {
    await query(
      `DELETE FROM guard_skills WHERE guard_id = ? AND skill_id NOT IN (${incomingIds.map(() => '?').join(',')})`,
      [guardId, ...incomingIds]
    );
  } else {
    await query('DELETE FROM guard_skills WHERE guard_id = ?', [guardId]);
  }

  for (const r of records) {
    if (r.skill_id) {
      await query(
        `UPDATE guard_skills
         SET skill_name=?, skill_level=?, attachment_url=?
         WHERE skill_id=? AND guard_id=?`,
        [r.skill_name, r.skill_level||null, r.attachment_url||null, r.skill_id, guardId]
      );
    } else {
      await query(
        `INSERT INTO guard_skills (guard_id, skill_name, skill_level, attachment_url)
         VALUES (?,?,?,?)`,
        [guardId, r.skill_name, r.skill_level||null, r.attachment_url||null]
      );
    }
  }
};

// Delete a single education/skill file reference
const deleteEducationAttachment = (educationId) =>
  query('UPDATE guard_education SET attachment_url = NULL WHERE education_id = ?', [educationId]);

const deleteSkillAttachment = (skillId) =>
  query('UPDATE guard_skills SET attachment_url = NULL WHERE skill_id = ?', [skillId]);

module.exports = {
  findAll, findById, create, update,
  getEducationLevels,
  upsertEducation, upsertSkills,
  deleteEducationAttachment, deleteSkillAttachment,
};
