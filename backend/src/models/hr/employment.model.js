/**
 * HR employment model.
 *
 * This is NEW code (not ported from Vibarua) implementing the
 * dual-reference design: HR/Payroll records point at either a `users`
 * row (staff who log in) or a `security_guards` row (guards — personnel
 * only, no login), via nullable `user_id` / `guard_id` columns with
 * exactly one populated.
 *
 * `hr_employment_profiles` holds the HR-specific fields neither `users`
 * nor `security_guards` has (department, designation, title, bank,
 * joining date, contract info) for whichever person it's attached to.
 *
 * The "roster" is a UNION of `users` and `security_guards` (each left
 * joined to its employment profile, if any) — this is what powers
 * person pickers on the Leave/Payroll/Attendance pages, replacing the
 * old ported system's single `fetchUsers({user_type:'tpfcs'})` call.
 */
const { query, transaction, connQuery } = require('../../database/db');

const ROSTER_FIELDS = `
  ep.id                AS employment_profile_id,
  ep.department_id, dep.name                AS department_name,
  ep.designation_id,  des.designation_name,
  ep.title_id,        t.title_name,
  ep.bank_id,         b.bank_name,
  ep.bank_acc, ep.pf_number, ep.joining_date,
  ep.contract_types, ep.contract_start_date, ep.contract_end_date
`;

const ROSTER_JOINS = `
  LEFT JOIN hr_employment_profiles ep ON ep.__REF_COL__ = __PERSON_TABLE__.__ID_COL__
  LEFT JOIN hr_departments  dep ON dep.id              = ep.department_id
  LEFT JOIN hr_designations des ON des.designation_id  = ep.designation_id
  LEFT JOIN hr_titles       t   ON t.title_id          = ep.title_id
  LEFT JOIN hr_banks        b   ON b.bank_id           = ep.bank_id
`;

/**
 * Combined roster of users + security_guards, each annotated with its
 * employment profile (department/designation/title/bank) if one exists.
 *
 * @param {{ search?: string, department_id?: number, person_type?: 'user'|'guard' }} filters
 */
const fetchRoster = async ({ search, department_id, person_type } = {}) => {
  const userJoins  = ROSTER_JOINS.replace(/__REF_COL__/g, 'user_id').replace(/__PERSON_TABLE__/g, 'u').replace(/__ID_COL__/g, 'user_id');
  const guardJoins = ROSTER_JOINS.replace(/__REF_COL__/g, 'guard_id').replace(/__PERSON_TABLE__/g, 'g').replace(/__ID_COL__/g, 'guard_id');

  const parts  = [];
  const params = [];

  if (!person_type || person_type === 'user') {
    let where = `u.status != 'inactive'`;
    if (search)        { where += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    if (department_id) { where += ' AND ep.department_id = ?'; params.push(department_id); }
    parts.push(`
      SELECT 'user' AS person_type, u.user_id AS person_id, u.full_name, u.email,
             u.mobile AS phone, u.role, u.status, u.avatar AS photo_url,
             ${ROSTER_FIELDS}
      FROM users u
      ${userJoins}
      WHERE ${where}
    `);
  }

  if (!person_type || person_type === 'guard') {
    let where = `g.guard_status != 'inactive'`;
    if (search)        { where += ' AND (g.full_name LIKE ? OR g.email LIKE ? OR g.phone LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    if (department_id) { where += ' AND ep.department_id = ?'; params.push(department_id); }
    parts.push(`
      SELECT 'guard' AS person_type, g.guard_id AS person_id, g.full_name, g.email,
             g.phone, NULL AS role, g.guard_status AS status, g.photo_url,
             ${ROSTER_FIELDS}
      FROM security_guards g
      ${guardJoins}
      WHERE ${where}
    `);
  }

  const sql = parts.join(' UNION ALL ') + ' ORDER BY full_name ASC';
  return query(sql, params);
};

/** Fetch a single person's roster row (used to hydrate leave/payroll/attendance lists). */
const fetchPerson = async (personType, personId) => {
  const rows = await fetchRoster({ person_type: personType });
  return rows.find((r) => String(r.person_id) === String(personId)) || null;
};

const findEmploymentProfile = async ({ user_id, guard_id }) => {
  const rows = await query(
    `SELECT ${ROSTER_FIELDS.replace(/\n/g, ' ')}
     FROM hr_employment_profiles ep
     LEFT JOIN hr_departments  dep ON dep.id             = ep.department_id
     LEFT JOIN hr_designations des ON des.designation_id = ep.designation_id
     LEFT JOIN hr_titles       t   ON t.title_id         = ep.title_id
     LEFT JOIN hr_banks        b   ON b.bank_id          = ep.bank_id
     WHERE ep.user_id ${user_id ? '= ?' : 'IS NULL'} AND ep.guard_id ${guard_id ? '= ?' : 'IS NULL'}`,
    [user_id, guard_id].filter((v) => v !== undefined && v !== null)
  );
  return rows[0] || null;
};

/**
 * Create or update an employment profile for exactly one person
 * (user_id XOR guard_id).
 */
const upsertEmploymentProfile = async (payload, creatorId) => {
  const { user_id, guard_id } = payload;

  if ((user_id && guard_id) || (!user_id && !guard_id)) {
    throw new Error('Exactly one of user_id or guard_id is required');
  }

  const existing = await findEmploymentProfile({ user_id, guard_id });

  const FIELDS = [
    'department_id', 'designation_id', 'title_id', 'bank_id', 'bank_acc',
    'pf_number', 'joining_date', 'contract_types', 'contract_start_date', 'contract_end_date',
  ];

  if (existing) {
    const set    = FIELDS.filter((f) => payload[f] !== undefined);
    const values = set.map((f) => payload[f]);
    if (!set.length) return existing;
    await query(
      `UPDATE hr_employment_profiles SET ${set.map((f) => `${f} = ?`).join(', ')}
       WHERE id = ?`,
      [...values, existing.employment_profile_id]
    );
    return findEmploymentProfile({ user_id, guard_id });
  }

  const cols   = FIELDS.filter((f) => payload[f] !== undefined);
  const values = cols.map((f) => payload[f]);
  const colList = cols.length ? `, ${cols.join(', ')}` : '';
  const placeholders = cols.length ? `, ${cols.map(() => '?').join(', ')}` : '';
  await query(
    `INSERT INTO hr_employment_profiles
       (user_id, guard_id${colList}, created_by)
     VALUES (?, ?${placeholders}, ?)`,
    [user_id || null, guard_id || null, ...values, creatorId]
  );
  return findEmploymentProfile({ user_id, guard_id });
};

module.exports = { fetchRoster, fetchPerson, findEmploymentProfile, upsertEmploymentProfile };
