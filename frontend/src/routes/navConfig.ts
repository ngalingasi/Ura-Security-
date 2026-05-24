import { ROUTES } from './routes';

// ── SVG Icon components (inline, no deps) ─────────────────────────────────────
export const SidebarIcons = {
  Dashboard: `<path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
  Profile:   `<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
  Users:     `<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>`,
  Clients:   `<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  ClientList:`<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>`,
  PostSites: `<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>`,
  Shield:    `<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`,
  Guards:    `<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/>`,
  Assign:    `<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>`,
};

// ── Nav item types ────────────────────────────────────────────────────────────
export interface NavChild {
  label:        string;
  to:           string;
  iconPath:     string;
  allowedRoles?: string[];
}

export interface NavItem {
  label:        string;
  iconPath:     string;
  to?:          string;            // flat item
  children?:    NavChild[];        // group with submenus
  allowedRoles?: string[];
}

// ── Navigation config ─────────────────────────────────────────────────────────
export const NAV_CONFIG: NavItem[] = [
  {
    label:    'Dashboard',
    to:       ROUTES.DASHBOARD,
    iconPath: SidebarIcons.Dashboard,
  },
  {
    label:    'Users',
    to:       ROUTES.USERS,
    iconPath: SidebarIcons.Users,
    allowedRoles: ['admin', 'manager', 'super_admin'],
  },

  // ── Clients ──────────────────────────────────────────────────────────────────
  {
    label:    'Clients',
    iconPath: SidebarIcons.Clients,
    children: [
      {
        label:    'Client List',
        to:       ROUTES.CLIENTS,
        iconPath: SidebarIcons.ClientList,
      },
      {
        label:    'Post Sites',
        to:       ROUTES.POST_SITES,
        iconPath: SidebarIcons.PostSites,
      },
    ],
  },

  // ── Security Team ─────────────────────────────────────────────────────────────
  {
    label:    'Security Team',
    iconPath: SidebarIcons.Shield,
    children: [
      {
        label:    'Security Guards',
        to:       ROUTES.SECURITY_GUARDS,
        iconPath: SidebarIcons.Guards,
      },
      {
        label:    'Assign Post Site',
        to:       ROUTES.ASSIGN_POST_SITE,
        iconPath: SidebarIcons.Assign,
      },
    ],
  },
];
