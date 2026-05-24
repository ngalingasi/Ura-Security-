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

// ── Clients ───────────────────────────────────────────────────────────────────
const createClient = {
  body: Joi.object().keys({
    name:               Joi.string().required(),
    contact_person:     Joi.string().required(),
    email:              Joi.string().email().optional().allow('', null),
    phone:              Joi.string().required(),
    address:            Joi.string().optional().allow('', null),
    region:             Joi.string().required(),
    contract_number:    Joi.string().optional().allow('', null),
    service_type:       Joi.string().required(),
    guards_required:    Joi.number().integer().min(1).required(),
    contract_start:     Joi.string().required(),
    contract_end:       Joi.string().optional().allow('', null),
    emergency_name:     Joi.string().optional().allow('', null),
    emergency_phone:    Joi.string().optional().allow('', null),
    emergency_relation: Joi.string().optional().allow('', null),
    status:             Joi.string().valid('active','inactive','pending','expired').optional(),
    notes:              Joi.string().optional().allow('', null),
  }),
};

const updateClient = {
  params: Joi.object().keys({ clientId: Joi.number().integer().required() }),
  body: Joi.object().keys({
    name:               Joi.string().optional(),
    contact_person:     Joi.string().optional(),
    email:              Joi.string().email().optional().allow('', null),
    phone:              Joi.string().optional(),
    address:            Joi.string().optional().allow('', null),
    region:             Joi.string().optional(),
    contract_number:    Joi.string().optional().allow('', null),
    service_type:       Joi.string().optional(),
    guards_required:    Joi.number().integer().min(1).optional(),
    contract_start:     Joi.string().optional(),
    contract_end:       Joi.string().optional().allow('', null),
    emergency_name:     Joi.string().optional().allow('', null),
    emergency_phone:    Joi.string().optional().allow('', null),
    emergency_relation: Joi.string().optional().allow('', null),
    status:             Joi.string().valid('active','inactive','pending','expired').optional(),
    notes:              Joi.string().optional().allow('', null),
  }).min(1),
};

// ── Post Sites ────────────────────────────────────────────────────────────────
const createPostSite = {
  body: Joi.object().keys({
    client_id:       Joi.number().integer().required(),
    name:            Joi.string().required(),
    location:        Joi.string().required(),
    guards_required: Joi.number().integer().min(1).required(),
    shift_details:   Joi.string().optional().allow('', null),
    supervisor_name: Joi.string().optional().allow('', null),
    risk_level:      Joi.string().valid('low','medium','high').optional(),
    instructions:    Joi.string().optional().allow('', null),
    status:          Joi.string().valid('active','inactive').optional(),
  }),
};

const updatePostSite = {
  params: Joi.object().keys({ siteId: Joi.number().integer().required() }),
  body: Joi.object().keys({
    client_id:       Joi.number().integer().optional(),
    name:            Joi.string().optional(),
    location:        Joi.string().optional(),
    guards_required: Joi.number().integer().min(1).optional(),
    shift_details:   Joi.string().optional().allow('', null),
    supervisor_name: Joi.string().optional().allow('', null),
    risk_level:      Joi.string().valid('low','medium','high').optional(),
    instructions:    Joi.string().optional().allow('', null),
    status:          Joi.string().valid('active','inactive').optional(),
  }).min(1),
};

// ── Security Guards ───────────────────────────────────────────────────────────
const createGuard = {
  body: Joi.object().keys({
    full_name:            Joi.string().required(),
    phone:                Joi.string().required(),
    email:                Joi.string().email().optional().allow('', null),
    national_id:          Joi.string().required(),
    address:              Joi.string().optional().allow('', null),
    gender:               Joi.string().valid('male','female').optional(),
    date_of_birth:        Joi.string().optional().allow('', null),
    next_of_kin_name:     Joi.string().optional().allow('', null),
    next_of_kin_phone:    Joi.string().optional().allow('', null),
    next_of_kin_relation: Joi.string().optional().allow('', null),
    emergency_contact:    Joi.string().optional().allow('', null),
    employment_date:      Joi.string().optional().allow('', null),
    guard_status:         Joi.string().valid('active','inactive','suspended','on_leave').optional(),
    notes:                Joi.string().optional().allow('', null),
  }),
};

const updateGuard = {
  params: Joi.object().keys({ guardId: Joi.number().integer().required() }),
  body: Joi.object().keys({
    full_name:            Joi.string().optional(),
    phone:                Joi.string().optional(),
    email:                Joi.string().email().optional().allow('', null),
    address:              Joi.string().optional().allow('', null),
    gender:               Joi.string().valid('male','female').optional(),
    date_of_birth:        Joi.string().optional().allow('', null),
    next_of_kin_name:     Joi.string().optional().allow('', null),
    next_of_kin_phone:    Joi.string().optional().allow('', null),
    next_of_kin_relation: Joi.string().optional().allow('', null),
    emergency_contact:    Joi.string().optional().allow('', null),
    employment_date:      Joi.string().optional().allow('', null),
    guard_status:         Joi.string().valid('active','inactive','suspended','on_leave').optional(),
    notes:                Joi.string().optional().allow('', null),
  }).min(1),
};

// ── Assignments ───────────────────────────────────────────────────────────────
const createAssignment = {
  body: Joi.object().keys({
    guard_id:   Joi.number().integer().required(),
    client_id:  Joi.number().integer().required(),
    site_id:    Joi.number().integer().required(),
    shift:      Joi.string().required(),
    start_date: Joi.string().required(),
    end_date:   Joi.string().optional().allow('', null),
    notes:      Joi.string().optional().allow('', null),
  }),
};

const endAssignment = {
  params: Joi.object().keys({ assignmentId: Joi.number().integer().required() }),
  body: Joi.object().keys({
    notes: Joi.string().optional().allow('', null),
  }),
};

// Append new exports to existing module.exports
Object.assign(module.exports, {
  createClient, updateClient,
  createPostSite, updatePostSite,
  createGuard, updateGuard,
  createAssignment, endAssignment,
});
