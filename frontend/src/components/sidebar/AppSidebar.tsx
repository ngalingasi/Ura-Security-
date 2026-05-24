import { useLocation } from 'react-router';
import { useAuth } from '../../store/authStore';
import { NAV_CONFIG } from '../../routes/navConfig';
import SidebarItem  from './SidebarItem';
import SidebarGroup from './SidebarGroup';

interface AppSidebarProps {
  collapsed: boolean;
}

const canAccess = (
  allowedRoles: string[] | undefined,
  userRole: string,
  isSuperAdmin: boolean
): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (isSuperAdmin) return true;
  return allowedRoles.includes(userRole);
};

export default function AppSidebar({ collapsed }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const userRole = user?.role ?? 'viewer';

  return (
    <aside
      className={`
        flex-shrink-0 flex flex-col h-full
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800
          h-[65px] flex-shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}
      >
        <img
          src="/images/logo/logo.png"
          alt="Ura Security"
          className="w-8 h-8 object-contain flex-shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">Ura Security</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">Security Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {NAV_CONFIG.map((item) => {
          // Role check
          if (!canAccess(item.allowedRoles, userRole, isSuperAdmin)) return null;

          // Group with children
          if (item.children) {
            // Filter children by role too
            const visibleChildren = item.children.filter((c) =>
              canAccess(c.allowedRoles, userRole, isSuperAdmin)
            );
            if (!visibleChildren.length) return null;

            return (
              <SidebarGroup
                key={item.label}
                label={item.label}
                iconPath={item.iconPath}
                children={visibleChildren}
                collapsed={collapsed}
              />
            );
          }

          // Flat item
          return (
            <SidebarItem
              key={item.to}
              label={item.label}
              to={item.to!}
              iconPath={item.iconPath}
              active={item.to === '/' ? pathname === '/' : pathname.startsWith(item.to!)}
              collapsed={collapsed}
              depth={0}
            />
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">System online</span>
          </div>
        </div>
      )}
    </aside>
  );
}
