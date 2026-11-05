import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productosApi, categoriasApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';

export default function ProductosPage() {
  const { isAdmin } = useAuth();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Alertas contadores
  const [alertasStockCount, setAlertasStockCount] = useState(0);
  const [alertasVencCount, setAlertasVencCount] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [alertaFiltro, setAlertaFiltro] = useState(''); // '' | 'alerta_stock' | 'sin_stock'

  // Modal Detalle (Read-only para Admin y Vendedor)
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Crear / Editar (Solo Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barra: '',
    categoria_id: '',
    descripcion: '',
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

  // Cargar métricas de alertas activas
  const loadAlertasCounters = useCallback(async () => {
    try {
      const [stockAlerts, vencAlerts] = await Promise.all([
        productosApi.getAlertasStock(),
        productosApi.getAlertasVencimiento(),
      ]);
      setAlertasStockCount(stockAlerts.length);
      setAlertasVencCount(vencAlerts.length);
    } catch (err) {
      console.error('Error al obtener alertas:', err);
    }
  }, []);

  useEffect(() => {
    loadAlertasCounters();
  }, [loadAlertasCounters]);

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
      const detail = await productosApi.getById(item.id);
      setEditingItem(detail);
      setFormData({
        nombre: detail.nombre,
        codigo_barra: detail.codigo_barra || '',
        categoria_id: detail.categoria?.id ? String(detail.categoria.id) : '',
        descripcion: detail.descripcion || '',
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

  const handleOpenDetail = async (item) => {
    setLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const detail = await productosApi.getById(item.id);
      setDetailItem(detail);
    } catch (err) {
      console.error('Error al cargar detalle del producto:', err);
    } finally {
      setLoadingDetail(false);
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
      loadAlertasCounters();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      const errors = err.response?.data;
      let firstError = 'Error al guardar producto. Verifique los datos ingresados.';
      if (typeof errors === 'string') {
        firstError = errors;
      } else if (errors && typeof errors === 'object') {
        if (errors.detail) {
          firstError = errors.detail;
        } else {
          for (const key of ['codigo_barra', 'nombre', 'categoria_id', 'precio_venta', 'non_field_errors']) {
            if (errors[key]) {
              firstError = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key]);
              break;
            }
          }
        }
      }
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
      loadAlertasCounters();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      setDeleteError('No se pudo eliminar el producto. Podría tener movimientos o ventas asociadas.');
    } finally {
      setDeleting(false);
    }
  };

  const getVencimientoBadge = (fechaStr) => {
    if (!fechaStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr + 'T00:00:00');
    const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          Vencido ({fechaStr})
        </span>
      );
    }
    if (diffDias <= 15) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          Vence en {diffDias}d ({fechaStr})
        </span>
      );
    }
    return <span className="text-gray-500 dark:text-zinc-400 text-xs">{fechaStr}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Modern Page Header */}
      <PageHeader
        title="Productos"
        description={
          isAdmin
            ? 'Gestión total del inventario, precios y stock del kiosco'
            : 'Consulta de productos, stock disponible y precios de mostrador'
        }
        badge="Inventario"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      >
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-blue-500/25 transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        )}
      </PageHeader>

      {/* Tarjetas de Alertas Rápidas (Minimalistas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setAlertaFiltro(alertaFiltro === 'alerta_stock' ? '' : 'alerta_stock')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            alertaFiltro === 'alerta_stock'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400 dark:ring-amber-500'
              : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800/80 hover:border-amber-300 dark:hover:border-amber-800 shadow-xs'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Stock Bajo</p>
              <p className="text-xl font-black text-gray-900 dark:text-zinc-50">{alertasStockCount}</p>
            </div>
          </div>
          <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100/70 dark:bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
            {alertaFiltro === 'alerta_stock' ? 'Filtro activo' : 'Filtrar'}
          </span>
        </button>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-400 rounded-xl border border-red-200/60 dark:border-red-900/40">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Próximos a Vencer</p>
              <p className="text-xl font-black text-gray-900 dark:text-zinc-50">{alertasVencCount}</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium px-2.5 py-1 rounded-lg bg-gray-100/80 dark:bg-zinc-800 border border-gray-200/60 dark:border-zinc-700">
            ≤ 15 días
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código de barra..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Categoría Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100"
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
            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/60 text-gray-900 dark:text-zinc-100"
          >
            <option value="">Todos los estados</option>
            <option value="alerta_stock">⚠️ Stock Bajo</option>
            <option value="sin_stock">🚫 Sin Stock</option>
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando inventario...
          </div>
        ) : productos.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            No se encontraron productos con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-300">
              <thead className="bg-gray-50/70 dark:bg-zinc-800/50 text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Producto</th>
                  <th className="px-6 py-3.5">Categoría</th>
                  <th className="px-6 py-3.5">Precio Venta</th>
                  <th className="px-6 py-3.5">Stock</th>
                  <th className="px-6 py-3.5">Vencimiento</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/70">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{prod.nombre}</div>
                      {prod.codigo_barra && (
                        <div className="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                          {prod.codigo_barra}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border border-gray-200/60 dark:border-zinc-700/60">
                        {prod.categoria_nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-zinc-100">
                      ${Number(prod.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-gray-900 dark:text-zinc-100">{prod.stock_actual}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500">(mín: {prod.stock_minimo})</span>
                      </div>
                      {prod.sin_stock ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                          Sin stock
                        </span>
                      ) : prod.en_alerta_stock ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                          Stock bajo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {getVencimientoBadge(prod.fecha_vencimiento) || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          prod.activo
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                        }`}
                      >
                        {prod.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(prod)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/60 shadow-xs transition"
                        title="Ver detalle completo e historial de compras"
                      >
                        Ver Detalle
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleOpenDelete(prod.id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ver Detalle e Historial de Compras (Admin y Vendedor) */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailItem ? `Detalle: ${detailItem.nombre}` : 'Detalle del Producto'}
        maxWidth="max-w-2xl"
      >
        {loadingDetail || !detailItem ? (
          <div className="p-8 text-center text-gray-500 dark:text-zinc-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando información del producto...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200/80 dark:border-zinc-700/60 text-sm">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Categoría</p>
                <p className="font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{detailItem.categoria?.nombre || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Código Barra</p>
                <p className="font-mono text-gray-900 dark:text-zinc-100 mt-0.5">{detailItem.codigo_barra || 'Sin código'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Precio Venta</p>
                <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  ${Number(detailItem.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Costo Última Compra</p>
                <p className="font-semibold text-gray-800 dark:text-zinc-200 mt-0.5">
                  {detailItem.precio_costo !== null && detailItem.precio_costo !== undefined
                    ? `$${Number(detailItem.precio_costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                    : 'Sin costo registrado'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Stock Actual / Mínimo</p>
                <p className="font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">
                  {detailItem.stock_actual} / {detailItem.stock_minimo}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Vencimiento</p>
                <p className="font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{detailItem.fecha_vencimiento || '-'}</p>
              </div>
            </div>

            {detailItem.descripcion && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-gray-200/80 dark:border-zinc-700/60">
                  {detailItem.descripcion}
                </p>
              </div>
            )}

            {/* Historial de Compras (producto_proveedores) */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Historial de Compras a Proveedores
              </h4>

              {detailItem.producto_proveedores && detailItem.producto_proveedores.length > 0 ? (
                <div className="border border-gray-200 dark:border-zinc-700/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-600 dark:text-zinc-300">
                    <thead className="bg-gray-100/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Proveedor</th>
                        <th className="px-4 py-2.5">Cód. Art.</th>
                        <th className="px-4 py-2.5">Fecha Compra</th>
                        <th className="px-4 py-2.5 text-right">Cant. Comprada</th>
                        <th className="px-4 py-2.5 text-right">Precio Compra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-700/80">
                      {detailItem.producto_proveedores.map((pp) => (
                        <tr key={pp.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40">
                          <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-zinc-100">
                            {pp.proveedor?.nombre || 'Proveedor'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-zinc-400">
                            {pp.codigo_articulo_proveedor || '-'}
                          </td>
                          <td className="px-4 py-2.5">{pp.fecha_compra || '-'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-zinc-200">
                            {pp.cantidad_compra ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-zinc-100">
                            ${Number(pp.precio_compra).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-center">
                  No hay compras registradas con proveedores para este producto.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

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
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Nombre del producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Alfajor Guaymallén Blanco"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Código de Barra
                </label>
                <input
                  type="text"
                  value={formData.codigo_barra}
                  onChange={(e) => setFormData({ ...formData, codigo_barra: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: 7791234567890"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio Costo solo lectura si editamos */}
              {editingItem && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                    Costo Última Compra (Calculado)
                  </label>
                  <div className="px-3.5 py-2.5 bg-gray-100/70 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-700 dark:text-zinc-300 font-semibold">
                    {editingItem.precio_costo !== null && editingItem.precio_costo !== undefined
                      ? `$${Number(editingItem.precio_costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                      : 'Sin compras registradas'}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Precio Venta ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-600 dark:text-blue-400 bg-gray-50/50 dark:bg-zinc-800/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Stock Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <input
                  type="checkbox"
                  id="prod-activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-zinc-700 rounded"
                />
                <label htmlFor="prod-activo" className="ml-2 block text-sm text-gray-700 dark:text-zinc-300 font-semibold">
                  Producto activo para venta
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Descripción / Notas
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Detalles sobre presentación, sabor o paquete..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center min-w-[90px] shadow-sm shadow-blue-500/25"
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
