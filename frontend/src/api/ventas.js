import api from './client';

export const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'OTRO', label: 'Otro' },
];

export const ventasApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/ventas/ventas/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/ventas/ventas/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/ventas/ventas/', data);
    return response.data;
  },
};

