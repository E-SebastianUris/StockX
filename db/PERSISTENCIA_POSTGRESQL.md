# StockX — Guía de Base de Datos y Persistencia (Entrega Parcial 1)

## 1. Esquema administrado por Django

De acuerdo a la arquitectura acordada, **Django es el único responsable del ciclo de vida del esquema** (`managed = True` en los modelos ORM):
- Las tablas, columnas, claves primarias, claves foráneas, restricciones (`CHECK`, `UNIQUE`) e índices son generados y versionados mediante las migraciones de Django en `backend/authentication/migrations/` y `backend/inventario/migrations/`.
- `db/schema.sql` y `db/DICCIONARIO_DATOS.md` se mantienen como el diseño formal de referencia de la base de datos relacional.

### Tablas bajo control de Django:
1. `usuarios`: Extensión de `AbstractUser` de Django (`authentication.Usuario`) con atributos `rol` (`ADMIN`, `VENDEDOR`) y `telefono`.
2. `categorias`: Clasificación de artículos de kiosco (`inventario.Categoria`).
3. `proveedores`: Distribuidores mayoristas (`inventario.Proveedor`).
4. `productos`: Artículos, precios, stock y vencimiento (`inventario.Producto`).
5. `productos_proveedores`: Relación N:M explícita con precios de compra (`inventario.ProductoProveedor`).

---

## 2. Configuración de PostgreSQL

El backend utiliza el conector nativo `psycopg` (versión 3) ya instalado en el entorno virtual (`.venv`).
La conexión a PostgreSQL se gestiona mediante variables de entorno en `backend/config/settings.py`.

### Variables de entorno requeridas:
| Variable | Descripción | Valor por defecto si no se define |
|---|---|---|
| `DB_ENGINE` | Motor de base de datos | `postgresql` |
| `DB_NAME` | Nombre de la base de datos | *(Si está vacío, recurre a SQLite local de respaldo)* |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña del usuario | `""` |
| `DB_HOST` | Host del servidor PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de escucha | `5432` |

Existe un archivo de plantilla en [`backend/.env.example`](file:///C:/GitHub/Facultad/TIF/StockX/backend/.env.example).

---

## 3. Preparación y aplicación de migraciones

Las migraciones iniciales ya se encuentran generadas y validadas:
- [`backend/authentication/migrations/0001_initial.py`](file:///C:/GitHub/Facultad/TIF/StockX/backend/authentication/migrations/0001_initial.py)
- [`backend/inventario/migrations/0001_initial.py`](file:///C:/GitHub/Facultad/TIF/StockX/backend/inventario/migrations/0001_initial.py)

El orden de dependencias asegura que `auth` y `Usuario` se resuelvan antes de las tablas dependientes.

---

## 4. Datos iniciales (`db/seeds.sql`) y Creación de Usuarios

- **Usuarios**: **No se deben insertar usuarios por SQL con passwords en texto plano o ficticias**. Los usuarios y sus contraseñas deben crearse siempre a través del CLI de Django (`createsuperuser` o `manage.py shell`) para garantizar el hashing PBKDF2/Argon2 nativo.
- **Categorías, Proveedores y Productos**: Una vez aplicadas las migraciones de Django sobre PostgreSQL, se pueden cargar los datos maestros de prueba ejecutando `db/seeds.sql` (que utiliza cláusulas `ON CONFLICT` seguras) o a través del panel de administración Django (`/admin/`).

---

## 5. Instrucciones manuales para el responsable del proyecto

Para conectar y verificar tu PostgreSQL local:

1. **Crear la base de datos en PostgreSQL (si aún no existe)**:
   ```powershell
   psql -U postgres -c "CREATE DATABASE stockx_db;"
   ```

2. **Configurar las variables de entorno en tu terminal (PowerShell)**:
   ```powershell
   $env:DB_NAME="stockx_db"
   $env:DB_USER="postgres"
   $env:DB_PASSWORD="tu_password_aqui"
   $env:DB_HOST="localhost"
   $env:DB_PORT="5432"
   ```

3. **Aplicar las migraciones desde el directorio `backend`**:
   ```powershell
   cd C:\GitHub\Facultad\TIF\StockX\backend
   .\.venv\Scripts\python.exe manage.py migrate
   ```

4. **Crear el usuario Administrador inicial (con hash seguro de Django)**:
   ```powershell
   .\.venv\Scripts\python.exe manage.py createsuperuser
   ```

5. **(Opcional) Cargar los datos semilla de categorías, proveedores y productos**:
   ```powershell
   psql -U postgres -d stockx_db -f ..\db\seeds.sql
   ```
