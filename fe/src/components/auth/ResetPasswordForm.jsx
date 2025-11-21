import { Alert, Button, Card, Label, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { HiLockClosed } from 'react-icons/hi';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export const ResetPasswordForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Vyčistit zprávy při změně
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Staré heslo je povinné');
      return false;
    }
    if (!formData.new_password) {
      setError('Nové heslo je povinné');
      return false;
    }
    if (formData.new_password.length < 8) {
      setError('Nové heslo musí mít alespoň 8 znaků');
      return false;
    }
    if (formData.new_password !== formData.new_password_confirm) {
      setError('Nová hesla se neshodují');
      return false;
    }
    if (formData.password === formData.new_password) {
      setError('Nové heslo musí být odlišné od starého hesla');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await api.post(`/auth/${user.client_id}/reset-password`, {
        password: formData.password,
        new_password: formData.new_password,
        new_password_confirm: formData.new_password_confirm,
      });

      setSuccess('Heslo bylo úspěšně změněno!');
      // Vyčistit formulář
      setFormData({
        password: '',
        new_password: '',
        new_password_confirm: '',
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Chyba při změně hesla. Zkontrolujte prosím staré heslo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Změna hesla
      </h3>

      {error && (
        <Alert color="failure" className="mb-4">
          <span className="font-medium">Chyba!</span> {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" className="mb-4">
          <span className="font-medium">Úspěch!</span> {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="password" value="Současné heslo" />
          </div>
          <TextInput
            id="password"
            name="password"
            type="password"
            icon={HiLockClosed}
            placeholder="Zadejte současné heslo"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="new_password" value="Nové heslo" />
          </div>
          <TextInput
            id="new_password"
            name="new_password"
            type="password"
            icon={HiLockClosed}
            placeholder="Zadejte nové heslo (min. 8 znaků)"
            value={formData.new_password}
            onChange={handleChange}
            required
            disabled={loading}
            helperText="Heslo musí obsahovat alespoň 8 znaků"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="new_password_confirm" value="Potvrzení nového hesla" />
          </div>
          <TextInput
            id="new_password_confirm"
            name="new_password_confirm"
            type="password"
            icon={HiLockClosed}
            placeholder="Zadejte nové heslo znovu"
            value={formData.new_password_confirm}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading} color="blue">
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Ukládání...</span>
              </div>
            ) : (
              'Změnit heslo'
            )}
          </Button>
          <Button
            type="button"
            color="gray"
            onClick={() => {
              setFormData({
                password: '',
                new_password: '',
                new_password_confirm: '',
              });
              setError('');
              setSuccess('');
            }}
            disabled={loading}
          >
            Zrušit
          </Button>
        </div>
      </form>
    </Card>
  );
};
