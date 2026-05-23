const Joi = require('joi');

// ── Auth ──────────────────────────────────────────────────────────────────────
const login = {
  body: Joi.object().keys({
    login:    Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const validateCredentials = {
  body: Joi.object().keys({
    login:    Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const sendOtp = {
  body: Joi.object().keys({
    login:   Joi.string().required(),
    channel: Joi.string().valid('email', 'sms').required(),
  }),
};

const verifyOtp = {
  body: Joi.object().keys({
    login: Joi.string().required(),
    otp:   Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({ 'string.pattern.base': 'OTP must be a 6-digit number' }),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({ token: Joi.string().required() }),
  body:  Joi.object().keys({
    password: Joi.string().min(8).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
      .messages({ 'string.min': 'New password must be at least 8 characters' }),
  }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
const VALID_ROLES = ['viewer', 'user', 'manager', 'admin', 'super_admin'];

const createUser = {
  body: Joi.object().keys({
    full_name: Joi.string().required(),
    username:  Joi.string().alphanum().min(3).required(),
    email:     Joi.string().email().optional().allow('', null),
    mobile:    Joi.string().optional().allow('', null),
    gender:    Joi.string().valid('male', 'female').optional(),
    role:      Joi.string().valid(...VALID_ROLES).optional(),
    status:    Joi.string().valid('active', 'inactive').optional(),
    password:  Joi.string().min(8).optional(),
  }),
};

const updateUser = {
  params: Joi.object().keys({ userId: Joi.number().integer().required() }),
  body: Joi.object().keys({
    full_name:            Joi.string().optional(),
    email:                Joi.string().email().optional().allow('', null),
    mobile:               Joi.string().optional().allow('', null),
    gender:               Joi.string().valid('male', 'female').optional(),
    role:                 Joi.string().valid(...VALID_ROLES).optional(),
    status:               Joi.string().valid('active', 'inactive').optional(),
    must_change_password: Joi.number().valid(0, 1).optional(),
  }).min(1),
};

module.exports = {
  // auth
  login, validateCredentials, sendOtp, verifyOtp,
  logout, refreshTokens, forgotPassword, resetPassword, changePassword,
  // users
  createUser, updateUser,
};
