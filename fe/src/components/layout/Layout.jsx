import { useState } from 'react';
import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:static
          inset-y-0 left-0
          z-40
          w-64
          transition-transform duration-300
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
        `}
      >
        <Sidebar />
      </aside>

      {/* Overlay pro mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};
