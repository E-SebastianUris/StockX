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
- Producto: `nombre`, `categoria_id` y `precio_venta` son obligatorios. Admite `codigo_barra`, `descripcion`, `precio_costo`, `stock_actual`, `stock_minimo`, `fecha_vencimiento` y `activo`. Precios y stocks no pueden ser negativos.

El detalle de producto incluye `producto_proveedores` como información de solo lectura. No hay una ruta para crear o eliminar asociaciones producto–proveedor en esta iteración.

Alertas disponibles para ADMIN y VENDEDOR:

- `GET /api/inventario/productos/alertas-stock/`
- `GET /api/inventario/productos/alertas-vencimiento/`

Los datos inválidos devuelven `400`. El intento de eliminar una categoría que contiene productos devuelve `409`.

El backend acepta CORS desde `http://localhost:5173` y `http://127.0.0.1:5173`.

## Pruebas

Desde la raíz del repositorio:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py test authentication inventario --verbosity 1
```

El comando sin etiquetas ejecutado desde la raíz no descubre los tests del backend; se deben indicar las aplicaciones o ejecutarlo desde `backend`.
