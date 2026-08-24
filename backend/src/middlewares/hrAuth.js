/**
 * The HR and Payroll controllers were ported from Vibarua/Bandari, whose
 * auth middleware decodes a JWT and sets `req.userid` / `req.email`
 * directly on the request. URA's own auth() middleware (passport-jwt)
 * instead sets `req.user` to the full user row.
 *
 * Rather than rewrite every ported controller's `req.userid` references,
 * this thin shim runs AFTER URA's `auth()` and bridges the two
 * conventions, so the ported code keeps running completely unmodified.
 */
const auth = require('./auth');

const hrAuth = (...requiredRights) => [
  auth(...requiredRights),
  (req, res, next) => {
    req.userid = req.user?.user_id;
    req.email  = req.user?.email;
    next();
  },
];

module.exports = hrAuth;
