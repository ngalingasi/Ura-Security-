const nodemailer = require('nodemailer');
const config     = require('../config/config');
const logger     = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Email server connected'))
    .catch((err) => logger.warn(`Email server connection failed: ${err.message}`));
}

const sendEmail = async (to, subject, html) => {
  await transport.sendMail({ from: config.email.from, to, subject, html });
};

const sendResetPasswordEmail = async (to, token) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendEmail(
    to,
    'Reset your password – Ura Security',
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#1e293b;">Password Reset Request</h2>
      <p style="color:#475569;">You requested a password reset for your Ura Security account.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
      </p>
      <p style="color:#94a3b8;font-size:13px;">Link expires in ${config.jwt.resetPasswordExpirationMinutes} minutes. If you did not request this, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Ura Security System</p>
    </div>`
  );
};

const sendWelcomeEmail = async (to, fullName, username, tempPassword) => {
  if (!to) return; // skip if no email
  await sendEmail(
    to,
    'Welcome to Ura Security',
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#1e293b;">Welcome to Ura Security</h2>
      <p style="color:#475569;">Dear ${fullName},</p>
      <p style="color:#475569;">Your account has been created. Use the credentials below to sign in:</p>
      <div style="background:#f8fafc;border-radius:6px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;color:#1e293b;"><strong>Username:</strong> ${username}</p>
        <p style="margin:4px 0;color:#1e293b;"><strong>Temporary Password:</strong> ${tempPassword}</p>
      </div>
      <p style="color:#ef4444;font-size:14px;">Please log in and change your password immediately.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Ura Security System Administrator</p>
    </div>`
  );
};

const sendOtpEmail = async (to, otp_code) => {
  await sendEmail(
    to,
    'Your One-Time Password (OTP) – Ura Security',
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;padding:32px;">
      <h2 style="color:#1e293b;margin-bottom:8px;">Login Verification</h2>
      <p style="color:#475569;">Use the OTP below to complete your sign-in. It expires in <strong>${config.otp.expiryMinutes} minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#1e293b;background:#f1f5f9;padding:16px 24px;border-radius:8px;display:inline-block;">
          ${otp_code}
        </span>
      </div>
      <p style="color:#94a3b8;font-size:13px;">If you did not attempt to log in, ignore this email or contact your administrator.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Ura Security System</p>
    </div>`
  );
};

module.exports = { sendEmail, sendResetPasswordEmail, sendWelcomeEmail, sendOtpEmail };
