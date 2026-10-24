-- ==============================================================================
-- StockX - Sistema de Gestión de Inventario y Stock para Kioscos
-- Módulo: Base de Datos PostgreSQL - Vistas y Triggers de Integridad
-- Responsable: Melany Besguro
-- ==============================================================================

-- ==============================================================================
-- 1. VISTAS PARA DASHBOARD, REPORTES Y ALERTAS (Objetivos 3.2 y Criterio 10.9)
-- ==============================================================================

-- Vista 1: Alertas de Stock Mínimo (Quiebre de stock inminente o actual)
CREATE OR REPLACE VIEW vista_alertas_stock_minimo AS
SELECT 
    p.id AS producto_id,
    p.codigo_barra,
    p.nombre AS producto_nombre,
    c.nombre AS categoria_nombre,
    p.stock_actual,
    p.stock_minimo,
    (p.stock_minimo - p.stock_actual) AS unidades_faltantes,
    CASE 
        WHEN p.stock_actual = 0 THEN 'SIN STOCK'
        WHEN p.stock_actual <= (p.stock_minimo / 2) THEN 'CRITICO'
        ELSE 'BAJO'
    END AS nivel_alerta
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = TRUE 
  AND p.stock_actual <= p.stock_minimo
ORDER BY p.stock_actual ASC;

-- Vista 2: Alertas de Vencimiento Simplificado (Próximos a vencer en <= 15 días o vencidos)
CREATE OR REPLACE VIEW vista_alertas_vencimiento AS
SELECT 
    p.id AS producto_id,
    p.codigo_barra,
    p.nombre AS producto_nombre,
    c.nombre AS categoria_nombre,
    p.stock_actual,
    p.fecha_vencimiento,
    (p.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer,
    CASE 
        WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
        WHEN (p.fecha_vencimiento - CURRENT_DATE) <= 7 THEN 'URGENTE'
        ELSE 'PROXIMO'
    END AS estado_vencimiento
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = TRUE 
  AND p.fecha_vencimiento IS NOT NULL
  AND p.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '15 days')
ORDER BY p.fecha_vencimiento ASC;

-- Vista 3: Reporte de Rotación y Productos Más Vendidos
CREATE OR REPLACE VIEW vista_productos_mas_vendidos AS
SELECT 
    p.id AS producto_id,
    p.codigo_barra,
    p.nombre AS producto_nombre,
    c.nombre AS categoria_nombre,
    COALESCE(SUM(dv.cantidad), 0) AS total_unidades_vendidas,
    COALESCE(SUM(dv.subtotal), 0.00) AS total_recaudado,
    COUNT(DISTINCT v.id) AS cantidad_ventas_asociadas
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN detalles_ventas dv ON p.id = dv.producto_id
LEFT JOIN ventas v ON dv.venta_id = v.id
GROUP BY p.id, p.codigo_barra, p.nombre, c.nombre
ORDER BY total_unidades_vendidas DESC;

-- ==============================================================================
-- 2. TRIGGERS Y FUNCIONES DE INTEGRIDAD TRANSACCIONAL
-- ==============================================================================

-- Función y Trigger: Descontar stock automáticamente al registrar DetalleVenta
CREATE OR REPLACE FUNCTION fn_descontar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_disponible INT;
    v_nombre_prod VARCHAR(150);
BEGIN
    -- Validar existencia y stock actual suficiente
    SELECT stock_actual, nombre INTO v_stock_disponible, v_nombre_prod
    FROM productos
    WHERE id = NEW.producto_id
    FOR UPDATE;

    IF v_stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto "%": disponible %, solicitado %',
            v_nombre_prod, v_stock_disponible, NEW.cantidad;
    END IF;

    -- Actualizar stock restando la cantidad vendida
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad,
        actualizado_el = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_descontar_stock_venta ON detalles_ventas;
CREATE TRIGGER trg_descontar_stock_venta
AFTER INSERT ON detalles_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_descontar_stock_venta();

-- Función y Trigger: Restituir stock si se elimina o cancela un detalle de venta
CREATE OR REPLACE FUNCTION fn_restituir_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock_actual = stock_actual + OLD.cantidad,
        actualizado_el = CURRENT_TIMESTAMP
    WHERE id = OLD.producto_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restituir_stock_venta ON detalles_ventas;
CREATE TRIGGER trg_restituir_stock_venta
AFTER DELETE ON detalles_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_restituir_stock_venta();
