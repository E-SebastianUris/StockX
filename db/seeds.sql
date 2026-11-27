-- =====================================================================
-- StockX — Datos de Prueba y Demostración: "Kiosco La Esquina"
-- =====================================================================
-- Simulación realista de un comercio argentino (kiosco/almacén de barrio)
-- Incluye: Categorías, Proveedores emblemáticos, Usuarios de prueba,
-- Productos con control de stock/vencimiento, Compras históricas (costo),
-- Movimientos de stock y Ventas del día actual e históricas del mes.
--
-- Ejecutar sobre una base con las migraciones de Django ya aplicadas.
-- Idempotente: seguro de ejecutar múltiples veces sin duplicar registros.
-- =====================================================================

-- 1. Categorías comerciales
INSERT INTO categorias (nombre, descripcion, activo, creado_el, actualizado_el)
VALUES
('Golosinas y Chocolates', 'Chocolates, alfajores, caramelos y chupetines.', TRUE, NOW(), NOW()),
('Bebidas y Aguas', 'Gaseosas, aguas saborizadas, jugos, energizantes y cervezas.', TRUE, NOW(), NOW()),
('Snacks y Salados', 'Papas fritas, maníes, galletitas saladas y chizitos.', TRUE, NOW(), NOW()),
('Galletitas y Panificados', 'Galletitas dulces, rellenas y panadería empaquetada.', TRUE, NOW(), NOW()),
('Cigarrillos y Fósforos', 'Cigarrillos, encendedores y accesorios de fumador.', TRUE, NOW(), NOW()),
('Almacén y Varios', 'Café, yerba, artículos de librería menor y conveniencia.', TRUE, NOW(), NOW())
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    actualizado_el = NOW();

-- 2. Proveedores habituales en Argentina
INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, cuit, activo, creado_el, actualizado_el)
VALUES
('Distribuidora Arcor La Plata', 'Roberto Gómez', '221-555-0101', 'ventas@arcorlp.com', 'Calle 13 e/ 45 y 46 Nro 1234', '30-11223344-5', TRUE, NOW(), NOW()),
('Coca-Cola FEMSA Argentina', 'Lucía Fernández', '221-555-0202', 'pedidos@femsa.com.ar', 'Av. 44 Nro 2540', '30-22334455-6', TRUE, NOW(), NOW()),
('Mondelez International Distribución', 'Carlos Pérez', '221-555-0303', 'carlos@mondelez-dist.com', 'Calle 7 Nro 890', '30-33445566-7', TRUE, NOW(), NOW()),
('Cervecería y Maltería Quilmes', 'Martín Morales', '221-555-0404', 'pedidos@quilmes.com.ar', 'Av. 520 Nro 3410', '30-44556677-8', TRUE, NOW(), NOW()),
('Pepsico Snacks La Plata', 'Mariana Rossi', '221-555-0505', 'ventas@pepsico.com.ar', 'Calle 32 Nro 1520', '30-55667788-9', TRUE, NOW(), NOW()),
('Massalin Particulares Mayorista', 'Esteban Bianchi', '221-555-0606', 'contacto@massalin.com.ar', 'Diagonal 74 Nro 1140', '30-66778899-0', TRUE, NOW(), NOW())
ON CONFLICT (cuit) DO UPDATE
SET nombre = EXCLUDED.nombre,
    contacto = EXCLUDED.contacto,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    direccion = EXCLUDED.direccion,
    actualizado_el = NOW();

-- 3. Usuarios de prueba
INSERT INTO usuarios (username, password, first_name, last_name, email, is_staff, is_superuser, is_active, rol, telefono, date_joined)
VALUES
('admin_test', '!UNUSABLE_PASSWORD_USE_MANAGE_PY_OR_SEED_COMMAND', 'Administrador', 'Kiosco', 'admin@stockx.local', TRUE, TRUE, TRUE, 'ADMIN', '221-444-0001', NOW()),
('vendedor_test', '!UNUSABLE_PASSWORD_USE_MANAGE_PY_OR_SEED_COMMAND', 'Ezequiel', 'Mostrador', 'vendedor@stockx.local', FALSE, FALSE, TRUE, 'VENDEDOR', '221-444-0002', NOW())
ON CONFLICT (username) DO NOTHING;

-- 4. Productos emblemáticos con control de stock y vencimiento
INSERT INTO productos (codigo_barra, nombre, descripcion, categoria_id, precio_venta, stock_actual, stock_minimo, fecha_vencimiento, activo, creado_el, actualizado_el)
VALUES
-- Golosinas
('7790580123456', 'Alfajor Jorgito Chocolate 55g', 'Alfajor relleno con dulce de leche 55g',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 800.00, 28, 10, CURRENT_DATE + INTERVAL '45 days', TRUE, NOW(), NOW()),
('7790580123457', 'Alfajor Guaymallén Blanco 38g', 'Alfajor blanco relleno con dulce de leche',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 500.00, 42, 15, CURRENT_DATE + INTERVAL '60 days', TRUE, NOW(), NOW()),
('7790580123458', 'Alfajor Havanna 70% Cacao 90g', 'Alfajor premium chocolate amargo 70%',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 2200.00, 14, 5, CURRENT_DATE + INTERVAL '30 days', TRUE, NOW(), NOW()),
('7793333444455', 'Turron de Mani Arcor 25g', 'Turrón oblea relleno de pasta de maní',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 400.00, 0, 15, CURRENT_DATE + INTERVAL '90 days', TRUE, NOW(), NOW()), -- Sin stock
('7790580123460', 'Chicles Beldent Menta 10s', 'Chicles sin azúcar sabor menta fuerte',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 600.00, 35, 10, CURRENT_DATE + INTERVAL '180 days', TRUE, NOW(), NOW()),
('7790580123461', 'Caramelos Sugus Surtidos 50g', 'Caramelos masticables de frutas',
 (SELECT id FROM categorias WHERE nombre = 'Golosinas y Chocolates'), 750.00, 18, 8, CURRENT_DATE + INTERVAL '120 days', TRUE, NOW(), NOW()),

-- Bebidas
('7791234567890', 'Coca Cola 500ml PET', 'Gaseosa cola regular botella descartable 500ml',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 1500.00, 4, 10, CURRENT_DATE + INTERVAL '120 days', TRUE, NOW(), NOW()), -- Alerta stock mínimo
('7791234567891', 'Coca Cola 1.5L PET', 'Gaseosa cola regular 1.5 litros',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 2800.00, 16, 6, CURRENT_DATE + INTERVAL '90 days', TRUE, NOW(), NOW()),
('7791234567892', 'Sprite Lima Limon 500ml', 'Gaseosa lima limón botella 500ml',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 1400.00, 18, 8, CURRENT_DATE + INTERVAL '100 days', TRUE, NOW(), NOW()),
('7791234567893', 'Agua Villavicencio 500ml', 'Agua mineral natural sin gas',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 1000.00, 25, 10, CURRENT_DATE + INTERVAL '150 days', TRUE, NOW(), NOW()),
('7791234567894', 'Energizante Monster Energy 473ml', 'Bebida energizante lata 473ml',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 2500.00, 14, 6, CURRENT_DATE + INTERVAL '200 days', TRUE, NOW(), NOW()),
('7791234567895', 'Cerveza Quilmes Clásica 473ml Lata', 'Cerveza rubia en lata 473ml',
 (SELECT id FROM categorias WHERE nombre = 'Bebidas y Aguas'), 1800.00, 30, 12, CURRENT_DATE + INTERVAL '180 days', TRUE, NOW(), NOW()),

-- Snacks
('7799876543210', 'Papas Fritas Lays Clásicas 85g', 'Papas fritas clásicas saladas 85g',
 (SELECT id FROM categorias WHERE nombre = 'Snacks y Salados'), 2100.00, 7, 5, CURRENT_DATE + INTERVAL '5 days', TRUE, NOW(), NOW()), -- Alerta vencimiento urgente
('7799876543211', 'Doritos Mega Queso 90g', 'Tortillas de maíz sabor mega queso 90g',
 (SELECT id FROM categorias WHERE nombre = 'Snacks y Salados'), 2400.00, 12, 5, CURRENT_DATE + INTERVAL '60 days', TRUE, NOW(), NOW()),
('7799876543212', 'Maní Salado Pehuamar 100g', 'Maní tostado y salado 100g',
 (SELECT id FROM categorias WHERE nombre = 'Snacks y Salados'), 1200.00, 20, 8, CURRENT_DATE + INTERVAL '45 days', TRUE, NOW(), NOW()),

-- Galletitas
('7794567890123', 'Galletitas Oreo 118g', 'Galletitas de chocolate rellenas con crema 118g',
 (SELECT id FROM categorias WHERE nombre = 'Galletitas y Panificados'), 1400.00, 22, 8, CURRENT_DATE + INTERVAL '75 days', TRUE, NOW(), NOW()),
('7794567890124', 'Galletitas Chocolinas 170g', 'Galletitas de chocolate para chocotorta 170g',
 (SELECT id FROM categorias WHERE nombre = 'Galletitas y Panificados'), 1300.00, 16, 8, CURRENT_DATE + INTERVAL '60 days', TRUE, NOW(), NOW()),
('7794567890125', 'Galletitas Rumba 112g', 'Galletitas dulces rellenas sabor coco 112g',
 (SELECT id FROM categorias WHERE nombre = 'Galletitas y Panificados'), 1200.00, 15, 6, CURRENT_DATE + INTERVAL '80 days', TRUE, NOW(), NOW()),

-- Cigarrillos y Varios
('7798901234567', 'Cigarrillos Marlboro Box 20', 'Cigarrillos rubios atado box 20 unidades',
 (SELECT id FROM categorias WHERE nombre = 'Cigarrillos y Fósforos'), 3500.00, 25, 10, NULL, TRUE, NOW(), NOW()),
('7798901234568', 'Encendedor Bic Maxi', 'Encendedor a gas descartable tamaño grande',
 (SELECT id FROM categorias WHERE nombre = 'Cigarrillos y Fósforos'), 1200.00, 15, 5, NULL, TRUE, NOW(), NOW())
ON CONFLICT (codigo_barra) DO UPDATE
SET nombre = EXCLUDED.nombre,
    precio_venta = EXCLUDED.precio_venta,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    fecha_vencimiento = EXCLUDED.fecha_vencimiento,
    actualizado_el = NOW();

-- 5. Compras históricas (ProductoProveedor) para cálculo derivado de precio_costo
INSERT INTO productos_proveedores (producto_id, proveedor_id, codigo_articulo_proveedor, cantidad_compra, fecha_compra, precio_compra, creado_el)
SELECT p.id, pr.id, 'ALFA-JORG-01', 120, CURRENT_DATE - INTERVAL '15 days', 480.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7790580123456' AND pr.cuit = '30-11223344-5'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'ALFA-JORG-01')
UNION ALL
SELECT p.id, pr.id, 'ALFA-GUAY-01', 200, CURRENT_DATE - INTERVAL '15 days', 290.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7790580123457' AND pr.cuit = '30-11223344-5'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'ALFA-GUAY-01')
UNION ALL
SELECT p.id, pr.id, 'ALFA-HAV-01', 50, CURRENT_DATE - INTERVAL '15 days', 1450.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7790580123458' AND pr.cuit = '30-11223344-5'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'ALFA-HAV-01')
UNION ALL
SELECT p.id, pr.id, 'CC500-01', 80, CURRENT_DATE - INTERVAL '12 days', 920.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7791234567890' AND pr.cuit = '30-22334455-6'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'CC500-01')
UNION ALL
SELECT p.id, pr.id, 'LAYS-85-01', 40, CURRENT_DATE - INTERVAL '8 days', 1280.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7799876543210' AND pr.cuit = '30-55667788-9'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'LAYS-85-01')
UNION ALL
SELECT p.id, pr.id, 'QUILM-473-01', 60, CURRENT_DATE - INTERVAL '10 days', 1100.00, NOW()
FROM productos p, proveedores pr WHERE p.codigo_barra = '7791234567895' AND pr.cuit = '30-44556677-8'
  AND NOT EXISTS (SELECT 1 FROM productos_proveedores x WHERE x.producto_id = p.id AND x.codigo_articulo_proveedor = 'QUILM-473-01');
