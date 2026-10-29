import api from './client';

export const categoriasApi = {
  getAll: async (params) => {
    const response = await api.get('/inventario/categorias/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/inventario/categorias/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/inventario/categorias/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/inventario/categorias/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/inventario/categorias/${id}/`);
    return response.data;
  },
};

export const proveedoresApi = {
  getAll: async (params) => {
    const response = await api.get('/inventario/proveedores/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/inventario/proveedores/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/inventario/proveedores/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/inventario/proveedores/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/inventario/proveedores/${id}/`);
    return response.data;
  },
};

export const productosApi = {
  getAll: async (params) => {
    const response = await api.get('/inventario/productos/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/inventario/productos/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/inventario/productos/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/inventario/productos/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/inventario/productos/${id}/`);
    return response.data;
  },
  getAlertasStock: async () => {
    const response = await api.get('/inventario/productos/alertas-stock/');
    return response.data;
  },
  getAlertasVencimiento: async () => {
    const response = await api.get('/inventario/productos/alertas-vencimiento/');
    return response.data;
  },
};

