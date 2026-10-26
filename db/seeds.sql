-- NOTA IMPORTANTE:
-- Los usuarios de prueba se insertan sin hashes simulados o no funcionales.
-- Se define una contraseña temporal no utilizable 'UNUSABLE_PASSWORD_TO_BE_SET_BY_DJANGO'.
-- La creación operativa de credenciales reales debe realizarse mediante Django CLI
-- (createsuperuser o manage.py shell) para garantizar el algoritmo PBKDF2/Argon2 nativo.

-- 1. Categorías iniciales
INSERT INTO categorias (nombre, descripcion, activo)
VALUES 
('Golosinas', 'Chocolates, alfajores, caramelos y chupetines', TRUE),
('Bebidas', 'Gaseosas, aguas saborizadas, jugos y energizantes', TRUE),
('Cigarrillos', 'Cigarrillos, tabaco y accesorios para fumador', TRUE),
('Snacks', 'Papas fritas, maníes y galletitas saladas', TRUE)
ON CONFLICT (nombre) DO UPDATE 
SET descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

-- 2. Proveedores habituales del comercio
INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, cuit, activo)
VALUES 
('Distribuidora Arcor La Plata', 'Roberto Gómez', '221-555-0101', 'ventas@arcorlp.com', 'Calle 13 e/ 45 y 46 Nro 1234', '30-11223344-5', TRUE),
('Coca-Cola FEMSA', 'Lucía Fernández', '221-555-0202', 'pedidos@femsa.com.ar', 'Av. 44 Nro 2540', '30-22334455-6', TRUE),
('Distribuidora Nobleza', 'Carlos Pérez', '221-555-0303', 'carlos@nobleza.com', 'Calle 7 Nro 890', '30-33445566-7', TRUE)
ON CONFLICT (cuit) DO UPDATE
SET nombre = EXCLUDED.nombre,
    contacto = EXCLUDED.contacto,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    direccion = EXCLUDED.direccion;

-- 3. Usuarios de ejemplo con estructura compatible
INSERT INTO usuarios (username, password, first_name, last_name, email, is_staff, is_superuser, is_active, rol, telefono)
VALUES 
('admin_kiosco', '!UNUSABLE_PASSWORD_REQUIRES_DJANGO_CREATESUPERUSER', 'Dueño', 'La Esquina', 'admin@stockx.local', TRUE, TRUE, TRUE, 'ADMIN', '221-444-0001'),
('vendedor_turno', '!UNUSABLE_PASSWORD_REQUIRES_DJANGO_CREATESUPERUSER', 'Empleado', 'Mostrador', 'vendedor@stockx.local', FALSE, FALSE, TRUE, 'VENDEDOR', '221-444-0002')
ON CONFLICT (username) DO NOTHING;

-- 4. Productos de muestra para pruebas del Kiosco 'La Esquina'
INSERT INTO productos (codigo_barra, nombre, descripcion, categoria_id, precio_costo, precio_venta, stock_actual, stock_minimo, fecha_vencimiento, activo)
VALUES
('7790580123456', 'Alfajor Jorgito Chocolate', 'Alfajor relleno con dulce de leche 55g', 1, 450.00, 800.00, 24, 10, CURRENT_DATE + INTERVAL '45 days', TRUE),
('7791234567890', 'Coca Cola 500ml', 'Gaseosa regular botella PET 500ml', 2, 750.00, 1300.00, 4, 10, CURRENT_DATE + INTERVAL '120 days', TRUE), -- En alerta stock mínimo
('7799876543210', 'Papas Fritas Lays Clásicas 85g', 'Papas fritas saladas', 4, 900.00, 1600.00, 15, 5, CURRENT_DATE + INTERVAL '5 days', TRUE),   -- En alerta de vencimiento urgente
('7790001112223', 'Turrón de Maní Arcor 25g', 'Turrón oblea relleno de pasta de turrón', 1, 150.00, 300.00, 0, 15, CURRENT_DATE + INTERVAL '90 days', TRUE)     -- Sin stock
ON CONFLICT (codigo_barra) DO NOTHING;
