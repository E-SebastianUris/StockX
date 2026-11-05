import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { movimientosApi, TIPOS_MOVIMIENTO, TIPOS_MOVIMIENTO_FILTRO } from '../../api/movimientos';
import { productosApi } from '../../api/inventario';
import Modal from '../../components/Modal';

export default function MovimientosPage() {
  const { isAdmin } = useAuth();

  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedProducto, setSelectedProducto] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modal Alta Manual (Solo ADMIN)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    producto_id: '',
    tipo: 'INGRESO',
    cantidad: '',
    motivo: '',
    fecha_vencimiento_asociada: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar productos para selectors
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const data = await productosApi.getAll();
        setProductos(data);
      } catch (err) {
        console.error('Error al cargar productos para filtro:', err);
      }
    };
    fetchProductos();
  }, []);

  // Cargar historial de movimientos
  const loadMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedProducto) params.producto = selectedProducto;
      if (selectedTipo) params.tipo = selectedTipo;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const data = await movimientosApi.getAll(params);
      setMovimientos(data);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProducto, selectedTipo, fechaDesde, fechaHasta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMovimientos();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadMovimientos]);

  const handleOpenCreate = () => {
    setFormData({
      producto_id: productos[0]?.id ? String(productos[0].id) : '',
      tipo: 'INGRESO',
      cantidad: '',
      motivo: '',
      fecha_vencimiento_asociada: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.producto_id) {
      setFormError('Debe seleccionar un producto.');
      return;
    }

    const cantidadNum = parseInt(formData.cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum === 0) {
      setFormError('La cantidad debe ser un número entero diferente de cero.');
      return;
    }

    if ((formData.tipo === 'INGRESO' || formData.tipo === 'EGRESO') && cantidadNum < 0) {
      setFormError('Para Ingreso y Egreso ingrese un valor positivo (el sistema lo descontará automáticamente en caso de egreso).');
      return;
    }

    if (!formData.motivo.trim()) {
      setFormError('El motivo o justificación del movimiento es obligatorio.');
      return;
    }

    setSaving(true);

    const payload = {
      producto_id: Number(formData.producto_id),
      tipo: formData.tipo,
      cantidad: cantidadNum,
      motivo: formData.motivo.trim(),
      fecha_vencimiento_asociada: formData.fecha_vencimiento_asociada || null,
    };

    try {
      await movimientosApi.create(payload);
      setIsModalOpen(false);
      loadMovimientos();
    } catch (err) {
      console.error('Error al registrar movimiento:', err);
      const resp = err.response;
      if (resp?.status === 403) {
        setFormError('Permiso denegado: solo usuarios con rol Administrador pueden registrar movimientos manuales.');
      } else {
        const data = resp?.data;
        let errorMsg = 'Error al registrar el movimiento. Verifique los datos ingresados.';

        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data && typeof data === 'object') {
          if (data.detail) {
            errorMsg = data.detail;
          } else {
            // DRF puede retornar strings directos o arrays de strings por campo
            for (const key of ['cantidad', 'motivo', 'producto_id', 'tipo', 'non_field_errors']) {
              if (data[key]) {
                const val = data[key];
                errorMsg = Array.isArray(val) ? val[0] : String(val);
                break;
              }
            }
          }
        }

        setFormError(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const formatFecha = (isoStr) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'INGRESO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Ingreso
          </span>
        );
      case 'EGRESO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            Egreso
          </span>
        );
      case 'AJUSTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Ajuste
          </span>
        );
      case 'VENTA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Venta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {tipo}
          </span>
        );
    }
  };

  const formatCantidad = (tipo, cant) => {
    if (tipo === 'INGRESO') return `+${cant}`;
    if (tipo === 'EGRESO' || tipo === 'VENTA') return `-${Math.abs(cant)}`;
    return cant > 0 ? `+${cant}` : `${cant}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Movimientos de Stock</h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? 'Trazabilidad y registro manual de ingresos, egresos y ajustes de mercadería'
              : 'Historial y trazabilidad de movimientos de stock (modo lectura)'}
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
            Registrar Movimiento
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Producto filter */}
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
            Producto
          </label>
          <select
            value={selectedProducto}
            onChange={(e) => setSelectedProducto(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">Todos los productos</option>
            {productos.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo filter */}
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
            Tipo de movimiento
          </label>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            {TIPOS_MOVIMIENTO_FILTRO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha Desde */}
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          />
        </div>

        {/* Fecha Hasta */}
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando historial de movimientos...
          </div>
        ) : movimientos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron movimientos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Fecha y Hora</th>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3 text-right">Cantidad</th>
                  <th className="px-6 py-3">Motivo / Venta</th>
                  <th className="px-6 py-3">Venc. Asociado</th>
                  <th className="px-6 py-3">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatFecha(mov.fecha_movimiento)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {mov.producto_nombre || `Producto #${mov.producto}`}
                    </td>
                    <td className="px-6 py-4">{getTipoBadge(mov.tipo)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      <span
                        className={
                          mov.tipo === 'INGRESO'
                            ? 'text-emerald-700'
                            : mov.tipo === 'EGRESO' || mov.tipo === 'VENTA'
                            ? 'text-rose-700'
                            : 'text-amber-800'
                        }
                      >
                        {formatCantidad(mov.tipo, mov.cantidad)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {mov.motivo ? (
                        mov.motivo
                      ) : mov.venta ? (
                        <span className="text-blue-600 font-mono text-xs">Venta #{mov.venta}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {mov.fecha_vencimiento_asociada || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium text-xs">
                      {mov.usuario_username || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Movimiento (Solo ADMIN) */}
      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Registrar Movimiento de Stock"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.producto_id}
                onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nombre} (Stock actual: {prod.stock_actual})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Tipo de Movimiento <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                >
                  {TIPOS_MOVIMIENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  placeholder={formData.tipo === 'AJUSTE' ? 'Ej: 5 o -3' : 'Ej: 10'}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              {formData.tipo === 'INGRESO' && '• Ingreso: aumenta el stock del producto seleccionado.'}
              {formData.tipo === 'EGRESO' && '• Egreso: descuenta unidades del stock (no puede superar el disponible).'}
              {formData.tipo === 'AJUSTE' && '• Ajuste: ingrese valores positivos para sumar o negativos para restar. No puede dejar stock menor a 0.'}
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Motivo / Justificación <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Reposición de mercadería, rotura de paquete, corrección de inventario..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Fecha de Vencimiento Asociada (Opcional)
              </label>
              <input
                type="date"
                value={formData.fecha_vencimiento_asociada}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento_asociada: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
                  'Registrar'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

