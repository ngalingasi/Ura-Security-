import { useState } from 'react';
import { Outlet } from 'react-router';
import AppHeader  from '../components/navbar/AppHeader';
import AppSidebar from '../components/sidebar/AppSidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <AppSidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
