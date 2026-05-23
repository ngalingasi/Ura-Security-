import { useAuth } from '../store/authStore';
import { Link } from 'react-router';

export default function DashboardHome() {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          You are signed in as <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/profile"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">My Profile</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">View and edit your account details</p>
        </Link>

        <Link
          to="/profile"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Change Password</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
        </Link>

        {(isAdmin || isSuperAdmin) && (
          <Link
            to="/users"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">User Management</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage users, roles, and permissions</p>
          </Link>
        )}
      </div>
    </div>
  );
}
