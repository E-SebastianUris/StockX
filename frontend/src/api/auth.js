import api from './client';

export const authApi = {
  login: async (username, password) => {
    const response = await api.post('/auth/token/', { username, password });
    return response.data;
  },

  refreshToken: async (refresh) => {
    const response = await api.post('/auth/token/refresh/', { refresh });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  },
};

