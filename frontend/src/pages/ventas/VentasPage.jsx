import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ventasApi, METODOS_PAGO } from '../../api/ventas';
import VentaDetalleModal from './VentaDetalleModal';
import NuevaVentaModal from './NuevaVentaModal';
import PageHeader from '../../components/PageHeader';

export default function VentasPage() {
  const { user } = useAuth();

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [permissionError, setPermissionError] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedMetodo, setSelectedMetodo] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');

  // Modal Detalle
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Modal Nueva Venta
  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Cargar ventas con filtros
  const loadVentas = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setPermissionError(false);

      const params = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (selectedMetodo) params.metodo_pago = selectedMetodo;
      if (selectedVendedor) params.vendedor = selectedVendedor;

      const data = await ventasApi.getAll(params);
      setVentas(data || []);
    } catch (err) {
      console.error('Error al cargar ventas:', err);
      if (err.response?.status === 403) {
        setPermissionError(true);
        setErrorMsg('No tenés permisos para acceder al módulo de ventas.');
      } else {
        setErrorMsg('Ocurrió un error al cargar las ventas del sistema.');
      }
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, selectedMetodo, selectedVendedor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVentas();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadVentas]);

  // Lista única de vendedores detectados para el filtro
  const vendedoresDisponibles = useMemo(() => {
    const map = new Map();
    ventas.forEach((v) => {
      if (v.vendedor && typeof v.vendedor === 'object' && v.vendedor.id) {
        map.set(v.vendedor.id, v.vendedor.username || `Usuario #${v.vendedor.id}`);
      }
    });
    return Array.from(map.entries()).map(([id, username]) => ({ id, username }));
  }, [ventas]);

  // Abrir detalle de una venta
  const handleVerDetalle = async (ventaId) => {
    try {
      setIsDetalleOpen(true);
      setLoadingDetalle(true);
      const data = await ventasApi.getById(ventaId);
      setSelectedVenta(data);
    } catch (err) {
      console.error('Error al cargar detalle de venta:', err);
      setErrorMsg('No se pudo cargar el detalle de la venta solicitada.');
      setIsDetalleOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Crear nueva venta
  const handleVentaCreada = async (payload) => {
    const ventaCreada = await ventasApi.create(payload);
    setIsNuevaVentaOpen(false);
    setSuccessBanner(
      `¡Venta #${ventaCreada.id} registrada exitosamente por un total oficial de $${Number(ventaCreada.total).toFixed(2)}!`
    );
    await loadVentas();
    setSelectedVenta(ventaCreada);
    setIsDetalleOpen(true);
  };

  const handleLimpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setSelectedMetodo('');
    setSelectedVendedor('');
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const d = new Date(fechaStr);
    return d.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMetodoBadge = (metodo) => {
    const badges = {
      EFECTIVO: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
      TRANSFERENCIA: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
      DEBITO: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
      CREDITO: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
      OTRO: 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-300 border-gray-200 dark:border-zinc-700',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          badges[metodo] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {metodo}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Modern Page Header */}
      <PageHeader
        title="Ventas"
        description="Registro de comprobantes de mostrador, descuento de inventario y trazabilidad"
        badge="Punto de Venta"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      >
        <button
          onClick={() => {
            setSuccessBanner('');
            setIsNuevaVentaOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-blue-500/25 transition space-x-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva Venta</span>
        </button>
      </PageHeader>

      {/* Banner de éxito */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-emerald-700 dark:text-emerald-300 hover:underline text-xs font-bold"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Banner de Error / Permiso */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-800 dark:text-red-300 text-sm flex items-center space-x-2 shadow-xs">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros (Modernizada) */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fecha Desde */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Método de Pago
            </label>
            <select
              value={selectedMetodo}
              onChange={(e) => setSelectedMetodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
            >
              <option value="">Todos los métodos</option>
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Vendedor
            </label>
            {vendedoresDisponibles.length > 0 ? (
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
              >
                <option value="">Todos los vendedores</option>
                {vendedoresDisponibles.map((vend) => (
                  <option key={vend.id} value={vend.id}>
                    {vend.username}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ID de vendedor..."
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100"
              />
            )}
          </div>
        </div>

        {(fechaDesde || fechaHasta || selectedMetodo || selectedVendedor) && (
          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-zinc-800">
            <button
              onClick={handleLimpiarFiltros}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800/70 text-sm">
            <thead className="bg-gray-50/70 dark:bg-zinc-800/50 text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 text-left">Ticket</th>
                <th scope="col" className="px-5 py-3.5 text-left">Fecha y Hora</th>
                <th scope="col" className="px-5 py-3.5 text-left">Vendedor</th>
                <th scope="col" className="px-5 py-3.5 text-center">Método</th>
                <th scope="col" className="px-5 py-3.5 text-left">Observaciones</th>
                <th scope="col" className="px-5 py-3.5 text-right">Total</th>
                <th scope="col" className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/70">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-400 dark:text-zinc-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando ventas...</span>
                    </div>
                  </td>
                </tr>
              ) : permissionError ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-red-500 font-medium">
                    No tenés los permisos requeridos para consultar el historial de ventas.
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-400 dark:text-zinc-500">
                    <p className="font-semibold text-gray-600 dark:text-zinc-300">No se encontraron ventas registradas.</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                      Podés registrar una nueva venta usando el botón superior "Nueva Venta".
                    </p>
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-zinc-100">
                      #{v.id}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs whitespace-nowrap">
                      {formatearFecha(v.fecha_venta)}
                    </td>
                    <td className="px-5 py-4 text-gray-800 dark:text-zinc-200 font-medium">
                      {v.vendedor?.username || v.vendedor || '-'}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {getMetodoBadge(v.metodo_pago)}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-zinc-400 text-xs max-w-xs truncate" title={v.observaciones}>
                      {v.observaciones || <span className="text-gray-300 dark:text-zinc-600 italic">Sin observaciones</span>}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-gray-900 dark:text-zinc-100 font-mono text-base">
                      ${Number(v.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleVerDetalle(v.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/60 shadow-xs transition space-x-1"
                        title="Ver detalle de la venta"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Ver Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      <VentaDetalleModal
        isOpen={isDetalleOpen}
        onClose={() => {
          setIsDetalleOpen(false);
          setSelectedVenta(null);
        }}
        venta={selectedVenta}
        loading={loadingDetalle}
      />

      <NuevaVentaModal
        isOpen={isNuevaVentaOpen}
        onClose={() => setIsNuevaVentaOpen(false)}
        onVentaCreada={handleVentaCreada}
      />
    </div>
  );
}
