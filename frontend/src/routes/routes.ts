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

  // HR
  HR_ATTENDANCE_DAILY:   '/hr/attendance/daily',
  HR_ATTENDANCE_MONTHLY: '/hr/attendance/monthly',
  HR_LEAVE_TYPES:      '/hr/leaves/types',
  HR_LEAVE_APPS:       '/hr/leaves/applications',
  HR_LEAVE_PENDING:    '/hr/leaves/pending',
  HR_DEPARTMENTS:      '/hr/departments',
  HR_REFERENCE_DATA:   '/hr/reference-data',

  // Payroll
  PAYROLL_SCALES:      '/payroll/scales',
  PAYROLL_ASSIGN:      '/payroll/assign',
  PAYROLL_LIST:        '/payroll/salary-list',
  PAYROLL_SLIPS:       '/payroll/slips',
  PAYROLL_REPORT:      '/payroll/report',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
