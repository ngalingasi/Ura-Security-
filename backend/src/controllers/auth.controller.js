const httpStatus   = require('http-status');
const { catchAsync }  = require('../utils/helpers');
const authService  = require('../services/auth.service');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');

// ── Standard login ─────────────────────────────────────────────────────────────
const login = catchAsync(async (req, res) => {
  const { login, password } = req.body;
  const result = await authService.login(login, password);
  res.status(httpStatus.OK).json({ status: true, message: 'Login successful', ...result });
});

// ── OTP step 1: validate credentials ─────────────────────────────────────────
const validateCredentials = catchAsync(async (req, res) => {
  const { login, password } = req.body;
  const result = await authService.validateCredentials(login, password);

  if (!result.valid) {
    return res.status(httpStatus.UNAUTHORIZED).json({ status: false, message: 'Invalid credentials' });
  }
  if (result.must_change_password) {
    return res.status(httpStatus.OK).json({
      status: false,
      must_change_password: true,
      message: 'You must change your password before continuing',
    });
  }
  res.status(httpStatus.OK).json({
    status:  true,
    message: 'Credentials valid. Please choose an OTP delivery channel.',
    channels: result.channels,
  });
});

// ── OTP step 2: send OTP ──────────────────────────────────────────────────────
const sendOtp = catchAsync(async (req, res) => {
  const { login, channel } = req.body;
  const result = await authService.sendOtp(login, channel);
  res.status(httpStatus.OK).json({ status: true, message: `OTP sent via ${channel}`, ...result });
});

// ── OTP step 3: verify OTP ────────────────────────────────────────────────────
const verifyOtp = catchAsync(async (req, res) => {
  const { login, otp } = req.body;
  const result = await authService.verifyOtp(login, otp);
  res.status(httpStatus.OK).json({ status: true, message: 'Login successful', ...result });
});

// ── Session ───────────────────────────────────────────────────────────────────
const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await tokenService.refreshAuthTokens(req.body.refreshToken);
  res.send(tokens);
});

// ── Password ──────────────────────────────────────────────────────────────────
const forgotPassword = catchAsync(async (req, res) => {
  const token = await tokenService.generateResetPasswordToken(req.body.email);
  if (token) {
    await emailService.sendResetPasswordEmail(req.body.email, token);
  }
  // Always return 204 — never reveal whether email exists
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(
    req.user.user_id,
    req.body.currentPassword,
    req.body.newPassword
  );
  res.status(httpStatus.NO_CONTENT).send();
});

// ── Current user ──────────────────────────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  res.send(authService.sanitizeUser(req.user));
});

module.exports = {
  login, validateCredentials, sendOtp, verifyOtp,
  logout, refreshTokens,
  forgotPassword, resetPassword, changePassword,
  getMe,
};
