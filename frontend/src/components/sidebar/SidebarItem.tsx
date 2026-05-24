import { Link } from 'react-router';
import SidebarIcon from './SidebarIcon';

interface SidebarItemProps {
  label:      string;
  to:         string;
  iconPath:   string;
  active:     boolean;
  collapsed:  boolean;
  depth?:     number;        // 0 = top level, 1 = submenu child
}

export default function SidebarItem({
  label, to, iconPath, active, collapsed, depth = 0,
}: SidebarItemProps) {
  const isChild = depth > 0;

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`
        group flex items-center gap-3 rounded-xl text-sm font-medium
        transition-colors duration-150 select-none
        ${collapsed ? 'justify-center px-2 py-2.5' : isChild ? 'px-3 py-2' : 'px-3 py-2.5'}
        ${active
          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
        }
      `}
    >
      <span className={`flex-shrink-0 transition-colors ${active
        ? 'text-brand-500 dark:text-brand-400'
        : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
      }`}>
        <SidebarIcon path={iconPath} className={isChild ? 'w-4 h-4 flex-shrink-0' : 'w-[18px] h-[18px] flex-shrink-0'} />
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 flex-shrink-0" />
          )}
        </>
      )}
    </Link>
  );
}
