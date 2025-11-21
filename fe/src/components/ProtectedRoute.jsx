import { Spinner } from 'flowbite-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireModule = null,        // např. 'users'
  requirePermission = null,    // např. 'write' nebo ['users', 'write']
  requireActive = false,       // vyžaduje is_active = true
  redirectTo = '/login'
}) => {
  const { user, loading, hasPermission, isActive } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  // Kontrola přihlášení - uložíme původní URL
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Kontrola jestli je uživatel aktivní
  if (requireActive && !isActive()) {
    return <Navigate to="/inactive" replace />;
  }

  // Kontrola oprávnění - pokud je to string s tečkou: "users.write"
  if (requirePermission && typeof requirePermission === 'string') {
    if (!hasPermission(requirePermission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Kontrola oprávnění - pokud je to array: ['users', 'write']
  if (requirePermission && Array.isArray(requirePermission)) {
    const [module, perm] = requirePermission;
    if (!hasPermission(module, perm)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Kontrola existence modulu
  if (requireModule && !hasPermission(requireModule)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};


/*USAGE
<ProtectedRoute
  requireAuth={true}                    // vyžaduje přihlášení
  requireModule="users"                 // vyžaduje přístup k modulu
  requirePermission="users.write"       // vyžaduje konkrétní oprávnění (tečková notace)
  requirePermission={['users', 'write']} // nebo jako array
  requireActive={true}                  // vyžaduje is_active = true
  redirectTo="/login"                   // kam přesměrovat
>
  <AdminPage />
</ProtectedRoute>
*/
