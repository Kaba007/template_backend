import { Sidebar as FlowbiteSidebar, SidebarCollapse, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
import {
  HiChartPie,
  HiClipboardList,
  HiCog,
  HiLogout,
  HiOutlineMinusSm,
  HiOutlinePlusSm,
  HiUser,
  HiUsers,
  HiViewBoards,
} from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';
import { twMerge } from "tailwind-merge";
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../PermissionGuard';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (e, path) => {
    e.preventDefault();
    navigate(path);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  // Helper funkce pro avatar
  const getInitials = (clientId) => {
    if (!clientId) return 'U';
    return clientId.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (clientId) => {
    if (!clientId) return 'bg-blue-600';
    const colors = [
      'bg-blue-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-red-600',
    ];
    const index = clientId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full">
      <FlowbiteSidebar aria-label="Hlavní navigace" className="flex-1" collapsed={false}>
        <SidebarItems>
          {/* Hlavní navigace */}
          <SidebarItemGroup>
            <SidebarItem
              href="#"
              icon={HiChartPie}
              onClick={(e) => handleNavigation(e, '/')}
              active={isActive('/')}
            >
              Dashboard
            </SidebarItem>

            <PermissionGuard requireAdmin="users">
              <SidebarItem
                href="#"
                icon={HiClipboardList}
                onClick={(e) => handleNavigation(e, '/tasks')}
                active={isActive('/tasks')}
              >
                Úkoly
              </SidebarItem>
            </PermissionGuard>

            <PermissionGuard requireAdmin="users">
              <SidebarItem
                href="#"
                icon={HiUsers}
                onClick={(e) => handleNavigation(e, '/users')}
                active={isActive('/users')}
              >
                Uživatelé
              </SidebarItem>
            </PermissionGuard>

            <PermissionGuard requireAdmin="users">
              <SidebarItem
                href="#"
                icon={HiViewBoards}
                onClick={(e) => handleNavigation(e, '/modules')}
                active={isActive('/modules')}
              >
                Moduly
              </SidebarItem>
            </PermissionGuard>
          </SidebarItemGroup>

          {/* Admin sekce s collapse */}
          <PermissionGuard requireAdmin="users">
            <SidebarItemGroup>
              <SidebarCollapse
                icon={HiCog}
                label="Administrace"
                renderChevronIcon={(theme, open) => {
                  const IconComponent = open ? HiOutlineMinusSm : HiOutlinePlusSm;
                  return <IconComponent aria-hidden className={twMerge(theme.label.icon.open[open ? "on" : "off"])} />;
                }}
              >
                <SidebarItem
                  href="#"
                  onClick={(e) => handleNavigation(e, '/admin')}
                  active={isActive('/admin')}
                >
                  Nastavení
                </SidebarItem>
                <SidebarItem
                  href="#"
                  onClick={(e) => handleNavigation(e, '/admin/logs')}
                  active={isActive('/admin/logs')}
                >
                  Logy
                </SidebarItem>
                <SidebarItem
                  href="#"
                  onClick={(e) => handleNavigation(e, '/admin/permissions')}
                  active={isActive('/admin/permissions')}
                >
                  Oprávnění
                </SidebarItem>
              </SidebarCollapse>
            </SidebarItemGroup>
          </PermissionGuard>

          {/* Profil */}
          <SidebarItemGroup>
            <SidebarItem
              href="#"
              icon={HiUser}
              onClick={(e) => handleNavigation(e, '/profile')}
              active={isActive('/profile')}
            >
              Můj profil
            </SidebarItem>
          </SidebarItemGroup>

          {/* Logout - PŘESUNUTO DOVNITŘ SidebarItems */}
          <SidebarItemGroup>
            <SidebarItem
              href="#"
              icon={HiLogout}
              onClick={handleLogout}
            >
              Odhlásit se
            </SidebarItem>
          </SidebarItemGroup>
        </SidebarItems>
      </FlowbiteSidebar>

      {/* Info o uživateli na spodu sidebaru */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.client_id)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {getInitials(user?.client_id)}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Přihlášen jako
            </p>
            <p className="text-sm font-medium truncate dark:text-white">
              {user?.client_id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
