import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../store/authStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import UserAvatar from '../ui/UserAvatar';
import RoleBadge from '../ui/RoleBadge';

// ── Icons ─────────────────────────────────────────────────────────────────────
const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SecurityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const NotifIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── Dropdown menu item ────────────────────────────────────────────────────────
interface MenuItemProps {
  icon:      React.ReactNode;
  label:     string;
  to?:       string;
  onClick?:  () => void;
  danger?:   boolean;
  badge?:    number;
}

function MenuItem({ icon, label, to, onClick, danger = false, badge }: MenuItemProps) {
  const base = `flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl
    transition-colors duration-150 group
    ${danger
      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
    }`;

  const iconCls = `flex-shrink-0 transition-colors
    ${danger
      ? 'text-red-400 group-hover:text-red-500'
      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
    }`;

  const content = (
    <>
      <span className={iconCls}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-500 text-white">
          {badge}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={base} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={base} onClick={onClick}>
      {content}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UserDropdown() {
  const [open, setOpen]  = useState(false);
  const { user, logout, isSuperAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  const close    = useCallback(() => setOpen(false), []);
  const dropRef  = useClickOutside<HTMLDivElement>(close, ['.user-toggle']);

  const handleSignOut = async () => {
    close();
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const { authApi } = await import('../../auth/api/authApi');
        await authApi.logout(refreshToken);
      }
    } catch { /* silent */ }
    logout();
    navigate('/signin');
  };

  if (!user) return null;

  const firstName = user.full_name?.split(' ')[0] ?? 'User';

  return (
    <div className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        className="user-toggle flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar fullName={user.full_name} role={user.role} size="sm" />
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
          {firstName}
        </span>
        <span className="hidden sm:block text-gray-400 dark:text-gray-500">
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          ref={dropRef}
          role="menu"
          aria-label="User options"
          className="absolute right-0 mt-2 w-[272px] rounded-2xl border border-gray-200 bg-white
            shadow-theme-xl dark:border-gray-800 dark:bg-gray-900 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150 z-[9999]"
        >
          {/* User info card */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <UserAvatar fullName={user.full_name} role={user.role} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user.email ?? `@${user.username}`}
                </p>
                <RoleBadge role={user.role} className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <MenuItem
              icon={<ProfileIcon />}
              label="My Profile"
              to="/profile"
              onClick={close}
            />
            <MenuItem
              icon={<SecurityIcon />}
              label="Security Settings"
              to="/profile"
              onClick={close}
            />
            <MenuItem
              icon={<NotifIcon />}
              label="Notifications"
              to="/"
              onClick={close}
              badge={3}
            />
            {(isAdmin || isSuperAdmin) && (
              <MenuItem
                icon={<UsersIcon />}
                label="Manage Users"
                to="/users"
                onClick={close}
              />
            )}
          </div>

          {/* Divider + sign out */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-800">
            <MenuItem
              icon={<SignOutIcon />}
              label="Sign Out"
              onClick={handleSignOut}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}
