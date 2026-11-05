import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { METODOS_PAGO } from '../../api/ventas';
import { productosApi } from '../../api/inventario';

export default function NuevaVentaModal({ isOpen, onClose, onVentaCreada }) {
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Formulario de ítem a agregar
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [itemError, setItemError] = useState('');

  // Ítems de la venta (carrito)
  const [detalles, setDetalles] = useState([]);

  // Datos de cabecera
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');

  // Estados de validación y envío
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cargar productos activos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      const cargarProductos = async () => {
        try {
          setLoadingProductos(true);
          const data = await productosApi.getAll({ activo: true });
          setProductosDisponibles(data || []);
        } catch (err) {
          console.error('Error al cargar productos para la venta:', err);
          setErrorGeneral('No se pudieron cargar los productos disponibles.');
        } finally {
          setLoadingProductos(false);
        }
      };
      cargarProductos();

      // Resetear estado del formulario
      setDetalles([]);
      setSelectedProductoId('');
      setCantidadInput(1);
      setMetodoPago('EFECTIVO');
      setObservaciones('');
      setErrorGeneral('');
      setItemError('');
    }
  }, [isOpen]);

  const productoSeleccionado = productosDisponibles.find(
    (p) => String(p.id) === String(selectedProductoId)
  );

  // Agregar ítem al listado
  const handleAgregarItem = (e) => {
    e.preventDefault();
    setItemError('');

    if (!selectedProductoId) {
      setItemError('Elegí un producto para agregar.');
      return;
    }

    const prod = productosDisponibles.find((p) => String(p.id) === String(selectedProductoId));
    if (!prod) {
      setItemError('El producto seleccionado no es válido.');
      return;
    }

    const cant = parseInt(cantidadInput, 10);
    if (isNaN(cant) || cant <= 0) {
      setItemError('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    if (cant > prod.stock_actual) {
      setItemError(`Stock insuficiente para '${prod.nombre}'. Disponible: ${prod.stock_actual}.`);
      return;
    }

    // Verificar si ya está en la lista
    const yaExiste = detalles.find((d) => d.producto_id === prod.id);
    if (yaExiste) {
      const nuevaCantidad = yaExiste.cantidad + cant;
      if (nuevaCantidad > prod.stock_actual) {
        setItemError(
          `No podés agregar más unidades de '${prod.nombre}'. Ya tenés ${yaExiste.cantidad} en la venta y el stock disponible es ${prod.stock_actual}.`
        );
        return;
      }

      setDetalles((prev) =>
        prev.map((item) =>
          item.producto_id === prod.id
            ? {
                ...item,
                cantidad: nuevaCantidad,
                subtotal: nuevaCantidad * item.precio_unitario,
              }
            : item
        )
      );
    } else {
      const precioUnit = Number(prod.precio_venta) || 0;
      setDetalles((prev) => [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          codigo_barra: prod.codigo_barra,
          precio_unitario: precioUnit,
          cantidad: cant,
          subtotal: precioUnit * cant,
          stock_actual: prod.stock_actual,
        },
      ]);
    }

    // Resetear formulario de selección
    setSelectedProductoId('');
    setCantidadInput(1);
    setItemError('');
  };

  // Quitar ítem
  const handleEliminarItem = (productoId) => {
    setDetalles((prev) => prev.filter((d) => d.producto_id !== productoId));
  };

  // Cambiar cantidad directamente en la tabla
  const handleCambiarCantidad = (productoId, nuevaCantidadStr) => {
    const cant = parseInt(nuevaCantidadStr, 10);
    if (isNaN(cant) || cant <= 0) return;

    setDetalles((prev) =>
      prev.map((d) => {
        if (d.producto_id === productoId) {
          if (cant > d.stock_actual) {
            return d;
          }
          return {
            ...d,
            cantidad: cant,
            subtotal: cant * d.precio_unitario,
          };
        }
        return d;
      })
    );
  };

  const totalEstimado = detalles.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Enviar venta
  const handleSubmitVenta = async (e) => {
    e.preventDefault();
    setErrorGeneral('');

    // Validaciones en cliente
    if (detalles.length === 0) {
      setErrorGeneral('Debés incluir al menos un producto en la venta.');
      return;
    }

    const ids = detalles.map((d) => d.producto_id);
    if (new Set(ids).size !== ids.length) {
      setErrorGeneral('No se permite repetir productos en la venta.');
      return;
    }

    for (const d of detalles) {
      if (!Number.isInteger(d.cantidad) || d.cantidad <= 0) {
        setErrorGeneral(`La cantidad de '${d.nombre}' debe ser mayor a 0.`);
        return;
      }
      if (d.cantidad > d.stock_actual) {
        setErrorGeneral(`Stock insuficiente para '${d.nombre}'. Disponible: ${d.stock_actual}.`);
        return;
      }
    }

    const metodosValidos = METODOS_PAGO.map((m) => m.value);
    if (!metodosValidos.includes(metodoPago)) {
      setErrorGeneral('El método de pago seleccionado no es válido.');
      return;
    }

    const payload = {
      metodo_pago: metodoPago,
      observaciones: observaciones.trim(),
      detalles: detalles.map((d) => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
      })),
    };

    try {
      setGuardando(true);
      await onVentaCreada(payload);
    } catch (err) {
      console.error('Error al registrar venta:', err);
      let backendMsg = '';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          backendMsg = data;
        } else if (data.detalles) {
          backendMsg = Array.isArray(data.detalles) ? data.detalles.join(' ') : String(data.detalles);
        } else if (data.metodo_pago) {
          backendMsg = Array.isArray(data.metodo_pago) ? data.metodo_pago.join(' ') : String(data.metodo_pago);
        } else if (data.non_field_errors) {
          backendMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors);
        } else if (data.detail) {
          backendMsg = String(data.detail);
        } else {
          backendMsg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
        }
      }
      setErrorGeneral(backendMsg || 'Error al procesar la venta. Verificá los datos e intentá nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nueva Venta"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-gray-900 dark:text-zinc-100">
        {/* Banner de error general / backend */}
        {errorGeneral && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-800 dark:text-red-300 text-sm flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 font-semibold">{errorGeneral}</div>
          </div>
        )}

        {/* Sección: Selección y agregado de productos */}
        <div className="bg-blue-50/50 dark:bg-zinc-800/50 border border-blue-100 dark:border-zinc-700/60 rounded-2xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar producto a la venta
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Selector de Producto */}
            <div className="md:col-span-7">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Producto
              </label>
              <select
                value={selectedProductoId}
                onChange={(e) => {
                  setSelectedProductoId(e.target.value);
                  setItemError('');
                }}
                disabled={loadingProductos}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccionar producto disponible --</option>
                {productosDisponibles.map((prod) => (
                  <option
                    key={prod.id}
                    value={prod.id}
                    disabled={prod.stock_actual <= 0}
                  >
                    {prod.nombre} {prod.codigo_barra ? `[${prod.codigo_barra}]` : ''} — Stock: {prod.stock_actual} | ${Number(prod.precio_venta).toFixed(2)}
                    {prod.stock_actual <= 0 ? ' (SIN STOCK)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Cantidad */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                max={productoSeleccionado ? productoSeleccionado.stock_actual : undefined}
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Subtotal estimado ítem preview */}
            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAgregarItem}
                disabled={!selectedProductoId || loadingProductos}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center space-x-1 shadow-sm shadow-blue-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* Información rápida del producto seleccionado */}
          {productoSeleccionado && (
            <div className="mt-2.5 text-xs text-gray-600 dark:text-zinc-400 flex items-center justify-between">
              <span>
                Precio: <strong className="text-gray-900 dark:text-zinc-100">${Number(productoSeleccionado.precio_venta).toFixed(2)}</strong> | Stock: <strong className={productoSeleccionado.stock_actual <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-zinc-100'}>{productoSeleccionado.stock_actual} un.</strong>
              </span>
              <span>
                Subtotal: <strong className="text-blue-600 dark:text-blue-400 font-mono">${(Number(productoSeleccionado.precio_venta) * (Number(cantidadInput) || 0)).toFixed(2)}</strong>
              </span>
            </div>
          )}

          {itemError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold">{itemError}</p>
          )}
        </div>

        {/* Tabla de ítems en el carrito */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Ítems de la venta ({detalles.length})
          </h4>
          <div className="border border-gray-200 dark:border-zinc-700/80 rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
              <thead className="bg-gray-50/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left">Producto</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Stock disp.</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Precio Unit.</th>
                  <th scope="col" className="px-4 py-2.5 text-center w-28">Cantidad</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Subtotal</th>
                  <th scope="col" className="px-3 py-2.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {detalles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                      No hay productos agregados a la venta todavía. Seleccioná un producto arriba.
                    </td>
                  </tr>
                ) : (
                  detalles.map((d) => (
                    <tr key={d.producto_id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-zinc-100">{d.nombre}</p>
                        {d.codigo_barra && (
                          <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{d.codigo_barra}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-zinc-400">
                        {d.stock_actual}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-zinc-300">
                        ${d.precio_unitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max={d.stock_actual}
                          value={d.cantidad}
                          onChange={(e) => handleCambiarCantidad(d.producto_id, e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-zinc-700 rounded-lg font-bold text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-zinc-100">
                        ${d.subtotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(d.producto_id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Quitar producto"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen Total Estimado */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Total Estimado de la Venta</span>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              * Estimado. El total oficial es calculado y confirmado por el backend al registrar la venta.
            </p>
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
            ${totalEstimado.toFixed(2)}
          </div>
        </div>

        {/* Método de Pago y Observaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              maxLength={255}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Pago con cambio justo, cliente habitual..."
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botones de acción (Con soporte oscuro para Cancelar) */}
        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmitVenta}
            disabled={guardando || detalles.length === 0}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-zinc-700 rounded-xl shadow-sm transition flex items-center space-x-2"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Confirmando Venta...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirmar Venta (${totalEstimado.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
