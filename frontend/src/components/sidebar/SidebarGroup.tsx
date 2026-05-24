import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import SidebarIcon from './SidebarIcon';
import SidebarItem from './SidebarItem';
import type { NavChild } from '../../routes/navConfig';

// Chevron icon
const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

interface SidebarGroupProps {
  label:     string;
  iconPath:  string;
  children:  NavChild[];
  collapsed: boolean;         // sidebar collapsed (icon-only mode)
}

export default function SidebarGroup({
  label, iconPath, children, collapsed,
}: SidebarGroupProps) {
  const { pathname } = useLocation();

  // Auto-expand if any child is active
  const hasActive = children.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState(hasActive);

  // Re-open if route changes to a child
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const groupActive = hasActive;

  // Collapsed mode: show only icon, no submenu expansion
  if (collapsed) {
    return (
      <div className="relative group/tip">
        <button
          className={`w-full flex justify-center px-2 py-2.5 rounded-xl transition-colors
            ${groupActive
              ? 'text-brand-500 dark:text-brand-400'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300'
            }`}
          aria-label={label}
        >
          <SidebarIcon path={iconPath} />
        </button>
        {/* Tooltip on hover */}
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
          whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-3 py-1.5
          text-xs text-white opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg">
          {label}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Group header button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl
          text-sm font-medium transition-colors duration-150 select-none
          ${groupActive
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
          }
        `}
        aria-expanded={open}
      >
        <span className={`flex-shrink-0 transition-colors ${groupActive
          ? 'text-brand-500 dark:text-brand-400'
          : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
        }`}>
          <SidebarIcon path={iconPath} />
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        <span className={`transition-colors ${groupActive
          ? 'text-brand-400'
          : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400'
        }`}>
          <Chevron open={open} />
        </span>
      </button>

      {/* Submenu — smooth height animation via max-height trick */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="mt-0.5 ml-4 pl-3 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5 pb-1">
          {children.map((child) => (
            <SidebarItem
              key={child.to}
              label={child.label}
              to={child.to}
              iconPath={child.iconPath}
              active={pathname.startsWith(child.to)}
              collapsed={false}
              depth={1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
