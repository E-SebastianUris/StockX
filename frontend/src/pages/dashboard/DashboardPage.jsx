import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { dashboardApi } from '../../api/dashboard';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filtros interactivos para rotación
  const [rotacionFiltro, setRotacionFiltro] = useState('TODOS');
  const [rotacionSearch, setRotacionSearch] = useState('');

  // Selector de pestaña para alertas
  const [alertaTab, setAlertaTab] = useState('stock'); // 'stock' | 'vencimiento'

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const response = await dashboardApi.getMetrics({ limit: 10 });
      setData(response);
    } catch (err) {
      console.error('Error al cargar métricas del Dashboard:', err);
      setError(
        err.response?.data?.detail ||
          'No se pudieron cargar las métricas del dashboard. Verificá la conexión con el servidor.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    dashboardApi
      .getMetrics({ limit: 10 })
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.detail ||
              'No se pudieron cargar las métricas del dashboard. Verificá la conexión con el servidor.'
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Filtrado de rotación
  const rotacionList = data?.rotacion_productos || [];
  const filteredRotacion = rotacionList.filter((p) => {
    const matchesSearch =
      p.producto_nombre.toLowerCase().includes(rotacionSearch.toLowerCase()) ||
      (p.codigo_barra && p.codigo_barra.includes(rotacionSearch)) ||
      p.categoria_nombre.toLowerCase().includes(rotacionSearch.toLowerCase());

    const matchesFilter =
      rotacionFiltro === 'TODOS' || p.nivel_rotacion === rotacionFiltro;

    return matchesSearch && matchesFilter;
  });

  const masVendidosList = data?.productos_mas_vendidos || [];
  const maxVendidoCantidad = masVendidosList.length
    ? Math.max(...masVendidosList.map((p) => p.total_unidades_vendidas), 1)
    : 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard & Reportes"
          description="Monitoreo ejecutivo en tiempo real de ventas, rotación de stock y alertas comerciales."
          badge="Analítica Kiosco"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 p-5">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800"></div>
          <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard & Reportes"
          description="Monitoreo ejecutivo en tiempo real de ventas, rotación de stock y alertas comerciales."
          badge="Analítica Kiosco"
        />
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-rose-800 dark:text-rose-300 mb-1">
            Error al consultar métricas del Dashboard
          </h3>
          <p className="text-sm text-rose-600 dark:text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { resumen_general, productos_mas_vendidos, alertas } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard & Reportes"
        description="Métricas de ventas, análisis de rotación de mercadería y monitoreo de alertas críticas."
        badge="Panel de Control"
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
      >
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700/60 shadow-xs transition disabled:opacity-60"
        >
          <svg
            className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? 'Actualizando...' : 'Actualizar métricas'}
        </button>
      </PageHeader>

      {/* Tarjetas de Resumen Global / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Recaudado */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Total Recaudado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-zinc-50">
              {formatCurrency(resumen_general.total_ventas_recaudado)}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 flex items-center space-x-1">
              <span>{resumen_general.cantidad_ventas} transacciones registradas</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Alertas Activas */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Alertas Activas
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-zinc-50">
              {alertas.total_alertas}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 flex items-center space-x-2">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{alertas.conteo_stock_minimo} stock</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">{alertas.conteo_vencimiento} vencimiento</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Catálogo Activo */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Catálogo Activo
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-zinc-50">
              {resumen_general.total_productos_activos}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Productos habilitados en mostrador
            </p>
          </div>
        </div>

        {/* KPI 4: Quiebre de Stock */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Sin Stock Inmediato
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-zinc-50">
              {alertas.conteo_sin_stock}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Artículos con stock = 0 en góndola
            </p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Indicador 1 (Más Vendidos) + Indicador 3 (Alertas Activas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INDICADOR 1: Productos Más Vendidos (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/80 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-center font-black text-sm">
                  ★
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                    Productos Más Vendidos
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Ranking de artículos por volumen de ventas y facturación
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                Top 10
              </span>
            </div>

            {productos_mas_vendidos.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-zinc-500 text-sm">
                No hay ventas registradas aún para calcular el ranking.
              </div>
            ) : (
              <div className="space-y-3.5">
                {productos_mas_vendidos.map((prod, index) => {
                  const percentage = Math.round(
                    (prod.total_unidades_vendidas / maxVendidoCantidad) * 100
                  );
                  const isTop3 = index < 3;
                  const rankBadgeClass =
                    index === 0
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : index === 1
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                      : index === 2
                      ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      : 'bg-gray-100 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700';

                  return (
                    <div
                      key={prod.producto_id}
                      className="p-3 bg-gray-50/70 dark:bg-zinc-800/40 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70 border border-gray-100 dark:border-zinc-800/70 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black border shrink-0 ${rankBadgeClass}`}
                          >
                            #{index + 1}
                          </span>
                          <div className="truncate">
                            <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                              {prod.producto_nombre}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                              {prod.categoria_nombre}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-gray-900 dark:text-zinc-100">
                            {prod.total_unidades_vendidas}{' '}
                            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                              u.
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(prod.total_recaudado)}
                          </div>
                        </div>
                      </div>

                      {/* Barra de progreso visual comparativa */}
                      <div className="w-full bg-gray-200/80 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop3
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500'
                              : 'bg-gray-400 dark:bg-zinc-500'
                          }`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
            <span>Fuente: Ventas confirmadas en mostrador</span>
            <Link
              to="/ventas"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Ver registro de ventas →
            </Link>
          </div>
        </section>

        {/* INDICADOR 3: Alertas Activas (Stock Mínimo y Vencimientos) (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/80 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50 flex items-center justify-center font-bold text-sm">
                  !
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                    Alertas Comerciales
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Stock bajo y productos por vencer
                  </p>
                </div>
              </div>

              {/* Selector de tipo de alerta */}
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAlertaTab('stock')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    alertaTab === 'stock'
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs font-bold'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Stock ({alertas.conteo_stock_minimo})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertaTab('vencimiento')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    alertaTab === 'vencimiento'
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs font-bold'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Venc. ({alertas.conteo_vencimiento})
                </button>
              </div>
            </div>

            {/* Sub-panel: Stock Mínimo */}
            {alertaTab === 'stock' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-3 text-gray-500 dark:text-zinc-400">
                  <span className="font-semibold">
                    {alertas.items_stock_minimo.length} artículos en umbral crítico
                  </span>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                    {alertas.conteo_sin_stock} sin stock
                  </span>
                </div>

                {alertas.items_stock_minimo.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 dark:text-zinc-500 text-sm">
                    ✓ Todos los productos cuentan con stock por encima del mínimo.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {alertas.items_stock_minimo.map((item) => {
                      const isSinStock = item.nivel_alerta === 'SIN STOCK';
                      const isCritico = item.nivel_alerta === 'CRITICO';

                      const badgeColor = isSinStock
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900'
                        : isCritico
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900';

                      return (
                        <div
                          key={item.producto_id}
                          className="p-3 bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-200/60 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block truncate">
                              {item.producto_nombre}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 block truncate">
                              Stock: <strong className="text-gray-900 dark:text-zinc-200">{item.stock_actual}</strong> / Mín: {item.stock_minimo} (Faltan {item.unidades_faltantes} u.)
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeColor}`}
                          >
                            {item.nivel_alerta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-panel: Vencimientos */}
            {alertaTab === 'vencimiento' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-3 text-gray-500 dark:text-zinc-400">
                  <span className="font-semibold">
                    {alertas.items_vencimiento.length} artículos próximos o vencidos
                  </span>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                    {alertas.conteo_vencidos} vencidos
                  </span>
                </div>

                {alertas.items_vencimiento.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 dark:text-zinc-500 text-sm">
                    ✓ No hay artículos con fecha de vencimiento dentro de los próximos 15 días.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {alertas.items_vencimiento.map((item) => {
                      const isVencido = item.estado_vencimiento === 'VENCIDO';
                      const isUrgente = item.estado_vencimiento === 'URGENTE';

                      const badgeColor = isVencido
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900'
                        : isUrgente
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900'
                        : 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900';

                      return (
                        <div
                          key={item.producto_id}
                          className="p-3 bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-200/60 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block truncate">
                              {item.producto_nombre}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 block truncate">
                              Vence: <strong className="text-gray-900 dark:text-zinc-200">{item.fecha_vencimiento}</strong> • Stock: {item.stock_actual} u.
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}
                            >
                              {isVencido
                                ? 'VENCIDO'
                                : `${item.dias_para_vencer} d (${item.estado_vencimiento})`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
            <span>Regla de negocio: Umbral de 15 días</span>
            <Link
              to="/movimientos"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Registrar reposición →
            </Link>
          </div>
        </section>
      </div>

      {/* INDICADOR 2: Rotación de Productos (Velocidad de salida vs reposición) */}
      <section className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-center font-black text-sm">
              ⇄
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                Velocidad y Rotación de Mercadería
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Tasa de salida de productos (ventas) versus velocidad de reposición (compras/ingresos)
              </p>
            </div>
          </div>

          {/* Filtros de rotación */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto o código..."
                value={rotacionSearch}
                onChange={(e) => setRotacionSearch(e.target.value)}
                className="w-48 sm:w-60 px-3 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-zinc-100 placeholder-gray-400"
              />
              {rotacionSearch && (
                <button
                  onClick={() => setRotacionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-semibold">
              {['TODOS', 'ALTA', 'MEDIA', 'BAJA', 'SIN_MOVIMIENTO'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setRotacionFiltro(cat)}
                  className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                    rotacionFiltro === cat
                      ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs font-bold'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {cat === 'SIN_MOVIMIENTO' ? 'QUIETO' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla visual de rotación */}
        {filteredRotacion.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-zinc-500 text-sm">
            No se encontraron productos con el filtro seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-3">Producto / Categoría</th>
                  <th className="py-3 px-3 text-center">Stock Actual</th>
                  <th className="py-3 px-3 text-center">Salidas (Ventas)</th>
                  <th className="py-3 px-3 text-center">Reposición (Ingresos)</th>
                  <th className="py-3 px-3 text-center">Índice Rotación</th>
                  <th className="py-3 px-3 text-right">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                {filteredRotacion.map((item) => {
                  const nivelColors = {
                    ALTA: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
                    MEDIA: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
                    BAJA: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
                    SIN_MOVIMIENTO: 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700',
                  };

                  const diagnosticos = {
                    ALTA: 'Rápida rotación • Monitorear quiebre',
                    MEDIA: 'Rotación saludable y previsible',
                    BAJA: 'Salida lenta • Evitar sobre-stock',
                    SIN_MOVIMIENTO: 'Sin ventas registradas',
                  };

                  return (
                    <tr
                      key={item.producto_id}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900 dark:text-zinc-100">
                          {item.producto_nombre}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center space-x-2">
                          <span>{item.categoria_nombre}</span>
                          {item.codigo_barra && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{item.codigo_barra}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-black ${
                            item.stock_actual <= item.stock_minimo
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-900 dark:text-zinc-100'
                          }`}
                        >
                          {item.stock_actual}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                          mín. {item.stock_minimo}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
                          <span>↓</span>
                          <span>{item.total_salidas} u.</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                          <span>↑</span>
                          <span>{item.total_ingresos} u.</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-800 dark:text-zinc-200">
                        {item.ratio_rotacion.toFixed(2)}x
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            nivelColors[item.nivel_rotacion]
                          }`}
                        >
                          {item.nivel_rotacion === 'SIN_MOVIMIENTO' ? 'SIN ROTACIÓN' : item.nivel_rotacion}
                        </span>
                        <span className="block text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                          {diagnosticos[item.nivel_rotacion]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
