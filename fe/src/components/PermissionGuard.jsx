import { useAuth } from '../contexts/AuthContext';

// Komponenta pro podmíněné zobrazení podle oprávnění
export const PermissionGuard = ({
  children,
  module = null,           // např. 'users' - má přístup k modulu?
  permission = null,       // např. 'users.write' nebo ['users', 'write']
  requireRead = null,      // např. 'users' - má read právo?
  requireWrite = null,     // např. 'users' - má write právo?
  requireAdmin = null,     // např. 'users' - má admin právo?
  requireActive = false,   // vyžaduje is_active = true
  fallback = null
}) => {
  const { hasPermission, hasReadPermission, hasWritePermission, hasAdminPermission, isActive } = useAuth();

  // Kontrola jestli je aktivní
  if (requireActive && !isActive()) {
    return fallback;
  }

  // Kontrola přístupu k modulu
  if (module && !hasPermission(module)) {
    return fallback;
  }

  // Kontrola konkrétního oprávnění - string s tečkou
  if (permission && typeof permission === 'string' && !hasPermission(permission)) {
    return fallback;
  }

  // Kontrola konkrétního oprávnění - array
  if (permission && Array.isArray(permission)) {
    const [mod, perm] = permission;
    if (!hasPermission(mod, perm)) {
      return fallback;
    }
  }

  // Helper kontroly
  if (requireRead && !hasReadPermission(requireRead)) {
    return fallback;
  }

  if (requireWrite && !hasWritePermission(requireWrite)) {
    return fallback;
  }

  if (requireAdmin && !hasAdminPermission(requireAdmin)) {
    return fallback;
  }

  return children;
};

/*USAGE
<PermissionGuard
  module="users"                      // má přístup k modulu users?
  permission="users.write"            // má konkrétní oprávnění? (tečková notace)
  permission={['users', 'write']}     // nebo jako array
  requireRead="tasks"                 // má read právo na tasks?
  requireWrite="users"                // má write právo na users?
  requireAdmin="admin"                // má admin právo na admin?
  requireActive={true}                // je aktivní uživatel?
  fallback={<p>Nemáte oprávnění</p>}  // co zobrazit když nemá práva
>
  <Button>Editovat</Button>
</PermissionGuard>

// Zobraz tlačítko jen když má write právo na users
<PermissionGuard requireWrite="users">
  <Button>Přidat uživatele</Button>
</PermissionGuard>

// Zobraz admin panel jen když má admin právo
<PermissionGuard requireAdmin="admin">
  <AdminPanel />
</PermissionGuard>

// S fallback textem
<PermissionGuard
  permission="users.write"
  fallback={<p className="text-red-500">Nemáte oprávnění</p>}
>
  <EditForm />
</PermissionGuard>

// Kontrola více podmínek najednou
<PermissionGuard
  module="tasks"
  requireWrite="tasks"
  requireActive={true}
>
  <TaskEditor />
</PermissionGuard>
*/
