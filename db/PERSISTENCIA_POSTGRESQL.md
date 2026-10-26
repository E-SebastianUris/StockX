# StockX — Guía de Base de Datos y Persistencia (Entrega Parcial 1)

## 1. Esquema administrado por Django

Django es el **único responsable del ciclo de vida del esquema** (`managed = True`):
- Las **8 tablas**, sus claves primarias, claves foráneas, restricciones (`CHECK`, `UNIQUE`) e índices son generados y versionados exclusivamente mediante las migraciones de Django en `backend/authentication/`, `backend/inventario/` y `backend/ventas/`.
- Las **3 vistas de reporte y alertas** están integradas como una migración estándar (`ventas/migrations/0002_create_views.py`), asegurando reproducibilidad tanto en desarrollo como en CI/CD o producción.

### Tablas bajo control de Django (8 tablas):
1. `usuarios`: Extensión de `AbstractUser` de Django (`authentication.Usuario`) con atributos `rol` (`ADMIN`, `VENDEDOR`) y `telefono`.
2. `categorias`: Clasificación de artículos de kiosco (`inventario.Categoria`).
3. `proveedores`: Distribuidores mayoristas (`inventario.Proveedor`).
4. `productos`: Artículos, precios, stock y vencimiento (`inventario.Producto`).
5. `productos_proveedores`: Relación N:M explícita con precios de compra (`inventario.ProductoProveedor`).
6. `ventas`: Encabezado transaccional de operaciones en mostrador (`ventas.Venta`).
7. `detalles_ventas`: Renglones de venta con validaciones de subtotal y cantidad (`ventas.DetalleVenta`).
8. `movimientos_stock`: Trazabilidad completa e inmutable de stock (`ventas.MovimientoStock`).

### Vistas SQL integradas (3 vistas):
1. `vista_alertas_stock_minimo`: Detección de productos en umbral mínimo o sin stock.
2. `vista_alertas_vencimiento`: Detección de productos próximos a caducar (<= 15 días).
3. `vista_productos_mas_vendidos`: Consolidado de rotación de ventas.

---

## 2. Configuración de PostgreSQL

El backend utiliza el conector nativo `psycopg` (versión 3).
La conexión a PostgreSQL se gestiona mediante variables de entorno en `backend/config/settings.py` (con fallback a SQLite local si no se definen variables).

### Variables de entorno requeridas:
| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DB_ENGINE` | Motor de base de datos | `postgresql` |
| `DB_NAME` | Nombre de la base de datos | *(Vacío -> Fallback a SQLite)* |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña del usuario | `""` |
| `DB_HOST` | Host del servidor PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de escucha | `5432` |

Plantilla disponible en [`backend/.env.example`](file:///C:/GitHub/Facultad/TIF/StockX/backend/.env.example).

---

## 3. Estado de migraciones

El árbol de migraciones se encuentra completo y validado:
- `authentication.0001_initial`
- `inventario.0001_initial`
- `ventas.0001_initial`
- `ventas.0002_create_views`

---

## 4. Datos iniciales (`db/seeds.sql`) y Creación de Usuarios

- **Usuarios**: Siempre mediante el CLI de Django (`createsuperuser` o `manage.py shell`) para garantizar el hashing seguro (PBKDF2/Argon2).
- **Categorías, Proveedores y Productos**: Una vez aplicadas las migraciones, se pueden cargar desde `db/seeds.sql` mediante `psql` o a través del admin de Django.

---

## 5. Único paso manual para dejar la base terminada

Ejecutar desde PowerShell en `backend/`:

```powershell
cd C:\GitHub\Facultad\TIF\StockX\backend
$env:DB_NAME="stockx_db"
$env:DB_USER="postgres"
$env:DB_PASSWORD="tu_password_local"
.\.venv\Scripts\python.exe manage.py migrate
```
