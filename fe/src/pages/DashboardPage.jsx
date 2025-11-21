import { Button, Card } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';
import { PermissionGuard } from '../components/PermissionGuard';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleLogout} color="failure">
          Odhlásit se
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Základní info o uživateli - vidí každý */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Profil</h2>
          <p><strong>Client ID:</strong> {user?.client_id}</p>
          <p><strong>User ID:</strong> {user?.user_id}</p>
          <p><strong>Aktivní:</strong> {user?.is_active ? 'Ano' : 'Ne'}</p>
        </Card>

        {/* Oprávnění - vidí každý */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Vaše oprávnění</h2>
          {user?.permissions && user.permissions.length > 0 ? (
            <div className="space-y-3">
              {user.permissions.map((perm, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3">
                  <p className="font-semibold text-gray-700">{perm.module_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {perm.permissions.map((permission, permIndex) => (
                      <span
                        key={permIndex}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Žádná speciální oprávnění</p>
          )}
        </Card>

        {/* Obsah jen pro adminy */}
        <PermissionGuard requireAdmin="admin">
          <Card className="border-2 border-blue-500">
            <h2 className="text-xl font-bold mb-4 text-blue-600">
              Admin Panel
            </h2>
            <p>Tento obsah vidí pouze administrátoři!</p>
            <Button className="mt-4">Spravovat uživatele</Button>
          </Card>
        </PermissionGuard>

        {/* Obsah jen pro uživatele s write právy na users */}
        <PermissionGuard requireWrite="users">
          <Card className="border-2 border-green-500">
            <h2 className="text-xl font-bold mb-4 text-green-600">
              Správa uživatelů
            </h2>
            <p>Můžete editovat uživatele!</p>
            <Button className="mt-4" color="success">
              Přidat uživatele
            </Button>
          </Card>
        </PermissionGuard>

        {/* Obsah jen pro read práva na tasks */}
        <PermissionGuard requireRead="tasks">
          <Card className="border-2 border-yellow-500">
            <h2 className="text-xl font-bold mb-4 text-yellow-600">
              Úkoly
            </h2>
            <p>Můžete zobrazit úkoly!</p>
            <Button className="mt-4" color="warning">
              Zobrazit úkoly
            </Button>
          </Card>
        </PermissionGuard>

        {/* Obsah pro modul */}
        <PermissionGuard module="client_card">
          <Card className="border-2 border-purple-500">
            <h2 className="text-xl font-bold mb-4 text-purple-600">
              Klientské karty
            </h2>
            <p>Máte přístup k modulu klientských karet</p>
            <Button className="mt-4" color="purple">
              Otevřít karty
            </Button>
          </Card>
        </PermissionGuard>
      </div>
    </div>
  );
};
