const httpStatus   = require('http-status');
const ApiError     = require('../utils/ApiError');
const userModel    = require('../models/user.model');
const otpModel     = require('../models/otp.model');
const tokenModel   = require('../models/token.model');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const smsService   = require('./sms.service');
const config       = require('../config/config');
const { query }    = require('../database/db');
const { tokenTypes } = require('../config/tokens');

// ── Helpers ───────────────────────────────────────────────────────────────────
const maskEmail = (email) =>
  email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + '*'.repeat(Math.max(b.length, 3)) + c
  );

const maskPhone = (phone) => {
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 6) return '****';
  return clean.slice(0, 3) + '*'.repeat(clean.length - 6) + clean.slice(-3);
};

const SAFE_FIELDS = [
  'user_id', 'full_name', 'username', 'email',
  'mobile', 'gender', 'avatar', 'role', 'status', 'must_change_password',
];
const sanitizeUser = (user) =>
  SAFE_FIELDS.reduce((obj, k) => { obj[k] = user[k] ?? null; return obj; }, {});

// ── Auth flows ────────────────────────────────────────────────────────────────

/**
 * Standard username/password login — returns user + tokens.
 */
const login = async (loginField, password) => {
  const user = await userModel.findByLogin(loginField);
  if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect credentials');

  const match = await userModel.verifyPassword(password, user.password_hash);
  if (!match) throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect credentials');

  const tokens = await tokenService.generateAuthTokens(user);
  return { user: sanitizeUser(user), tokens };
};

/**
 * Step 1 of OTP flow — validate credentials, return available channels.
 */
const validateCredentials = async (loginField, password) => {
  const user = await userModel.findByLogin(loginField);
  if (!user) return { valid: false };

  const match = await userModel.verifyPassword(password, user.password_hash);
  if (!match) return { valid: false };

  if (user.must_change_password) {
    return { valid: true, must_change_password: true };
  }

  const channels = [];
  if (user.email)  channels.push({ type: 'email', display: maskEmail(user.email),  label: 'Email' });
  if (user.mobile) channels.push({ type: 'sms',   display: maskPhone(user.mobile), label: 'SMS'   });

  return { valid: true, channels };
};

/**
 * Step 2 of OTP flow — generate and send OTP.
 * Enforces a per-contact rate limit (max 5 OTPs per 5 minutes).
 */
const sendOtp = async (loginField, channel) => {
  const user = await userModel.findByLogin(loginField);
  if (!user) return { sent: true }; // silent 200 to prevent enumeration

  // Rate-limit check
  const contactKey = channel === 'email'
    ? { email: user.email }
    : { mobile: user.mobile };

  const recent = await otpModel.countRecentOtps(contactKey, 5);
  if (recent >= 5) {
    throw new ApiError(
      429,
      'Too many OTP requests. Please wait a few minutes before trying again.'
    );
  }

  // Clean stale OTPs in the background
  otpModel.cleanExpiredOtps().catch(() => {});

  const otp_code   = otpModel.generateOtp();
  const expires_at = otpModel.getExpiresAt(config.otp.expiryMinutes);

  if (channel === 'email') {
    if (!user.email) throw new ApiError(httpStatus.BAD_REQUEST, 'No email address on record');
    await otpModel.saveOtp({ email: user.email, otp_code, expires_at });
    await emailService.sendOtpEmail(user.email, otp_code);
    return { sent: true, channel: 'email', maskedContact: maskEmail(user.email) };
  }

  // SMS
  if (!user.mobile) throw new ApiError(httpStatus.BAD_REQUEST, 'No phone number on record');
  await otpModel.saveOtp({ mobile: user.mobile, otp_code, expires_at });
  await smsService.sendSms(
    `Your Ura Security login OTP is: ${otp_code}. Valid for ${config.otp.expiryMinutes} minutes. Do not share this code.`,
    [user.mobile]
  );
  return { sent: true, channel: 'sms', maskedContact: maskPhone(user.mobile) };
};

/**
 * Step 3 of OTP flow — verify OTP, mark used, return tokens.
 * SECURITY: OTP is marked used IMMEDIATELY after validation to prevent replay.
 */
const verifyOtp = async (loginField, otp) => {
  const user = await userModel.findByLogin(loginField);
  if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');

  // Try email first, then mobile
  let validOtp = null;
  if (user.email)  validOtp = await otpModel.findValidOtp({ email:  user.email,  otp_code: otp });
  if (!validOtp && user.mobile)
                   validOtp = await otpModel.findValidOtp({ mobile: user.mobile, otp_code: otp });

  if (!validOtp) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP. Please request a new one.');
  }

  // Mark used BEFORE generating tokens — prevents race conditions
  await otpModel.markOtpUsed(validOtp.id);

  const tokens = await tokenService.generateAuthTokens(user);
  return { user: sanitizeUser(user), tokens };
};

/**
 * Logout — invalidate the refresh token.
 */
const logout = async (refreshToken) => {
  const rows = await query(
    'SELECT * FROM tokens WHERE token = ? AND type = ? AND blacklisted = 0',
    [refreshToken, tokenTypes.REFRESH]
  );
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
  await query('DELETE FROM tokens WHERE token = ?', [refreshToken]);
};

/**
 * Reset password via token (forgot-password flow).
 */
const resetPassword = async (resetToken, newPassword) => {
  try {
    const tokenDoc = await tokenModel.verifyToken(resetToken, tokenTypes.RESET_PASSWORD);
    await userModel.updatePassword(tokenDoc.user_id, newPassword);
    await tokenModel.deleteTokensByUserAndType(tokenDoc.user_id, tokenTypes.RESET_PASSWORD);
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed. Token may have expired.');
  }
};

/**
 * Change own password (authenticated, must_change_password flow).
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const rows = await query('SELECT * FROM users WHERE user_id = ?', [userId]);
  if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const match = await userModel.verifyPassword(currentPassword, rows[0].password_hash);
  if (!match) throw new ApiError(httpStatus.UNAUTHORIZED, 'Current password is incorrect');

  await userModel.updatePassword(userId, newPassword);
};

module.exports = {
  login, validateCredentials, sendOtp, verifyOtp,
  logout, resetPassword, changePassword, sanitizeUser,
};
