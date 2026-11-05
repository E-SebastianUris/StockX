import Modal from '../../components/Modal';

export default function VentaDetalleModal({ isOpen, onClose, venta, loading }) {
  if (!isOpen) return null;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={venta ? `Detalle de Venta #${venta.id}` : 'Detalle de Venta'}
      maxWidth="max-w-3xl"
    >
      {loading || !venta ? (
        <div className="py-12 flex justify-center items-center text-gray-500 dark:text-zinc-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span>Cargando datos de la venta...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cabecera de la Venta */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-gray-200/80 dark:border-zinc-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Ticket / Comprobante</p>
              <p className="text-base font-black text-gray-900 dark:text-zinc-100 mt-0.5">#{venta.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Fecha y Hora</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mt-0.5">{formatearFecha(venta.fecha_venta)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Vendedor</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mt-0.5">
                {venta.vendedor?.username || venta.vendedor || 'Desconocido'}
                {venta.vendedor?.rol && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-zinc-400">({venta.vendedor.rol})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Método de Pago</p>
              <div className="mt-1">{getMetodoBadge(venta.metodo_pago)}</div>
            </div>
            {venta.observaciones && (
              <div className="sm:col-span-2 md:col-span-4 pt-2.5 border-t border-gray-200/60 dark:border-zinc-700/60">
                <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Observaciones</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300 italic mt-0.5">{venta.observaciones}</p>
              </div>
            )}
          </div>

          {/* Tabla de Ítems */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3 flex items-center justify-between">
              <span>Productos incluidos ({venta.detalles?.length || 0})</span>
            </h4>
            <div className="overflow-x-auto border border-gray-200 dark:border-zinc-700/80 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800/70 text-sm">
                <thead className="bg-gray-50/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left">Código</th>
                    <th scope="col" className="px-4 py-2.5 text-left">Producto</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Precio Unit.</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Cant.</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/70 bg-white dark:bg-zinc-900">
                  {venta.detalles && venta.detalles.length > 0 ? (
                    venta.detalles.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition">
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 font-mono">
                          {item.producto_codigo || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-zinc-100">
                          {item.producto_nombre || `Producto #${item.producto}`}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-zinc-300 font-mono">
                          ${Number(item.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-zinc-200">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-zinc-100 font-mono">
                          ${Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-400 dark:text-zinc-500">
                        Esta venta no registra ítems detallados.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50/80 dark:bg-zinc-800/60 border-t-2 border-gray-200 dark:border-zinc-700">
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-right font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wide text-xs">
                      Total Oficial de la Venta:
                    </td>
                    <td className="px-4 py-3 text-right font-black text-lg text-emerald-600 dark:text-emerald-400 font-mono">
                      ${Number(venta.total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Botón de Cierre */}
          <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
