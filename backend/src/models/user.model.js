const httpStatus       = require('http-status');
const bcrypt           = require('bcryptjs');
const argon2           = require('argon2');
const { query }        = require('../database/db');
const ApiError         = require('../utils/ApiError');
const { buildPagination } = require('../utils/helpers');

const SAFE_FIELDS =
  'user_id, full_name, username, email, mobile, gender, avatar, role, ' +
  'status, must_change_password, last_password_changed, created_at, created_by';

// ── Read ──────────────────────────────────────────────────────────────────────

const findByLogin = async (login) => {
  const rows = await query(
    `SELECT * FROM users
     WHERE (email = ? OR username = ?) AND status = 'active'`,
    [login, login]
  );
  return rows.length ? rows[0] : null;
};

const findById = async (id) => {
  const rows = await query(
    `SELECT ${SAFE_FIELDS} FROM users WHERE user_id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  const user   = rows[0];
  user.skills  = await getUserSkills(id);
  return user;
};

const getUserSkills = async (userId) =>
  query(
    `SELECT s.skill_id, s.name, s.category
     FROM skills s
     JOIN user_skills us ON us.skill_id = s.skill_id
     WHERE us.user_id = ?
     ORDER BY s.category, s.name`,
    [userId]
  );

const findAll = async ({ page, limit, role, status, search } = {}) => {
  const { limit: l, offset, paginate } = buildPagination(page, limit);
  let where  = '1=1';
  const params = [];

  if (role)   { where += ' AND role = ?';   params.push(role); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    where += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
    params
  );
  const users = await query(
    `SELECT ${SAFE_FIELDS} FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  for (const u of users) {
    u.skills = await getUserSkills(u.user_id);
  }

  return paginate(users, countRow.total);
};

const getAllSkills = async () =>
  query('SELECT * FROM skills ORDER BY category, name', []);

// ── Write ─────────────────────────────────────────────────────────────────────

const create = async (body, creatorId = null) => {
  const {
    full_name, username, email = null, mobile = null,
    gender = 'male', role = 'user', password,
  } = body;

  const existing = await query(
    `SELECT user_id FROM users
     WHERE username = ? OR (email IS NOT NULL AND email = ?)`,
    [username, email]
  );
  if (existing.length) {
    throw new ApiError(httpStatus.CONFLICT, 'Username or email already taken');
  }

  const hash   = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users
       (full_name, username, email, mobile, gender, password_hash,
        role, status, must_change_password, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)`,
    [full_name, username, email || null, mobile || null, gender, hash, role, creatorId]
  );
  return findById(result.insertId);
};

const update = async (id, body) => {
  const ALLOWED = [
    'full_name', 'email', 'mobile', 'gender', 'avatar',
    'role', 'status', 'must_change_password',
  ];
  const fields = Object.keys(body).filter((k) => ALLOWED.includes(k));
  if (!fields.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');
  }
  const set    = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f]);
  await query(`UPDATE users SET ${set} WHERE user_id = ?`, [...values, id]);
  return findById(id);
};

const deactivate = async (id) => {
  await query(`UPDATE users SET status = 'inactive' WHERE user_id = ?`, [id]);
};

const updateSkills = async (userId, skillIds = []) => {
  await query('DELETE FROM user_skills WHERE user_id = ?', [userId]);
  for (const sid of skillIds) {
    await query(
      'INSERT IGNORE INTO user_skills (user_id, skill_id) VALUES (?,?)',
      [userId, sid]
    );
  }
};

const updatePassword = async (userId, newPassword) => {
  const hash = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE users
     SET password_hash = ?, must_change_password = 0, last_password_changed = NOW()
     WHERE user_id = ?`,
    [hash, userId]
  );
};

// ── Password verification — auto-detects hash algorithm ──────────────────────
// Supports bcrypt ($2a$, $2b$, $2y$) and argon2 ($argon2id$, $argon2i$, $argon2d$).
// Allows users migrated from Management System (argon2) to login without
// being forced to change their password.
const verifyPassword = async (plaintext, hash) => {
  if (!hash || !plaintext) return false;
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, plaintext);
    }
    // bcrypt ($2a$, $2b$, $2y$)
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
};

module.exports = {
  findByLogin, findById, findAll, getAllSkills,
  create, update, deactivate, updateSkills,
  updatePassword, verifyPassword,
};
