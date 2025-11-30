// Layout.jsx
import { useState } from 'react';
import { HiMenu, HiX } from 'react-icons/hi';
import { AppFooter } from './Footer';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <Sidebar />
        </aside>

        {/* Invisible backdrop pro zavření sidebaru kliknutím mimo */}
        {isOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Mobile Sidebar - ZPRAVA */}
        {isOpen && (
          <aside className="lg:hidden fixed top-0 right-0 z-50 w-64 h-screen overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xl font-semibold dark:text-white">Menu</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <div onClick={() => setIsOpen(false)} className="h-[calc(100vh-73px)]">
              <Sidebar />
            </div>
          </aside>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
          aria-label="Otevřít menu"
        >
          <HiMenu className="w-6 h-6" />
        </button>

        <main className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-all duration-50 ${isOpen ? 'blur-sm' : ''}`}>
          {children}
        </main>
      </div>

      <AppFooter />
    </div>
  );
};
