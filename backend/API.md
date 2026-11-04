# API StockX

Base local: `http://localhost:8000`.

## Autenticación

- `POST /api/auth/token/` recibe `username` y `password`; devuelve `access`, `refresh` y `usuario`.
- `POST /api/auth/token/refresh/` recibe `refresh`; devuelve un nuevo `access`.
- `GET /api/auth/me/` requiere `Authorization: Bearer <access>`.

## Inventario

Cada recurso dispone de listado y alta con `GET` y `POST` en su ruta base, y de consulta, reemplazo, actualización parcial y baja con `GET`, `PUT`, `PATCH` y `DELETE` en `/<id>/`:

- `/api/inventario/categorias/`
- `/api/inventario/proveedores/`
- `/api/inventario/productos/`

`ADMIN` puede realizar todas las operaciones. `VENDEDOR` sólo puede consultar categorías y productos, incluidas las alertas; no puede acceder a proveedores.

- Categoría: `nombre` es obligatorio; admite `descripcion` y `activo`.
- Proveedor: `nombre` es obligatorio; admite `contacto`, `telefono`, `email`, `direccion`, `cuit` y `activo`. `email` se valida y `cuit` es único cuando se informa.
- Producto: `nombre`, `categoria_id` y `precio_venta` son obligatorios. Admite `codigo_barra`, `descripcion`, `stock_actual`, `stock_minimo`, `fecha_vencimiento` y `activo`. El precio de costo se deriva de la última compra registrada para el producto y puede quedar `null` si aún no hubo compras.

El detalle de producto incluye `producto_proveedores` como información de solo lectura. No hay una ruta para crear o eliminar asociaciones producto–proveedor en esta iteración.

Alertas disponibles para ADMIN y VENDEDOR:

- `GET /api/inventario/productos/alertas-stock/`
- `GET /api/inventario/productos/alertas-vencimiento/`

Los datos inválidos devuelven `400`. El intento de eliminar una categoría que contiene productos devuelve `409`.

## Ventas y Movimientos de Stock

### 1. Ventas

Rutas:
- `GET /api/ventas/ventas/`: Listado de ventas. Permite filtrar por `vendedor`, `metodo_pago`, `fecha_desde` (`YYYY-MM-DD`) y `fecha_hasta` (`YYYY-MM-DD`).
- `GET /api/ventas/ventas/<id>/`: Detalle completo de una venta con ítems (`detalles`), cantidades, precios unitarios y subtotales.
- `POST /api/ventas/ventas/`: Registrar una venta.

**Permisos:**
- Tanto `ADMIN` como `VENDEDOR` pueden consultar y registrar ventas.

**Formato de entrada para creación (`POST /api/ventas/ventas/`):**
```json
{
  "metodo_pago": "EFECTIVO",
  "observaciones": "Venta en mostrador",
  "detalles": [
    {
      "producto_id": 1,
      "cantidad": 2
    },
    {
      "producto_id": 4,
      "cantidad": 1
    }
  ]
}
```
*Valores admitidos para `metodo_pago`: `EFECTIVO`, `TRANSFERENCIA`, `DEBITO`, `CREDITO`, `OTRO`.*

**Validaciones y lógica transaccional:**
- La venta debe incluir al menos un producto (`detalles` no vacío).
- No se permite repetir el mismo producto en el array de `detalles`.
- Cantidades deben ser enteros estrictamente positivos (`cantidad >= 1`).
- El precio unitario de cada detalle se toma automáticamente del `precio_venta` vigente del producto.
- Valida que haya stock suficiente para todos los productos de la venta antes de confirmar.
- Descuenta el `stock_actual` en cada producto.
- Genera automáticamente un `MovimientoStock` de tipo `VENTA` por cada producto involucrado, asociado al usuario autenticado y a la venta creada, y actualiza el `stock_actual` del producto.
- Manejo atómico y concurrente con `transaction.atomic()` y `select_for_update()`: si cualquier producto no tiene stock suficiente o falla una validación, la operación completa se revierte sin dejar registros parciales.

**Respuesta (`201 Created`):**
```json
{
  "id": 15,
  "fecha_venta": "2026-11-02T10:30:00Z",
  "total": "250.00",
  "vendedor": {
    "id": 2,
    "username": "vendedor1",
    "rol": "VENDEDOR"
  },
  "metodo_pago": "EFECTIVO",
  "observaciones": "Venta en mostrador",
  "detalles": [
    {
      "id": 22,
      "producto": 1,
      "producto_nombre": "Alfajor Chocolate",
      "producto_codigo": "7791234567890",
      "cantidad": 2,
      "precio_unitario": "100.00",
      "subtotal": "200.00"
    },
    {
      "id": 23,
      "producto": 4,
      "producto_nombre": "Turrón Mani",
      "producto_codigo": "7791234567891",
      "cantidad": 1,
      "precio_unitario": "50.00",
      "subtotal": "50.00"
    }
  ]
}
```

---

### 2. Movimientos de Stock

Rutas:
- `GET /api/ventas/movimientos/`: Listado de movimientos de stock con trazabilidad completa. Permite filtrar por `producto` (ID), `tipo`, `fecha_desde` (`YYYY-MM-DD`) y `fecha_hasta` (`YYYY-MM-DD`).
- `GET /api/ventas/movimientos/<id>/`: Detalle de un movimiento individual.
- `POST /api/ventas/movimientos/`: Registrar movimiento manual de stock.

**Permisos:**
- `ADMIN` puede consultar movimientos y registrar movimientos manuales (`POST`).
- `VENDEDOR` solo tiene acceso de lectura (`GET`). No puede registrar movimientos manuales (devuelve `403 Forbidden`).

**Tipos permitidos en alta manual:** `INGRESO`, `EGRESO`, `AJUSTE`. (*El tipo `VENTA` se genera exclusivamente a través de la API de ventas*).

**Formato de entrada para alta manual (`POST /api/ventas/movimientos/`):**
```json
{
  "producto_id": 1,
  "tipo": "INGRESO",
  "cantidad": 10,
  "motivo": "Recepción de pedido proveedor",
  "fecha_vencimiento_asociada": "2027-05-15"
}
```

**Reglas de negocio:**
- `INGRESO`: `cantidad` positiva (> 0). Incrementa el `stock_actual` del producto.
- `EGRESO`: `cantidad` positiva (> 0). Descuenta el `stock_actual` del producto. Falla con `400` si el stock disponible es menor a la cantidad solicitada.
- `AJUSTE`: `cantidad` distinta de cero (`!= 0`). Permite sumar (positiva) o restar (negativa). Falla con `400` si el stock resultante fuese menor a cero.
- Si se informa `fecha_vencimiento_asociada`, actualiza además la fecha de vencimiento del producto.
- En todos los casos registra el usuario que ejecutó la operación, la fecha del movimiento y la cantidad con signo según el ajuste del stock.
- Operación ejecutada bajo transacción con bloqueo sobre el producto (`select_for_update`).

---

El backend acepta CORS desde `http://localhost:5173` y `http://127.0.0.1:5173`.

## Pruebas

Desde la raíz del repositorio:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py test authentication inventario ventas --verbosity 1
```

El comando sin etiquetas ejecutado desde la raíz no descubre los tests del backend; se deben indicar las aplicaciones o ejecutarlo desde `backend`.
