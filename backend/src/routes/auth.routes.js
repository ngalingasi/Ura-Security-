const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/auth.controller');
const schemas    = require('../validations/schemas');
const auth       = require('../middlewares/auth');
const { validate, otpLimiter } = require('../middlewares/index');

// Standard login
router.post('/login',              validate(schemas.login),                ctrl.login);

// OTP 3-step login
router.post('/validate-credentials', validate(schemas.validateCredentials), ctrl.validateCredentials);
router.post('/send-otp',           otpLimiter, validate(schemas.sendOtp),  ctrl.sendOtp);
router.post('/verify-otp',         validate(schemas.verifyOtp),            ctrl.verifyOtp);

// Session
router.post('/logout',             validate(schemas.logout),               ctrl.logout);
router.post('/refresh-tokens',     validate(schemas.refreshTokens),        ctrl.refreshTokens);

// Password management
router.post('/forgot-password',    validate(schemas.forgotPassword),       ctrl.forgotPassword);
router.post('/reset-password',     validate(schemas.resetPassword),        ctrl.resetPassword);
router.post('/change-password',    auth(), validate(schemas.changePassword), ctrl.changePassword);

// Current user
router.get('/me',                  auth(),                                 ctrl.getMe);

module.exports = router;
