import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Načtení uživatele při startu aplikace
  useEffect(() => {
    checkAuth();

    // Poslouchání na unauthorized event z axios interceptoru
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await authService.getMe();
      setUser(userData);
      setError(null);
    } catch (err) {
      setUser(null);
      // Nelogovat error pokud je to jen 401 (uživatel není přihlášen)
      if (err.response?.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      await authService.login(credentials);
      // Po přihlášení načti uživatele
      await checkAuth();
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Přihlášení selhalo';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // I když logout selže, smažeme uživatele lokálně
      setUser(null);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      await authService.register(userData);
      // Po registraci načti uživatele (pokud backend automaticky přihlašuje)
      await checkAuth();
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registrace selhala';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Helper funkce pro kontrolu oprávnění
  // Použití: hasPermission('users', 'write') nebo hasPermission('users.write')
  const hasPermission = (moduleName, permission = null) => {
    if (!user || !user.permissions) return false;

    // Pokud je permission ve formátu "module.permission"
    if (!permission && moduleName.includes('.')) {
      const [module, perm] = moduleName.split('.');
      moduleName = module;
      permission = perm;
    }

    // Najdi modul
    const module = user.permissions.find(m => m.module_name === moduleName);
    if (!module) return false;

    // Pokud není zadáno konkrétní oprávnění, kontroluj jestli modul existuje
    if (!permission) return true;

    // Zkontroluj konkrétní oprávnění (read, write, admin)
    return module.permissions.includes(permission);
  };

  // Helper funkce pro kontrolu jestli má admin práva na modul
  const hasAdminPermission = (moduleName) => {
    return hasPermission(moduleName, 'admin');
  };

  // Helper funkce pro kontrolu jestli má write práva na modul
  const hasWritePermission = (moduleName) => {
    return hasPermission(moduleName, 'write') || hasPermission(moduleName, 'admin');
  };

  // Helper funkce pro kontrolu jestli má read práva na modul
  const hasReadPermission = (moduleName) => {
    return hasPermission(moduleName, 'read') ||
           hasPermission(moduleName, 'write') ||
           hasPermission(moduleName, 'admin');
  };

  // Helper pro kontrolu jestli je aktivní
  const isActive = () => {
    return user?.is_active === true;
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    checkAuth,
    isAuthenticated: !!user,
    isActive,
    hasPermission,
    hasAdminPermission,
    hasWritePermission,
    hasReadPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook pro použití auth contextu
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/*USAGE
const { hasPermission, hasWritePermission, user } = useAuth();

// Zobraz tlačítko jen pokud má write práva na users
{hasWritePermission('users') && <Button>Přidat uživatele</Button>}

// Nebo:
{hasPermission('users', 'admin') && <AdminPanel />}

// Nebo tečkovou notací:
{hasPermission('users.admin') && <AdminPanel />}

// Info o uživateli:
<p>Client ID: {user.client_id}</p>
<p>Aktivní: {user.is_active ? 'Ano' : 'Ne'}</p>
*/
