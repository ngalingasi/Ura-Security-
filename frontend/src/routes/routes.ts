// ── Route constants — single source of truth ──────────────────────────────────
export const ROUTES = {
  // Auth
  SIGN_IN:         '/signin',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  CHANGE_PASSWORD: '/change-password',

  // App
  DASHBOARD:       '/',
  PROFILE:         '/profile',

  // Users
  USERS:           '/users',

  // Clients
  CLIENTS:         '/clients',
  POST_SITES:      '/post-sites',

  // Security Team
  SECURITY_GUARDS:   '/security-guards',
  ASSIGN_POST_SITE:  '/assign-post-site',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
