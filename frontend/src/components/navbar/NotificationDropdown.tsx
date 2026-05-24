import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface Notification {
  id:      number;
  type:    'info' | 'warning' | 'success' | 'error';
  title:   string;
  message: string;
  time:    string;
  read:    boolean;
  avatar?: string;
  initials?: string;
}

// Static sample — replace with API call when backend supports notifications
const SAMPLE: Notification[] = [
  {
    id: 1, type: 'info', read: false,
    title: 'New user registered',
    message: 'A new user account was created and is awaiting activation.',
    time: '5 min ago', initials: 'SY',
  },
  {
    id: 2, type: 'warning', read: false,
    title: 'Password expiry warning',
    message: 'Your password will expire in 3 days. Please update it.',
    time: '1 hr ago', initials: 'PW',
  },
  {
    id: 3, type: 'success', read: true,
    title: 'Login from new device',
    message: 'New sign-in detected from Dar es Salaam, Tanzania.',
    time: '3 hr ago', initials: 'LG',
  },
  {
    id: 4, type: 'error', read: true,
    title: 'Failed login attempt',
    message: 'Multiple failed login attempts detected on your account.',
    time: 'Yesterday', initials: 'FA',
  },
];

const TYPE_STYLES = {
  info:    { dot: 'bg-blue-500',    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  warning: { dot: 'bg-orange-500',  icon: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
  success: { dot: 'bg-green-500',   icon: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
  error:   { dot: 'bg-red-500',     icon: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
};

export default function NotificationDropdown() {
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Notification[]>(SAMPLE);

  const close    = useCallback(() => setOpen(false), []);
  const dropRef  = useClickOutside<HTMLDivElement>(close, ['.notif-toggle']);
  const unread   = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead    = (id: number) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        className="notif-toggle relative flex items-center justify-center rounded-full border border-gray-200
          bg-white text-gray-500 transition-colors h-11 w-11
          hover:bg-gray-100 hover:text-gray-700
          dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400
          dark:hover:bg-gray-800 dark:hover:text-white
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white leading-none z-10">
            {unread > 9 ? '9+' : unread}
            <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75" />
          </span>
        )}
        <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M12 2a7 7 0 00-7 7v5.17l-1.7 1.7A1 1 0 004 17.5h16a1 1 0 00.7-1.71L19 14.17V9a7 7 0 00-7-7zm0 20a3 3 0 01-2.83-2h5.66A3 3 0 0112 22z"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropRef}
          className="absolute right-0 mt-2 w-[360px] rounded-2xl border border-gray-200 bg-white
            shadow-theme-xl dark:border-gray-800 dark:bg-gray-900
            animate-in fade-in slide-in-from-top-2 duration-150 z-[9999]"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Notifications</h3>
              {unread > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-[340px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 ? (
              <li className="py-10 text-center text-sm text-gray-400">No notifications</li>
            ) : (
              items.map((n) => {
                const s = TYPE_STYLES[n.type];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors
                        hover:bg-gray-50 dark:hover:bg-gray-800/60
                        ${!n.read ? 'bg-brand-25 dark:bg-brand-500/5' : ''}`}
                    >
                      {/* Icon/avatar */}
                      <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${s.icon}`}>
                        {n.initials}
                      </span>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${n.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!n.read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />}
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">{n.time}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 text-left">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/"
              onClick={close}
              className="block w-full text-center text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors py-1"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
