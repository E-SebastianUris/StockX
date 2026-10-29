## 1. Estrategia de Administración del Esquema

- **Decisión a coordinar:** Determinar si Django será el dueño absoluto del esquema (`managed = True` con migraciones generadas desde los modelos ORM de Django) o si las tablas se crearán con `db/schema.sql` y se marcarán con `managed = False` (o se utilizará `inspectdb`).
- **Recomendación estándar UTN / Django:** Que los modelos en Django reflejen exactamente los campos, tablas e índices especificados en `db/schema.sql` y que las migraciones de Django se apliquen de forma controlada para mantener consistencia con los tests automáticos y entornos CI/CD.

---

## 2. Modelo de Usuario y Autenticación (JWT)

- **Estructura en BD:** La tabla `usuarios` incluye los atributos requeridos por Django (`password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`) junto con el atributo del dominio `rol` (`ADMIN`, `VENDEDOR`) y `telefono`.
- **Decisión pendiente en Backend:**
  - Configurar `AUTH_USER_MODEL = 'authentication.Usuario'` en `settings.py`.
  - Heredar de `AbstractUser` en el backend para admitir compatibilidad nativa con `djangorestframework-simplejwt`.
  - La creación de credenciales debe hacerse exclusivamente mediante `createsuperuser` o servicios de registro de Django, evitando insertar hashes manuales en scripts SQL sin validación del hasher activo (PBKDF2/Argon2).

---

## 3. Transacción Atómica de Venta y Descuento de Stock

- **Principio de responsabilidad única:**
  - Se eliminaron los triggers de descuento automático en PostgreSQL para evitar condiciones de carrera o descuentos duplicados.
  - La transacción completa de venta es responsabilidad del backend y debe encapsularse en un bloque transaccional atómico (`with transaction.atomic():`).
- **Flujo requerido en Django:**
  1. Bloquear filas de productos involucrados mediante `select_for_update()`.
  2. Verificar disponibilidad de existencias (`stock_actual >= cantidad`).
  3. Crear encabezado `Venta` y líneas de `DetalleVenta`.
  4. Descontar `stock_actual` en `Producto`.
  5. Crear los registros correspondientes en `MovimientoStock` (con `tipo = 'VENTA'`, `cantidad = -N`, `stock_previo`, `stock_posterior`, `usuario_id` y `venta_id`).
  6. Confirmar la transacción (commit automático). Si falla alguna validación, rollback completo.

---

## 4. Consistencia del Total de Venta

- En `db/schema.sql`, la tabla `detalles_ventas` cuenta con la restricción `UNIQUE(venta_id, producto_id)` y validación `cantidad > 0`, `precio_unitario >= 0`, `subtotal >= 0`.
- El cálculo exacto del `total` de la venta (`SUM(subtotal)`) debe ser garantizado por el backend en el serializer/servicio de checkout antes de persistir el registro en `ventas`.

---

## 5. Vistas SQL en Django ORM

- Las vistas `vista_alertas_stock_minimo`, `vista_alertas_vencimiento` y `vista_productos_mas_vendidos` pueden ser mapeadas directamente en Django como modelos no administrados:
  ```python
  class VistaAlertaStockMinimo(models.Model):
      producto_id = models.BigIntegerField(primary_key=True)
      ...
      class Meta:
          managed = False
          db_table = 'vista_alertas_stock_minimo'
  ```
  Esto permite que las vistas sirvan directamente como soporte de alto rendimiento para los endpoints del Dashboard sin generar carga de cálculo repetitivo en Python.
