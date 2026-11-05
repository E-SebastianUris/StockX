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
      EFECTIVO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      TRANSFERENCIA: 'bg-purple-100 text-purple-800 border-purple-200',
      DEBITO: 'bg-blue-100 text-blue-800 border-blue-200',
      CREDITO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      OTRO: 'bg-gray-100 text-gray-800 border-gray-200',
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
        <div className="py-12 flex justify-center items-center text-gray-500">
          <svg className="animate-spin h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Cargando datos de la venta...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cabecera de la Venta */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Ticket / Comprobante</p>
              <p className="text-base font-bold text-gray-900">#{venta.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Fecha y Hora</p>
              <p className="text-sm font-semibold text-gray-800">{formatearFecha(venta.fecha_venta)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Vendedor</p>
              <p className="text-sm font-semibold text-gray-800">
                {venta.vendedor?.username || venta.vendedor || 'Desconocido'}
                {venta.vendedor?.rol && (
                  <span className="ml-1 text-xs text-gray-500">({venta.vendedor.rol})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Método de Pago</p>
              <div className="mt-0.5">{getMetodoBadge(venta.metodo_pago)}</div>
            </div>
            {venta.observaciones && (
              <div className="sm:col-span-2 md:col-span-4 pt-2 border-t border-gray-200/60">
                <p className="text-xs text-gray-500 font-medium">Observaciones</p>
                <p className="text-sm text-gray-700 italic">{venta.observaciones}</p>
              </div>
            )}
          </div>

          {/* Tabla de Ítems */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
              <span>Productos incluidos ({venta.detalles?.length || 0})</span>
            </h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                      Código
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                      Precio Unit.
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">
                      Cant.
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {venta.detalles && venta.detalles.length > 0 ? (
                    venta.detalles.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {item.producto_codigo || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.producto_nombre || `Producto #${item.producto}`}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-mono">
                          ${Number(item.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                          ${Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-400">
                        Esta venta no registra ítems detallados.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-right font-bold text-gray-700 uppercase tracking-wide">
                      Total Oficial de la Venta:
                    </td>
                    <td className="px-4 py-3 text-right font-black text-lg text-emerald-700 font-mono">
                      ${Number(venta.total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Botón de Cierre */}
          <div className="flex justify-end pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

