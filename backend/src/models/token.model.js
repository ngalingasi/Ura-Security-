const jwt        = require('jsonwebtoken');
const moment     = require('moment');
const config     = require('../config/config');
const { query }  = require('../database/db');
const { tokenTypes } = require('../config/tokens');

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub:  userId,
    iat:  moment().unix(),
    exp:  expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  await query(
    `INSERT INTO tokens (token, user_id, expires, type, blacklisted) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE expires = VALUES(expires), blacklisted = VALUES(blacklisted)`,
    [token, userId, expires.toDate(), type, blacklisted ? 1 : 0]
  );
  return { token, userId, expires: expires.toDate(), type, blacklisted };
};

const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const rows    = await query(
    'SELECT * FROM tokens WHERE token = ? AND type = ? AND user_id = ? AND blacklisted = 0',
    [token, type, payload.sub]
  );
  if (!rows.length) throw new Error('Token not found');
  return rows[0];
};

const deleteTokensByUserAndType = async (userId, type) => {
  await query('DELETE FROM tokens WHERE user_id = ? AND type = ?', [userId, type]);
};

module.exports = { generateToken, saveToken, verifyToken, deleteTokensByUserAndType };
