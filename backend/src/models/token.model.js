const jwt        = require('jsonwebtoken');
const moment     = require('moment');
const config     = require('../config/config');
const { query }  = require('../database/db');
const { tokenTypes } = require('../config/tokens');

/**
 * Generate a signed JWT.
 * user param is optional — when provided, embeds full_name, email, role
 * into the payload so ERP redirect frontends can build a complete user
 * object without waiting for /auth/me.
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret, user = null) => {
  const payload = {
    sub:  userId,
    iat:  moment().unix(),
    exp:  expires.unix(),
    type,
  };

  if (user) {
    payload.full_name            = user.full_name  ?? null;
    payload.username             = user.username   ?? null;
    payload.email                = user.email      ?? null;
    payload.role                 = user.role       ?? null;
    payload.must_change_password = user.must_change_password ?? 0;
  }

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

const generateAuthTokens = async (user) => {
  const accessTokenExpires  = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken         = generateToken(user.user_id, accessTokenExpires, tokenTypes.ACCESS, config.jwt.secret, user);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken        = generateToken(user.user_id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.user_id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access:  { token: accessToken,  expires: accessTokenExpires.toDate()  },
    refresh: { token: refreshToken, expires: refreshTokenExpires.toDate() },
  };
};

const deleteTokensByUserAndType = async (userId, type) => {
  await query('DELETE FROM tokens WHERE user_id = ? AND type = ?', [userId, type]);
};

module.exports = { generateToken, saveToken, verifyToken, generateAuthTokens, deleteTokensByUserAndType };
