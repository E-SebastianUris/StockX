import api from './client';

export const TIPOS_MOVIMIENTO = [
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
  { value: 'AJUSTE', label: 'Ajuste manual' },
];

export const TIPOS_MOVIMIENTO_FILTRO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
  { value: 'AJUSTE', label: 'Ajuste manual' },
  { value: 'VENTA', label: 'Venta' },
];

export const movimientosApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/ventas/movimientos/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/ventas/movimientos/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/ventas/movimientos/', data);
    return response.data;
  },
};

