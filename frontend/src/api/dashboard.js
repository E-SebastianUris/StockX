import api from './client';

export const dashboardApi = {
  getMetrics: async (params = {}) => {
    const response = await api.get('/dashboard/', { params });
    return response.data;
  },
  getMasVendidos: async (params = {}) => {
    const response = await api.get('/dashboard/mas-vendidos/', { params });
    return response.data;
  },
  getRotacion: async (params = {}) => {
    const response = await api.get('/dashboard/rotacion/', { params });
    return response.data;
  },
  getAlertas: async () => {
    const response = await api.get('/dashboard/alertas/');
    return response.data;
  },
};

