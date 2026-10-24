-- ==============================================================================
-- StockX - Sistema de Gestión de Inventario y Stock para Kioscos
-- Módulo: Base de Datos PostgreSQL
-- Responsable: Melany Besguro
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: USUARIOS (Gestión de Roles Admin / Vendedor)
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rol VARCHAR(20) NOT NULL DEFAULT 'VENDEDOR' CHECK (rol IN ('ADMIN', 'VENDEDOR')),
    telefono VARCHAR(30) NULL
);

-- 3. TABLA: CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100) NULL,
    telefono VARCHAR(30) NULL,
    email VARCHAR(254) NULL,
    direccion VARCHAR(255) NULL,
    cuit VARCHAR(20) NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA: PRODUCTOS (Control simplificado de stock y vencimiento)
CREATE TABLE IF NOT EXISTS productos (
    id BIGSERIAL PRIMARY KEY,
    codigo_barra VARCHAR(64) NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    precio_costo NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_costo >= 0),
    precio_venta NUMERIC(12, 2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    fecha_vencimiento DATE NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA INTERMEDIA M:N: PRODUCTOS <-> PROVEEDORES
CREATE TABLE IF NOT EXISTS productos_proveedores (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    codigo_articulo_proveedor VARCHAR(64) NULL,
    precio_compra NUMERIC(12, 2) NULL CHECK (precio_compra >= 0),
    creado_el TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_producto_proveedor UNIQUE (producto_id, proveedor_id)
);

-- 7. TABLA: MOVIMIENTOS DE STOCK (1:N con Producto y trazabilidad por usuario)
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'AJUSTE')),
    cantidad INTEGER NOT NULL,
    stock_previo INTEGER NOT NULL,
    stock_posterior INTEGER NOT NULL,
    motivo VARCHAR(255) NULL,
    fecha_vencimiento_asociada DATE NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_movimiento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: VENTAS
CREATE TABLE IF NOT EXISTS ventas (
    id BIGSERIAL PRIMARY KEY,
    fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    vendedor_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'EFECTIVO' CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'OTRO')),
    observaciones VARCHAR(255) NULL
);

-- 9. TABLA: DETALLES DE VENTAS (1:N con Venta, N:1 con Producto)
CREATE TABLE IF NOT EXISTS detalles_ventas (
    id BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO PARA EL KIOSCO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_prod_codigo_barra ON productos(codigo_barra);
CREATE INDEX IF NOT EXISTS idx_prod_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_prod_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_prod_stock_alert ON productos(stock_actual, stock_minimo);
CREATE INDEX IF NOT EXISTS idx_prod_vencimiento ON productos(activo, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_mov_producto ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos_stock(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_mov_prod_fecha ON movimientos_stock(producto_id, fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_mov_usuario ON movimientos_stock(usuario_id);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_vend ON ventas(fecha_venta, vendedor_id);

CREATE INDEX IF NOT EXISTS idx_det_venta ON detalles_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_det_prod ON detalles_ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_det_prod_venta ON detalles_ventas(producto_id, venta_id);
