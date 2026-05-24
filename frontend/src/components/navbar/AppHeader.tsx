import ThemeToggleButton    from './ThemeToggleButton';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown         from './UserDropdown';
import SidebarToggleButton  from './SidebarToggleButton';

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-[99] flex w-full items-center justify-between
      bg-white border-b border-gray-200 px-4 py-3 lg:px-6
      dark:border-gray-800 dark:bg-gray-900
      transition-colors duration-200"
    >
      {/* Left: sidebar toggle */}
      <div className="flex items-center gap-3">
        <SidebarToggleButton onClick={onToggleSidebar} />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 2xsm:gap-3">
        <ThemeToggleButton />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  );
}
