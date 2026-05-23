/**
 * Ura Security — Role & permissions
 *
 * Roles:
 *   viewer      : read-only access to own profile
 *   user        : standard authenticated user
 *   manager     : can manage users within their org
 *   admin       : full org access + user management
 *   super_admin : full platform access (bypasses all checks)
 */

const allRoles = {
  viewer: [],

  user: ['getUsers'],

  manager: ['getUsers', 'manageUsers'],

  admin: ['getUsers', 'manageUsers'],

  super_admin: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

/** Returns true when the user is platform super admin — bypasses ALL right checks */
const isSuperAdmin = (user) => user && user.role === 'super_admin';

module.exports = { roles, roleRights, isSuperAdmin };
