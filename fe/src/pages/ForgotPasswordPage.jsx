import { Alert, Button, Card, Label, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { HiLockClosed, HiMail } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await api.post('/api/v1/email/forgot-password', {
        email: email
      });

      // Backend vrací success=true pro úspěch
      if (response.data && response.data.success === true) {
        setSuccess(true);
        // Po 8 sekundách přesměruj na login
        setTimeout(() => {
          navigate('/login');
        }, 8000);
      } else {
        // Pokud success=false (což by nemělo nastat při 200 OK)
        setError(response.data?.message || 'Nepodařilo se obnovit heslo.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);

      // Backend vrací 404 s JSON obsahujícím success=false a message
      if (err.response) {
        // Server odpověděl s error status code (např. 404)
        const errorData = err.response.data;

        if (errorData && errorData.success === false) {
          // Backend explicitně říká success=false
          setError(errorData.message || 'Uživatel s tímto emailem nebyl nalezen.');
        } else {
          // Jiná chyba serveru
          const errorMessage =
            errorData?.detail ||
            errorData?.message ||
            `Chyba serveru (${err.response.status})`;
          setError(errorMessage);
        }
      } else if (err.request) {
        // Request byl odeslán, ale nepřišla odpověď
        setError('Nelze se připojit k serveru. Zkontrolujte připojení k internetu.');
      } else {
        // Chyba při vytváření requestu
        setError('Nastala neočekávaná chyba. Zkuste to prosím znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md shadow-xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <HiMail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email odeslán!
            </h1>
            <Alert color="success" className="mb-4">
              <span className="font-medium">Úspěch!</span> Pokud účet s tímto emailem existuje, bylo odesláno nové heslo.
            </Alert>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Zkontrolujte svou emailovou schránku (i spam) a přihlaste se s novým heslem.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Budete přesměrováni na přihlášení za 8 sekund...
            </p>
            <Button
              color="blue"
              onClick={() => navigate('/login')}
              className="mt-4"
            >
              Přejít na přihlášení
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-xl">
        {/* Logo a nadpis */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <HiLockClosed className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Zapomenuté heslo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Zadejte svůj email a my vám pošleme nové heslo
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <Alert color="failure" className="mb-4" onDismiss={() => setError('')}>
            <span className="font-medium">Chyba!</span> {error}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="email" value="Email" />
            </div>
            <TextInput
              id="email"
              type="email"
              icon={HiMail}
              placeholder="Zadejte váš email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Odesílání...</span>
              </div>
            ) : (
              'Obnovit heslo'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Vzpomněli jste si na heslo?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline"
            >
              Přihlásit se
            </button>
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
