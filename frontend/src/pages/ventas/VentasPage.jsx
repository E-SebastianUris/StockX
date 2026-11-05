import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ventasApi, METODOS_PAGO } from '../../api/ventas';
import VentaDetalleModal from './VentaDetalleModal';
import NuevaVentaModal from './NuevaVentaModal';

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
    // Abrir automáticamente el comprobante oficial
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
      EFECTIVO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      TRANSFERENCIA: 'bg-purple-100 text-purple-800 border-purple-200',
      DEBITO: 'bg-blue-100 text-blue-800 border-blue-200',
      CREDITO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      OTRO: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
          badges[metodo] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {metodo}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ventas</h1>
          <p className="text-sm text-gray-500">
            Registro de comprobantes de mostrador, descuento de inventario y trazabilidad
          </p>
        </div>
        <button
          onClick={() => {
            setSuccessBanner('');
            setIsNuevaVentaOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition space-x-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva Venta</span>
        </button>
      </div>

      {/* Banner de éxito */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold underline"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Banner de Error / Permiso */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center space-x-2 shadow-sm">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fecha Desde */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Método de Pago
            </label>
            <select
              value={selectedMetodo}
              onChange={(e) => setSelectedMetodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Vendedor
            </label>
            {vendedoresDisponibles.length > 0 ? (
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>
        </div>

        {(fechaDesde || fechaHasta || selectedMetodo || selectedVendedor) && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={handleLimpiarFiltros}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3 text-left">Ticket</th>
                <th scope="col" className="px-5 py-3 text-left">Fecha y Hora</th>
                <th scope="col" className="px-5 py-3 text-left">Vendedor</th>
                <th scope="col" className="px-5 py-3 text-center">Método</th>
                <th scope="col" className="px-5 py-3 text-left">Observaciones</th>
                <th scope="col" className="px-5 py-3 text-right">Total</th>
                <th scope="col" className="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
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
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-400">
                    <p className="font-medium text-gray-500">No se encontraron ventas registradas.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Podés registrar una nueva venta usando el botón superior "Nueva Venta".
                    </p>
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      #{v.id}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {formatearFecha(v.fecha_venta)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-800 font-medium">
                      {v.vendedor?.username || v.vendedor || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {getMetodoBadge(v.metodo_pago)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate" title={v.observaciones}>
                      {v.observaciones || <span className="text-gray-300 italic">Sin observaciones</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-gray-900 font-mono">
                      ${Number(v.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleVerDetalle(v.id)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition space-x-1"
                        title="Ver detalle de la venta"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

