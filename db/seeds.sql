-- Datos de prueba para simulación del kiosco 'La Esquina'

-- 1. Usuarios iniciales
INSERT INTO usuarios (username, password, first_name, last_name, email, is_staff, is_superuser, rol, date_joined)
VALUES 
('admin', 'pbkdf2_sha256$870000$test$dummy', 'Dueño', 'Kiosco', 'admin@stockx.local', TRUE, TRUE, 'ADMIN', CURRENT_TIMESTAMP),
('vendedor1', 'pbkdf2_sha256$870000$test$dummy', 'Empleado', 'Mostrador', 'vendedor@stockx.local', FALSE, FALSE, 'VENDEDOR', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- 2. Categorías
INSERT INTO categorias (nombre, descripcion)
VALUES 
('Golosinas', 'Chocolates, alfajores, caramelos y chupetines'),
('Bebidas', 'Gaseosas, aguas, jugos y energizantes'),
('Cigarrillos', 'Cigarrillos y tabaco'),
('Snacks', 'Papas fritas, maníes y galletitas saladas')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Proveedores
INSERT INTO proveedores (nombre, contacto, telefono, email, cuit)
VALUES 
('Distribuidora Arcor La Plata', 'Roberto Gómez', '221-555-0101', 'ventas@arcorlp.com', '30-11223344-5'),
('Coca-Cola FEMSA', 'Lucía Fernández', '221-555-0202', 'pedidos@femsa.com.ar', '30-22334455-6'),
('Distribuidora Nobleza', 'Carlos Pérez', '221-555-0303', 'carlos@nobleza.com', '30-33445566-7')
ON CONFLICT (cuit) DO NOTHING;
