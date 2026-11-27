import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { movimientosApi, TIPOS_MOVIMIENTO, TIPOS_MOVIMIENTO_FILTRO } from '../../api/movimientos';
import { productosApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

// Helpers de fecha para presets
const getFechaLocal = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getFechaDiasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return getFechaLocal(d);
};

const getFechaInicioMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function MovimientosPage() {
  const { isAdmin } = useAuth();

  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de backend
  const [selectedProducto, setSelectedProducto] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Filtro de búsqueda rápida y paginación
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  // Detección de preset de fecha activo
  const presetFechaActivo = useMemo(() => {
    const hoy = getFechaLocal();
    if (!fechaDesde && !fechaHasta) return 'TODOS';
    if (fechaDesde === hoy && fechaHasta === hoy) return 'HOY';
    if (fechaDesde === getFechaDiasAtras(6) && fechaHasta === hoy) return '7_DIAS';
    if (fechaDesde === getFechaInicioMes() && fechaHasta === hoy) return 'ESTE_MES';
    return 'CUSTOM';
  }, [fechaDesde, fechaHasta]);

  const aplicarPresetFecha = (preset) => {
    const hoy = getFechaLocal();
    switch (preset) {
      case 'TODOS':
        setFechaDesde('');
        setFechaHasta('');
        break;
      case 'HOY':
        setFechaDesde(hoy);
        setFechaHasta(hoy);
        break;
      case '7_DIAS':
        setFechaDesde(getFechaDiasAtras(6));
        setFechaHasta(hoy);
        break;
      case 'ESTE_MES':
        setFechaDesde(getFechaInicioMes());
        setFechaHasta(hoy);
        break;
      default:
        break;
    }
  };

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
      setMovimientos(data || []);
      setCurrentPage(1); // Reset a primera página en cada recarga
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

  // Métricas agregadas de los movimientos cargados
  const metricas = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    let ventas = 0;
    let balance = 0;

    movimientos.forEach((m) => {
      const cant = Number(m.cantidad) || 0;
      if (m.tipo === 'INGRESO') {
        ingresos += cant;
        balance += cant;
      } else if (m.tipo === 'EGRESO') {
        egresos += Math.abs(cant);
        balance -= Math.abs(cant);
      } else if (m.tipo === 'VENTA') {
        ventas += Math.abs(cant);
        balance -= Math.abs(cant);
      } else if (m.tipo === 'AJUSTE') {
        balance += cant;
      }
    });

    return { ingresos, egresos, ventas, balance };
  }, [movimientos]);

  // Filtrado rápido por búsqueda de texto
  const filteredMovimientos = useMemo(() => {
    if (!searchQuery.trim()) return movimientos;
    const q = searchQuery.toLowerCase().trim();
    return movimientos.filter((m) =>
      (m.producto_nombre && m.producto_nombre.toLowerCase().includes(q)) ||
      (m.motivo && m.motivo.toLowerCase().includes(q)) ||
      (m.usuario_username && m.usuario_username.toLowerCase().includes(q)) ||
      (m.venta && String(m.venta).includes(q))
    );
  }, [movimientos, searchQuery]);

  // Paginación
  const totalItems = filteredMovimientos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedMovimientos = useMemo(() => {
    const start = (currentSafePage - 1) * pageSize;
    return filteredMovimientos.slice(start, start + pageSize);
  }, [filteredMovimientos, currentSafePage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const hayFiltrosActivos = Boolean(selectedProducto || selectedTipo || fechaDesde || fechaHasta || searchQuery);

  const limpiarFiltros = () => {
    setSelectedProducto('');
    setSelectedTipo('');
    setFechaDesde('');
    setFechaHasta('');
    setSearchQuery('');
    setCurrentPage(1);
  };

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

    if (formData.fecha_vencimiento_asociada) {
      const hoy = new Date();
      const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      if (formData.fecha_vencimiento_asociada < fechaActual) {
        setFormError('La fecha de vencimiento no puede haber pasado.');
        return;
      }
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
            Ingreso
          </span>
        );
      case 'EGRESO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/50">
            Egreso
          </span>
        );
      case 'AJUSTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
            Ajuste
          </span>
        );
      case 'VENTA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
            Venta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700">
            {tipo}
          </span>
        );
    }
  };

  const formatCantidad = (tipo, cant) => {
    if (!cant || cant === 0) return '0';
    if (tipo === 'INGRESO') return `+${cant}`;
    if (tipo === 'EGRESO' || tipo === 'VENTA') return `-${Math.abs(cant)}`;
    return cant > 0 ? `+${cant}` : `${cant}`;
  };

  return (
    <div className="space-y-6">
      {/* Modern Page Header */}
      <PageHeader
        title="Movimientos de Stock"
        description={
          isAdmin
            ? 'Trazabilidad y registro manual de ingresos, egresos y ajustes de mercadería'
            : 'Historial y trazabilidad de movimientos de stock (modo lectura)'
        }
        badge="Trazabilidad"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
            Registrar Movimiento
          </button>
        )}
      </PageHeader>

      {/* Tarjetas KPI de Trazabilidad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Ingresos
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-center font-bold text-xs">
              +
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">
            {metricas.ingresos > 0 ? `+${metricas.ingresos}` : '0'}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">u.</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Egresos
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-center font-bold text-xs">
              -
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400">
            {metricas.egresos > 0 ? `-${metricas.egresos}` : '0'}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">u.</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Ventas
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-center font-bold text-xs">
              🛒
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">
            {metricas.ventas > 0 ? `-${metricas.ventas}` : '0'}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">u.</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Balance Neto
            </span>
            <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs">
              Σ
            </div>
          </div>
          <div className={`mt-2 text-xl font-black ${
            metricas.balance > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : metricas.balance < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-gray-900 dark:text-zinc-100'
          }`}>
            {metricas.balance > 0 ? `+${metricas.balance}` : metricas.balance}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">u.</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Profesional */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 space-y-4">
        {/* Fila superior: Presets rápidos de período y botón de limpiar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800/70">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mr-1.5">
              Rango Rápido:
            </span>
            <button
              type="button"
              onClick={() => aplicarPresetFecha('TODOS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                presetFechaActivo === 'TODOS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              Todos los movimientos
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetFecha('HOY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                presetFechaActivo === 'HOY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetFecha('7_DIAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                presetFechaActivo === '7_DIAS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetFecha('ESTE_MES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                presetFechaActivo === 'ESTE_MES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              Este mes
            </button>
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Fila de Controles de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador Rápido de Texto */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
              Búsqueda en tabla
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Producto, motivo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
              />
              <svg className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Producto filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
              Producto
            </label>
            <select
              value={selectedProducto}
              onChange={(e) => setSelectedProducto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 cursor-pointer"
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
              Tipo
            </label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 cursor-pointer"
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 cursor-pointer"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Movimientos Paginada */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando historial de movimientos...
          </div>
        ) : filteredMovimientos.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            No se encontraron movimientos con los filtros seleccionados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-300">
                <thead className="bg-gray-50/70 dark:bg-zinc-800/50 text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5">Fecha y Hora</th>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5">Tipo</th>
                    <th className="px-6 py-3.5 text-right">Cantidad</th>
                    <th className="px-6 py-3.5">Motivo / Venta</th>
                    <th className="px-6 py-3.5">Venc. Asociado</th>
                    <th className="px-6 py-3.5">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/70">
                  {paginatedMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatFecha(mov.fecha_movimiento)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-zinc-100">
                        {mov.producto_nombre || `Producto #${mov.producto}`}
                      </td>
                      <td className="px-6 py-4">{getTipoBadge(mov.tipo)}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-sm">
                        <span
                          className={
                            mov.tipo === 'INGRESO'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : mov.tipo === 'EGRESO' || mov.tipo === 'VENTA'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {formatCantidad(mov.tipo, mov.cantidad)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 max-w-xs truncate text-xs">
                        {mov.motivo ? (
                          mov.motivo
                        ) : mov.venta ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40">
                            Venta #{mov.venta}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                        {mov.fecha_vencimiento_asociada || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-zinc-300 font-medium text-xs">
                        {mov.usuario_username || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginador Profesional */}
            <div className="px-6 py-3.5 bg-gray-50/70 dark:bg-zinc-800/40 border-t border-gray-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 dark:text-zinc-400">
              <div className="flex items-center space-x-3">
                <span>
                  Mostrando <strong className="text-gray-900 dark:text-zinc-100 font-bold">{(currentSafePage - 1) * pageSize + 1}</strong> a{' '}
                  <strong className="text-gray-900 dark:text-zinc-100 font-bold">
                    {Math.min(currentSafePage * pageSize, totalItems)}
                  </strong>{' '}
                  de <strong className="text-gray-900 dark:text-zinc-100 font-bold">{totalItems}</strong> movimientos
                </span>
                <span className="text-gray-300 dark:text-zinc-700">•</span>
                <div className="flex items-center space-x-1.5">
                  <span>Filas por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    disabled={currentSafePage === 1}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-700 transition font-medium cursor-pointer"
                    title="Primera página"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentSafePage - 1)}
                    disabled={currentSafePage === 1}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-700 transition font-medium cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 font-semibold text-gray-900 dark:text-zinc-100">
                    Página {currentSafePage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentSafePage + 1)}
                    disabled={currentSafePage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-700 transition font-medium cursor-pointer"
                  >
                    Siguiente
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentSafePage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-700 transition font-medium cursor-pointer"
                    title="Última página"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </>
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
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.producto_id}
                onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Tipo de Movimiento <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 font-medium"
                >
                  {TIPOS_MOVIMIENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
                  placeholder={formData.tipo === 'AJUSTE' ? 'Ej: 5 o -3' : 'Ej: 10'}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {formData.tipo === 'INGRESO' && '• Ingreso: incrementa el stock del producto seleccionado.'}
              {formData.tipo === 'EGRESO' && '• Egreso: descuenta unidades disponibles.'}
              {formData.tipo === 'AJUSTE' && '• Ajuste: valores positivos suman y negativos restan. No puede dejar stock inferior a 0.'}
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Motivo / Justificación <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
                placeholder="Ej: Reposición de mercadería, rotura de paquete, corrección de inventario..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Fecha de Vencimiento Asociada (Opcional)
              </label>
              <input
                type="date"
                value={formData.fecha_vencimiento_asociada}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento_asociada: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
              />
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
