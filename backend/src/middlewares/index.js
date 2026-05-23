const Joi        = require('joi');
const httpStatus = require('http-status');
const rateLimit  = require('express-rate-limit');
const config     = require('../config/config');
const logger     = require('../config/logger');
const ApiError   = require('../utils/ApiError');
const { pick }   = require('../utils/helpers');

// ── Joi validation ────────────────────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object      = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const msg = error.details.map((d) => d.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, msg));
  }
  Object.assign(req, value);
  return next();
};

// ── Auth rate limiter ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:             15 * 60 * 1000,  // 15 minutes
  max:                  20,
  skipSuccessfulRequests: true,
  message: { code: 429, message: 'Too many requests, please try again later' },
});

// ── OTP rate limiter (stricter) ───────────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 minutes
  max:      5,
  message:  { code: 429, message: 'Too many OTP requests, please wait before trying again' },
});

// ── Global error converter ────────────────────────────────────────────────────
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message    = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message    = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') logger.error(err);

  res.status(statusCode).send(response);
};

module.exports = { validate, authLimiter, otpLimiter, errorConverter, errorHandler };
