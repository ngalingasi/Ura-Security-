const passport    = require('passport');
const httpStatus  = require('http-status');
const ApiError    = require('../utils/ApiError');
const { roleRights, isSuperAdmin } = require('../config/roles');

// Routes accessible even when must_change_password = 1
const PASSWORD_CHANGE_WHITELIST = [
  '/auth/change-password',
  '/auth/logout',
  '/auth/me',
];

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  req.user = user;

  // Force password change before any other protected action
  if (user.must_change_password) {
    const url = req.originalUrl.split('?')[0];
    const whitelisted = PASSWORD_CHANGE_WHITELIST.some(
      (suffix) => url.endsWith(suffix) || url.includes(suffix)
    );
    if (!whitelisted) {
      return reject(
        new ApiError(
          httpStatus.FORBIDDEN,
          'You must change your password before continuing. POST /api/v1/auth/change-password'
        )
      );
    }
  }

  if (requiredRights.length) {
    if (isSuperAdmin(user)) return resolve();

    const userRights = roleRights.get(user.role) || [];
    const hasRights  = requiredRights.every((r) => userRights.includes(r));

    if (!hasRights) {
      const isSelf =
        req.params.userId !== undefined &&
        req.params.userId === String(user.user_id);
      if (!isSelf) {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }
    }
  }

  resolve();
};

const auth = (...requiredRights) => async (req, res, next) =>
  new Promise((resolve, reject) => {
    passport.authenticate(
      'jwt',
      { session: false },
      verifyCallback(req, resolve, reject, requiredRights)
    )(req, res, next);
  })
    .then(() => next())
    .catch(next);

module.exports = auth;
