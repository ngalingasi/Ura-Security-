const moment     = require('moment');
const config     = require('../config/config');
const tokenModel = require('../models/token.model');
const userModel  = require('../models/user.model');
const ApiError   = require('../utils/ApiError');
const httpStatus = require('http-status');
const { tokenTypes } = require('../config/tokens');

/**
 * Generate access + refresh token pair for a user.
 */
const generateAuthTokens = async (user) => {
  const accessExpires  = moment().add(config.jwt.accessExpirationMinutes,  'minutes');
  const refreshExpires = moment().add(config.jwt.refreshExpirationDays,    'days');

  const accessToken  = tokenModel.generateToken(user.user_id, accessExpires,  tokenTypes.ACCESS);
  const refreshToken = tokenModel.generateToken(user.user_id, refreshExpires, tokenTypes.REFRESH);

  await tokenModel.saveToken(refreshToken, user.user_id, refreshExpires, tokenTypes.REFRESH);

  return {
    access:  { token: accessToken,  expires: accessExpires.toDate()  },
    refresh: { token: refreshToken, expires: refreshExpires.toDate() },
  };
};

/**
 * Generate a password-reset token and persist it.
 * Returns null silently if email not found (prevents enumeration).
 */
const generateResetPasswordToken = async (email) => {
  const rows = await require('../database/db').query(
    `SELECT user_id FROM users WHERE email = ? AND status = 'active'`,
    [email]
  );
  if (!rows.length) return null;

  const userId  = rows[0].user_id;
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const token   = tokenModel.generateToken(userId, expires, tokenTypes.RESET_PASSWORD);
  await tokenModel.saveToken(token, userId, expires, tokenTypes.RESET_PASSWORD);
  return token;
};

/**
 * Refresh auth tokens — verify refresh token, delete old, issue new pair.
 */
const refreshAuthTokens = async (refreshToken) => {
  try {
    const tokenDoc = await tokenModel.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userModel.findById(tokenDoc.user_id);
    if (!user) throw new Error('User not found');

    await require('../database/db').query(
      'DELETE FROM tokens WHERE token = ?',
      [refreshToken]
    );
    return generateAuthTokens(user);
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

module.exports = { generateAuthTokens, generateResetPasswordToken, refreshAuthTokens };
