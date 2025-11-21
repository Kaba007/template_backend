import api from './client';

export const authService = {
  // Přihlášení - nastaví cookie na backendu
  login: async (credentials) => {
    const response = await api.post('/api/v1/auth/login', credentials);
    return response.data;
  },

  // Odhlášení - smaže cookie na backendu
  logout: async () => {
    const response = await api.post('/api/v1/auth/logout');
    return response.data;
  },

  // Získání aktuálního uživatele
  getMe: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  // Registrace (pokud máte)
  register: async (userData) => {
    const response = await api.post('/api/v1/auth/register', userData);
    return response.data;
  },
};
