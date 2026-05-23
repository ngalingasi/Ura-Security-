const { query }  = require('../database/db');
const config     = require('../config/config');

/**
 * Generate a cryptographically stronger 6-digit OTP.
 * Uses Math.random as a fallback — for production consider crypto.randomInt.
 */
const generateOtp = () => {
  try {
    const { randomInt } = require('crypto');
    return String(randomInt(100000, 999999));
  } catch {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
};

/**
 * Return a MySQL-compatible datetime N minutes from now (UTC+3 aware).
 */
const getExpiresAt = (minutes = 10) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Invalidate all previous OTPs for this contact, then insert a new one.
 * Supports email OR mobile (whichever is provided).
 */
const saveOtp = async ({ email = null, mobile = null, otp_code, expires_at }) => {
  if (!email && !mobile) throw new Error('saveOtp requires email or mobile');

  if (email) {
    await query(
      'UPDATE otp_verifications SET used = 1 WHERE email = ? AND used = 0',
      [email]
    );
  } else {
    await query(
      'UPDATE otp_verifications SET used = 1 WHERE mobile = ? AND used = 0',
      [mobile]
    );
  }

  const result = await query(
    `INSERT INTO otp_verifications (email, mobile, otp_code, expires_at, used)
     VALUES (?, ?, ?, ?, 0)`,
    [email || null, mobile || null, otp_code, expires_at]
  );
  return { id: result.insertId };
};

/**
 * Find a valid (unused, non-expired) OTP by contact + code.
 * Returns the row or null.
 */
const findValidOtp = async ({ email = null, mobile = null, otp_code }) => {
  if (!email && !mobile) throw new Error('findValidOtp requires email or mobile');

  const field = email ? 'email' : 'mobile';
  const value = email || mobile;

  const rows = await query(
    `SELECT * FROM otp_verifications
     WHERE ${field} = ?
       AND otp_code  = ?
       AND used      = 0
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [value, otp_code]
  );
  return rows.length ? rows[0] : null;
};

/**
 * Mark OTP as used. Called immediately after successful verification.
 * This is the critical step that prevents replay attacks.
 */
const markOtpUsed = async (id) => {
  await query('UPDATE otp_verifications SET used = 1 WHERE id = ?', [id]);
};

/**
 * Count recent OTP attempts for a contact (rate-limiting helper).
 * Returns the number of OTPs created in the last N minutes.
 */
const countRecentOtps = async ({ email = null, mobile = null }, windowMinutes = 5) => {
  if (!email && !mobile) return 0;
  const field = email ? 'email' : 'mobile';
  const value = email || mobile;
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM otp_verifications
     WHERE ${field} = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [value, windowMinutes]
  );
  return Number(rows[0]?.cnt ?? 0);
};

/**
 * Delete expired OTPs — run periodically to keep the table lean.
 */
const cleanExpiredOtps = async () => {
  await query('DELETE FROM otp_verifications WHERE expires_at < NOW()', []);
};

module.exports = {
  generateOtp,
  getExpiresAt,
  saveOtp,
  findValidOtp,
  markOtpUsed,
  countRecentOtps,
  cleanExpiredOtps,
};
