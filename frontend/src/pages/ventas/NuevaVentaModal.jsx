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
    setErrorGeneral('');

    if (!selectedProductoId) {
      setItemError('Seleccioná un producto de la lista.');
      return;
    }

    const prod = productosDisponibles.find(
      (p) => String(p.id) === String(selectedProductoId)
    );

    if (!prod) {
      setItemError('El producto seleccionado no es válido.');
      return;
    }

    const cantidad = Number(cantidadInput);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setItemError('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    if (detalles.some((d) => d.producto_id === prod.id)) {
      setItemError(`El producto '${prod.nombre}' ya está agregado a la venta. Modificá la cantidad en la tabla.`);
      return;
    }

    if (prod.stock_actual < cantidad) {
      setItemError(`Stock insuficiente para '${prod.nombre}'. Disponible: ${prod.stock_actual}, solicitado: ${cantidad}.`);
      return;
    }

    const precioUnitario = Number(prod.precio_venta);
    const subtotal = precioUnitario * cantidad;

    setDetalles((prev) => [
      ...prev,
      {
        producto_id: prod.id,
        nombre: prod.nombre,
        codigo_barra: prod.codigo_barra,
        stock_actual: prod.stock_actual,
        precio_unitario: precioUnitario,
        cantidad,
        subtotal,
      },
    ]);

    // Limpiar selector
    setSelectedProductoId('');
    setCantidadInput(1);
  };

  // Modificar cantidad directamente en la tabla
  const handleCambiarCantidad = (productoId, nuevaCantidadStr) => {
    setErrorGeneral('');
    const nuevaCantidad = Number(nuevaCantidadStr);

    setDetalles((prev) =>
      prev.map((item) => {
        if (item.producto_id === productoId) {
          if (!Number.isInteger(nuevaCantidad) || nuevaCantidad <= 0) {
            return item;
          }
          if (nuevaCantidad > item.stock_actual) {
            setErrorGeneral(
              `Stock insuficiente para '${item.nombre}'. Disponible: ${item.stock_actual}, solicitado: ${nuevaCantidad}.`
            );
            return item;
          }
          return {
            ...item,
            cantidad: nuevaCantidad,
            subtotal: item.precio_unitario * nuevaCantidad,
          };
        }
        return item;
      })
    );
  };

  // Eliminar ítem del listado
  const handleEliminarItem = (productoId) => {
    setDetalles((prev) => prev.filter((d) => d.producto_id !== productoId));
    setErrorGeneral('');
  };

  // Calcular total estimado
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
      // Extraer mensaje del backend 400
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
          // Serializar otros campos
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
      <div className="space-y-6">
        {/* Banner de error general / backend */}
        {errorGeneral && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 font-medium">{errorGeneral}</div>
          </div>
        )}

        {/* Sección: Selección y agregado de productos */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar producto a la venta
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Selector de Producto */}
            <div className="md:col-span-7">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Producto
              </label>
              <select
                value={selectedProductoId}
                onChange={(e) => {
                  setSelectedProductoId(e.target.value);
                  setItemError('');
                }}
                disabled={loadingProductos}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                max={productoSeleccionado ? productoSeleccionado.stock_actual : undefined}
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Subtotal estimado ítem preview */}
            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAgregarItem}
                disabled={!selectedProductoId || loadingProductos}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition flex items-center justify-center space-x-1"
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
            <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
              <span>
                Precio unitario: <strong className="text-gray-900">${Number(productoSeleccionado.precio_venta).toFixed(2)}</strong> | Stock actual: <strong className={productoSeleccionado.stock_actual <= 5 ? 'text-amber-600' : 'text-gray-900'}>{productoSeleccionado.stock_actual} un.</strong>
              </span>
              <span>
                Subtotal línea: <strong className="text-blue-700 font-mono">${(Number(productoSeleccionado.precio_venta) * (Number(cantidadInput) || 0)).toFixed(2)}</strong>
              </span>
            </div>
          )}

          {itemError && (
            <p className="mt-2 text-xs text-red-600 font-medium">{itemError}</p>
          )}
        </div>

        {/* Tabla de ítems en el carrito */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Ítems de la venta ({detalles.length})
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left">Producto</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Stock disp.</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Precio Unit.</th>
                  <th scope="col" className="px-4 py-2.5 text-center w-28">Cantidad</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Subtotal</th>
                  <th scope="col" className="px-3 py-2.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {detalles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-400">
                      No hay productos agregados a la venta todavía. Seleccioná un producto arriba.
                    </td>
                  </tr>
                ) : (
                  detalles.map((d) => (
                    <tr key={d.producto_id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{d.nombre}</p>
                        {d.codigo_barra && (
                          <p className="text-xs text-gray-400 font-mono">{d.codigo_barra}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {d.stock_actual}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        ${d.precio_unitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max={d.stock_actual}
                          value={d.cantidad}
                          onChange={(e) => handleCambiarCantidad(d.producto_id, e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded font-semibold text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        ${d.subtotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(d.producto_id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
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
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-emerald-900">Total Estimado de la Venta</span>
            <p className="text-xs text-emerald-700">
              * Estimado. El total oficial es calculado y confirmado por el backend al registrar la venta.
            </p>
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            ${totalEstimado.toFixed(2)}
          </div>
        </div>

        {/* Método de Pago y Observaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              maxLength={255}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Pago con cambio justo, cliente habitual..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmitVenta}
            disabled={guardando || detalles.length === 0}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-lg shadow-sm transition flex items-center space-x-2"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
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

