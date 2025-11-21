import { Alert, Button, Card, Label, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { HiLockClosed, HiUser } from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login({
      client_id: clientId,
      client_secret: clientSecret
    });

    if (result.success) {
      navigate(from, { replace: true });
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-xl">
        {/* Logo a nadpis */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <HiLockClosed className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Vítejte zpět
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Přihlaste se ke svému účtu
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <Alert color="failure" className="mb-4">
            <span className="font-medium">Chyba!</span> {error}
          </Alert>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="client_id" value="Client ID" />
            </div>
            <TextInput
              id="client_id"
              type="text"
              icon={HiUser}
              placeholder="Zadejte váš Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="client_secret" value="Client Secret" />
            </div>
            <TextInput
              id="client_secret"
              type="password"
              icon={HiLockClosed}
              placeholder="Zadejte váš Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Přihlašování...</span>
              </div>
            ) : (
              'Přihlásit se'
            )}
          </Button>
        </form>

        {/* Footer text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Máte problémy s přihlášením?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
              Kontaktujte podporu
            </a>
          </p>
        </div>
      </Card>

      {/* Copyright footer */}
      <div className="absolute bottom-4 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} MyApp. Všechna práva vyhrazena.
      </div>
    </div>
  );
};
