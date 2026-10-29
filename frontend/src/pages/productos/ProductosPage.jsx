import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productosApi, categoriasApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ProductosPage() {
  const { isAdmin } = useAuth();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [alertaFiltro, setAlertaFiltro] = useState(''); // '' | 'alerta_stock' | 'sin_stock'

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barra: '',
    categoria_id: '',
    descripcion: '',
    precio_costo: '0',
    precio_venta: '0',
    stock_actual: '0',
    stock_minimo: '5',
    fecha_vencimiento: '',
    activo: true,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirmar eliminación
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Cargar categorías para selector
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await categoriasApi.getAll({ activo: true });
        setCategorias(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar productos con filtros
  const loadProductos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategoria) params.categoria = selectedCategoria;
      if (alertaFiltro === 'alerta_stock') params.alerta_stock = 'true';
      if (alertaFiltro === 'sin_stock') params.sin_stock = 'true';

      const data = await productosApi.getAll(params);
      setProductos(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategoria, alertaFiltro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProductos();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProductos]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      nombre: '',
      codigo_barra: '',
      categoria_id: categorias[0]?.id ? String(categorias[0].id) : '',
      descripcion: '',
      precio_costo: '0',
      precio_venta: '0',
      stock_actual: '0',
      stock_minimo: '5',
      fecha_vencimiento: '',
      activo: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (item) => {
    setFormError('');
    try {
      // Obtenemos el detalle completo (incluye precio_costo y descripcion)
      const detail = await productosApi.getById(item.id);
      setEditingItem(detail);
      setFormData({
        nombre: detail.nombre,
        codigo_barra: detail.codigo_barra || '',
        categoria_id: detail.categoria?.id ? String(detail.categoria.id) : '',
        descripcion: detail.descripcion || '',
        precio_costo: String(detail.precio_costo ?? 0),
        precio_venta: String(detail.precio_venta ?? 0),
        stock_actual: String(detail.stock_actual ?? 0),
        stock_minimo: String(detail.stock_minimo ?? 0),
        fecha_vencimiento: detail.fecha_vencimiento || '',
        activo: detail.activo,
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error al obtener detalle del producto:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (!formData.categoria_id) {
      setFormError('Debe seleccionar una categoría.');
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      nombre: formData.nombre.trim(),
      codigo_barra: formData.codigo_barra.trim() || null,
      categoria_id: Number(formData.categoria_id),
      descripcion: formData.descripcion.trim(),
      precio_costo: Number(formData.precio_costo) || 0,
      precio_venta: Number(formData.precio_venta) || 0,
      stock_actual: parseInt(formData.stock_actual, 10) || 0,
      stock_minimo: parseInt(formData.stock_minimo, 10) || 0,
      fecha_vencimiento: formData.fecha_vencimiento || null,
      activo: formData.activo,
    };

    try {
      if (editingItem) {
        await productosApi.update(editingItem.id, payload);
      } else {
        await productosApi.create(payload);
      }
      setIsModalOpen(false);
      loadProductos();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      const errors = err.response?.data;
      const firstError =
        errors?.codigo_barra?.[0] ||
        errors?.nombre?.[0] ||
        errors?.categoria_id?.[0] ||
        errors?.precio_venta?.[0] ||
        'Error al guardar producto. Verifique los datos ingresados.';
      setFormError(firstError);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await productosApi.delete(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
      loadProductos();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      setDeleteError('No se pudo eliminar el producto. Podría tener movimientos o ventas asociadas.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper para estado de vencimiento
  const getVencimientoBadge = (fechaStr) => {
    if (!fechaStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr + 'T00:00:00');
    const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
          Vencido ({fechaStr})
        </span>
      );
    }
    if (diffDias <= 15) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
          Vence en {diffDias}d ({fechaStr})
        </span>
      );
    }
    return <span className="text-gray-500 text-xs">{fechaStr}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Productos</h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? 'Gestión total del inventario, precios y stock del kiosco'
              : 'Consulta de productos, stock disponible y precios de mostrador'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código de barra..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Categoría Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Alerta Filter */}
        <div className="w-full md:w-48">
          <select
            value={alertaFiltro}
            onChange={(e) => setAlertaFiltro(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="alerta_stock">⚠️ Stock Bajo</option>
            <option value="sin_stock">🚫 Sin Stock</option>
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando inventario...
          </div>
        ) : productos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron productos con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Precio Venta</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3">Estado</th>
                  {isAdmin && <th className="px-6 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{prod.nombre}</div>
                      {prod.codigo_barra && (
                        <div className="text-xs text-gray-400 font-mono">
                          Cód: {prod.codigo_barra}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                        {prod.categoria_nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ${Number(prod.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-800">{prod.stock_actual}</span>
                        <span className="text-xs text-gray-400">(mín: {prod.stock_minimo})</span>
                      </div>
                      {prod.sin_stock ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">
                          Sin stock
                        </span>
                      ) : prod.en_alerta_stock ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                          Stock bajo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {getVencimientoBadge(prod.fecha_vencimiento) || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prod.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {prod.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleOpenDelete(prod.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar (Solo Admin) */}
      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Editar Producto' : 'Nuevo Producto'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Nombre del producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Alfajor Guaymallén Blanco"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Código de Barra
                </label>
                <input
                  type="text"
                  value={formData.codigo_barra}
                  onChange={(e) => setFormData({ ...formData, codigo_barra: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: 7791234567890"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Precio Costo ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio_costo}
                  onChange={(e) => setFormData({ ...formData, precio_costo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Precio Venta ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Stock Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <input
                  type="checkbox"
                  id="prod-activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="prod-activo" className="ml-2 block text-sm text-gray-700 font-medium">
                  Producto activo para venta
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Descripción / Notas
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Detalles sobre presentación, sabor o paquete..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center min-w-[90px]"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmación Eliminar */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Producto"
          message="¿Estás seguro de que deseás eliminar este producto? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          loading={deleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
