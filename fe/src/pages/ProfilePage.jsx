import { Badge, Button, Card, Label, Spinner, ToggleSwitch } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { HiMail, HiRefresh, HiShieldCheck, HiUser } from 'react-icons/hi';
import api from '../api/client';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchUserDetails();
    // Kontrola dark mode z localStorage
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
  }, []);

  const fetchUserDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const response = await api.get('/auth/me');
      setUserDetails(response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      if (isRefresh) {
        // Krátké zpoždění pro lepší UX
        setTimeout(() => {
          setRefreshing(false);
        }, 500);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchUserDetails(true);
  };

  const handleDarkModeToggle = (enabled) => {
    setDarkMode(enabled);
    localStorage.setItem('darkMode', enabled.toString());

    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Můj profil</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Spravujte své osobní informace a nastavení
        </p>
      </div>

      {/* Profil Card s animací při refreshing */}
      <Card className={`transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className={`w-24 h-24 rounded-full ${getAvatarColor(userDetails?.client_id)} flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 transition-transform duration-300 ${refreshing ? 'scale-95' : 'scale-100'}`}>
            {getInitials(userDetails?.client_id)}
          </div>

          {/* User info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userDetails?.client_id}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge color={userDetails?.is_active ? 'success' : 'failure'}>
                {userDetails?.is_active ? 'Aktivní' : 'Neaktivní'}
              </Badge>
              {userDetails?.valid && (
                <Badge color="info" icon={HiShieldCheck}>
                  Ověřený
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Základní informace */}
      <Card className={`transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Základní informace
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="user_id" value="User ID" className="mb-2" />
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <HiUser className="text-gray-500 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white font-medium">
                {userDetails?.user_id}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="client_id" value="Client ID" className="mb-2" />
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <HiUser className="text-gray-500 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white font-medium">
                {userDetails?.client_id}
              </span>
            </div>
          </div>

          {userDetails?.email && (
            <div>
              <Label htmlFor="email" value="Email" className="mb-2" />
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <HiMail className="text-gray-500 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">
                  {userDetails?.email}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Nastavení */}
      <Card>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Nastavení
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label value="Tmavý režim" className="mb-1" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Přepnout mezi světlým a tmavým režimem
              </p>
            </div>
            <ToggleSwitch
              checked={darkMode}
              onChange={handleDarkModeToggle}
            />
          </div>
        </div>
      </Card>

      {/* Změna hesla */}
      <ResetPasswordForm />

      {/* Oprávnění */}
      <Card className={`transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Oprávnění a přístupy
        </h3>

        {userDetails?.permissions && userDetails.permissions.length > 0 ? (
          <div className="space-y-4">
            {userDetails.permissions.map((module, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 capitalize">
                  {module.module_name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {module.permissions.map((permission, permIndex) => (
                    <Badge key={permIndex} color="blue">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Žádná oprávnění nejsou přiřazena
          </p>
        )}
      </Card>

      {/* Akce */}
      <Card>
        <div className="flex gap-4">
          <Button
            color="blue"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <HiRefresh className={`mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Obnovování...' : 'Obnovit údaje'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
