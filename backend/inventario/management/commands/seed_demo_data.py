from datetime import timedelta
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from authentication.models import Usuario
from inventario.models import Categoria, Proveedor, Producto, ProductoProveedor
from ventas.models import Venta, DetalleVenta, MovimientoStock


class Command(BaseCommand):
    help = 'Pobla la base de datos con un día normal y comercial realista de un kiosco argentino (Kiosco La Esquina)'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de datos de prueba para Kiosco La Esquina...'))

        # 1. Usuarios
        admin, _ = Usuario.objects.get_or_create(
            username='admin_test',
            defaults={
                'first_name': 'Administrador',
                'last_name': 'Kiosco',
                'email': 'admin@stockx.local',
                'rol': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin.set_password('admin123')
        admin.rol = 'ADMIN'
        admin.save()

        vendedor, _ = Usuario.objects.get_or_create(
            username='vendedor_test',
            defaults={
                'first_name': 'Ezequiel',
                'last_name': 'Mostrador',
                'email': 'vendedor@stockx.local',
                'rol': 'VENDEDOR',
                'is_staff': False,
                'is_superuser': False,
            }
        )
        vendedor.set_password('vendedor123')
        vendedor.rol = 'VENDEDOR'
        vendedor.save()

        self.stdout.write(self.style.SUCCESS('  ✓ Usuarios configurados (admin_test / vendedor_test)'))

        # 2. Categorías
        categorias_data = [
            ('Golosinas y Chocolates', 'Alfajores, chocolates, caramelos y confituras.'),
            ('Bebidas y Aguas', 'Gaseosas, aguas saborizadas, energizantes y cervezas.'),
            ('Snacks y Salados', 'Papas fritas, chizitos, maní y galletitas saladas.'),
            ('Galletitas y Panificados', 'Galletitas dulces, rellenas y panadería empaquetada.'),
            ('Cigarrillos y Fósforos', 'Cigarrillos, encendedores y accesorios de fumador.'),
            ('Almacén y Varios', 'Café, yerba, artículos de librería menor y conveniencia.'),
        ]
        cat_map = {}
        for nombre, desc in categorias_data:
            cat, _ = Categoria.objects.update_or_create(
                nombre=nombre,
                defaults={'descripcion': desc, 'activo': True}
            )
            cat_map[nombre] = cat

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(cat_map)} categorías registradas'))

        # 3. Proveedores habituales en Argentina
        proveedores_data = [
            ('Distribuidora Arcor La Plata', 'Roberto Gómez', '221-555-0101', 'ventas@arcorlp.com', 'Calle 13 e/ 45 y 46 Nro 1234', '30-11223344-5'),
            ('Coca-Cola FEMSA Argentina', 'Lucía Fernández', '221-555-0202', 'pedidos@femsa.com.ar', 'Av. 44 Nro 2540', '30-22334455-6'),
            ('Mondelez International Distribución', 'Carlos Pérez', '221-555-0303', 'carlos@mondelez-dist.com', 'Calle 7 Nro 890', '30-33445566-7'),
            ('Cervecería y Maltería Quilmes', 'Martín Morales', '221-555-0404', 'pedidos@quilmes.com.ar', 'Av. 520 Nro 3410', '30-44556677-8'),
            ('Pepsico Snacks La Plata', 'Mariana Rossi', '221-555-0505', 'ventas@pepsico.com.ar', 'Calle 32 Nro 1520', '30-55667788-9'),
            ('Massalin Particulares Mayorista', 'Esteban Bianchi', '221-555-0606', 'contacto@massalin.com.ar', 'Diagonal 74 Nro 1140', '30-66778899-0'),
        ]
        prov_map = {}
        for nom, cont, tel, email, dir_, cuit in proveedores_data:
            prov, _ = Proveedor.objects.update_or_create(
                cuit=cuit,
                defaults={
                    'nombre': nom,
                    'contacto': cont,
                    'telefono': tel,
                    'email': email,
                    'direccion': dir_,
                    'activo': True,
                }
            )
            prov_map[nom] = prov

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(prov_map)} proveedores registrados'))

        # 4. Productos emblemáticos de un kiosco argentino
        hoy = timezone.now().date()
        productos_data = [
            # Golosinas
            ('7790580123456', 'Alfajor Jorgito Chocolate 55g', 'Golosinas y Chocolates', 'Distribuidora Arcor La Plata', Decimal('800.00'), Decimal('480.00'), 28, 10, hoy + timedelta(days=45), 'ALFA-JORG-01'),
            ('7790580123457', 'Alfajor Guaymallén Blanco 38g', 'Golosinas y Chocolates', 'Distribuidora Arcor La Plata', Decimal('500.00'), Decimal('290.00'), 42, 15, hoy + timedelta(days=60), 'ALFA-GUAY-01'),
            ('7790580123458', 'Alfajor Havanna 70% Cacao 90g', 'Golosinas y Chocolates', 'Distribuidora Arcor La Plata', Decimal('2200.00'), Decimal('1450.00'), 14, 5, hoy + timedelta(days=30), 'ALFA-HAV-01'),
            ('7793333444455', 'Turron de Mani Arcor 25g', 'Golosinas y Chocolates', 'Distribuidora Arcor La Plata', Decimal('400.00'), Decimal('220.00'), 0, 15, hoy + timedelta(days=90), 'TURR-ARC-01'), # Sin stock
            ('7790580123460', 'Chicles Beldent Menta 10s', 'Golosinas y Chocolates', 'Mondelez International Distribución', Decimal('600.00'), Decimal('350.00'), 35, 10, hoy + timedelta(days=180), 'CHIC-BELD-01'),
            ('7790580123461', 'Caramelos Sugus Surtidos 50g', 'Golosinas y Chocolates', 'Distribuidora Arcor La Plata', Decimal('750.00'), Decimal('420.00'), 18, 8, hoy + timedelta(days=120), 'CARA-SUG-01'),

            # Bebidas
            ('7791234567890', 'Coca Cola 500ml PET', 'Bebidas y Aguas', 'Coca-Cola FEMSA Argentina', Decimal('1500.00'), Decimal('920.00'), 4, 10, hoy + timedelta(days=120), 'CC500-01'), # Alerta Stock
            ('7791234567891', 'Coca Cola 1.5L PET', 'Bebidas y Aguas', 'Coca-Cola FEMSA Argentina', Decimal('2800.00'), Decimal('1750.00'), 16, 6, hoy + timedelta(days=90), 'CC15-01'),
            ('7791234567892', 'Sprite Lima Limon 500ml', 'Bebidas y Aguas', 'Coca-Cola FEMSA Argentina', Decimal('1400.00'), Decimal('850.00'), 18, 8, hoy + timedelta(days=100), 'SPR500-01'),
            ('7791234567893', 'Agua Villavicencio 500ml', 'Bebidas y Aguas', 'Coca-Cola FEMSA Argentina', Decimal('1000.00'), Decimal('580.00'), 25, 10, hoy + timedelta(days=150), 'AGUA-VIL-01'),
            ('7791234567894', 'Energizante Monster Energy 473ml', 'Bebidas y Aguas', 'Coca-Cola FEMSA Argentina', Decimal('2500.00'), Decimal('1600.00'), 14, 6, hoy + timedelta(days=200), 'MONST-01'),
            ('7791234567895', 'Cerveza Quilmes Clásica 473ml Lata', 'Bebidas y Aguas', 'Cervecería y Maltería Quilmes', Decimal('1800.00'), Decimal('1100.00'), 30, 12, hoy + timedelta(days=180), 'QUILM-473-01'),

            # Snacks
            ('7799876543210', 'Papas Fritas Lays Clásicas 85g', 'Snacks y Salados', 'Pepsico Snacks La Plata', Decimal('2100.00'), Decimal('1280.00'), 7, 5, hoy + timedelta(days=5), 'LAYS-85-01'), # Alerta Vencimiento Urgente
            ('7799876543211', 'Doritos Mega Queso 90g', 'Snacks y Salados', 'Pepsico Snacks La Plata', Decimal('2400.00'), Decimal('1480.00'), 12, 5, hoy + timedelta(days=60), 'DOR-90-01'),
            ('7799876543212', 'Maní Salado Pehuamar 100g', 'Snacks y Salados', 'Pepsico Snacks La Plata', Decimal('1200.00'), Decimal('720.00'), 20, 8, hoy + timedelta(days=45), 'PEHU-MANI-01'),

            # Galletitas
            ('7794567890123', 'Galletitas Oreo 118g', 'Galletitas y Panificados', 'Mondelez International Distribución', Decimal('1400.00'), Decimal('840.00'), 22, 8, hoy + timedelta(days=75), 'OREO-118-01'),
            ('7794567890124', 'Galletitas Chocolinas 170g', 'Galletitas y Panificados', 'Distribuidora Arcor La Plata', Decimal('1300.00'), Decimal('780.00'), 16, 8, hoy + timedelta(days=60), 'CHOC-170-01'),
            ('7794567890125', 'Galletitas Rumba 112g', 'Galletitas y Panificados', 'Mondelez International Distribución', Decimal('1200.00'), Decimal('720.00'), 15, 6, hoy + timedelta(days=80), 'RUMB-112-01'),

            # Cigarrillos / Fósforos
            ('7798901234567', 'Cigarrillos Marlboro Box 20', 'Cigarrillos y Fósforos', 'Massalin Particulares Mayorista', Decimal('3500.00'), Decimal('2950.00'), 25, 10, None, 'MARL-BOX-20'),
            ('7798901234568', 'Encendedor Bic Maxi', 'Cigarrillos y Fósforos', 'Massalin Particulares Mayorista', Decimal('1200.00'), Decimal('680.00'), 15, 5, None, 'BIC-MAXI-01'),
        ]

        prod_objs = {}
        for code, nombre, cat_nom, prov_nom, precio_v, precio_c, stock, stock_min, venc, cod_art in productos_data:
            categoria = cat_map[cat_nom]
            proveedor = prov_map[prov_nom]

            prod, _ = Producto.objects.update_or_create(
                codigo_barra=code,
                defaults={
                    'nombre': nombre,
                    'descripcion': f'{nombre} comercializado en Kiosco La Esquina',
                    'categoria': categoria,
                    'precio_venta': precio_v,
                    'stock_actual': stock,
                    'stock_minimo': stock_min,
                    'fecha_vencimiento': venc,
                    'activo': True,
                }
            )
            prod_objs[code] = (prod, proveedor, precio_c, cod_art)

            # Compras históricas (ProductoProveedor) para cálculo derivado de precio_costo
            ProductoProveedor.objects.update_or_create(
                producto=prod,
                codigo_articulo_proveedor=cod_art,
                defaults={
                    'proveedor': proveedor,
                    'cantidad_compra': 100,
                    'fecha_compra': hoy - timedelta(days=15),
                    'precio_compra': precio_c,
                }
            )

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(prod_objs)} productos cargados con compras y proveedores asociados'))

        # 5. Movimientos de stock iniciales y ajustes
        for code, (prod, proveedor, _, _) in prod_objs.items():
            if not MovimientoStock.objects.filter(producto=prod, tipo='INGRESO', motivo__contains='Recepción inicial').exists():
                MovimientoStock.objects.create(
                    producto=prod,
                    tipo='INGRESO',
                    cantidad=50,
                    motivo=f'Recepción inicial de mercadería - Proveedor {proveedor.nombre}',
                    fecha_vencimiento_asociada=prod.fecha_vencimiento,
                    usuario=admin,
                )

        # 2 ajustes de inventario realistas
        papas = prod_objs['7799876543210'][0]
        if not MovimientoStock.objects.filter(producto=papas, tipo='AJUSTE', motivo__contains='Rotura de paquete').exists():
            MovimientoStock.objects.create(
                producto=papas,
                tipo='AJUSTE',
                cantidad=-1,
                motivo='Rotura de paquete accidental en reposición de góndola',
                fecha_vencimiento_asociada=papas.fecha_vencimiento,
                usuario=admin,
            )

        jorgito = prod_objs['7790580123456'][0]
        if not MovimientoStock.objects.filter(producto=jorgito, tipo='AJUSTE', motivo__contains='Conteo físico').exists():
            MovimientoStock.objects.create(
                producto=jorgito,
                tipo='AJUSTE',
                cantidad=2,
                motivo='Ajuste por sobrante en recuento físico mensual de caja',
                fecha_vencimiento_asociada=jorgito.fecha_vencimiento,
                usuario=admin,
            )

        self.stdout.write(self.style.SUCCESS('  ✓ Movimientos de ingreso y ajustes de stock registrados'))

        # 6. Ventas de un día normal (HOY) en un kiosco argentino
        # Definimos tickets con combinaciones típicas de compra de mostrador
        ventas_hoy_specs = [
            (('7790580123456', 1), ('7791234567893', 1), 'EFECTIVO', '08:35', 'Desayuno al paso'),
            (('7790580123460', 1), ('7791234567890', 1), 'TRANSFERENCIA', '09:15', 'Cobro con QR Mercado Pago'),
            (('7790580123457', 2), 'EFECTIVO', '09:50', '2 Guaymallén blanco'),
            (('7798901234567', 1), ('7798901234568', 1), 'DEBITO', '10:30', 'Cigarrillos + Encendedor'),
            (('7791234567890', 1), ('7799876543210', 1), 'TRANSFERENCIA', '11:15', 'Coca 500 + Lays'),
            (('7791234567894', 1), ('7799876543211', 1), 'TRANSFERENCIA', '12:05', 'Monster + Doritos'),
            (('7794567890123', 1), ('7791234567892', 1), 'EFECTIVO', '12:45', 'Oreo + Sprite 500'),
            (('7790580123458', 1), ('7791234567893', 1), 'DEBITO', '13:20', 'Havanna 70% + Villavicencio'),
            (('7790580123456', 2), 'EFECTIVO', '14:10', '2 Jorgito chocolate'),
            (('7794567890124', 1), ('7791234567891', 1), 'TRANSFERENCIA', '15:30', 'Chocolinas + Coca 1.5L merienda'),
            (('7799876543212', 1), ('7791234567895', 1), 'EFECTIVO', '16:15', 'Pehuamar maní + Quilmes lata'),
            (('7790580123460', 1), ('7790580123461', 1), 'EFECTIVO', '17:00', 'Beldent + Sugus surtidos'),
            (('7798901234567', 1), 'TRANSFERENCIA', '17:45', 'Marlboro Box 20'),
            (('7791234567895', 2), ('7799876543210', 1), 'TRANSFERENCIA', '18:30', 'Previa 2 Quilmes + Papas Lays'),
            (('7791234567891', 1), ('7794567890125', 1), 'DEBITO', '19:15', 'Coca 1.5L + Rumba para cena'),
            (('7791234567894', 1), 'TRANSFERENCIA', '20:00', 'Monster energy noche'),
            (('7790580123457', 2), ('7791234567893', 1), 'EFECTIVO', '20:45', '2 Guaymallén + Agua mineral'),
            (('7790580123458', 1), ('7791234567890', 1), 'TRANSFERENCIA', '21:30', 'Havanna + Coca 500'),
        ]

        # Borramos ventas previas de prueba generadas por este seeder para evitar duplicación
        # pero preservando las del E2E si tienen otra descripción
        Venta.objects.filter(observaciones__startswith='[DEMO-DIA-NORMAL]').delete()

        ventas_creadas = 0
        total_facturado_hoy = Decimal('0.00')

        # Usamos la fecha y hora de HOY
        ahora = timezone.now()
        fecha_hoy = ahora.date()

        for spec in ventas_hoy_specs:
            items = []
            metodo = 'EFECTIVO'
            hora_str = '12:00'
            obs = 'Venta de mostrador'

            for elem in spec:
                if isinstance(elem, tuple) and len(elem) == 2 and isinstance(elem[0], str) and isinstance(elem[1], int):
                    items.append(elem)
                elif isinstance(elem, str):
                    if elem in ['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO']:
                        metodo = elem
                    elif ':' in elem:
                        hora_str = elem
                    else:
                        obs = elem

            # Parse horario del día
            h, m = [int(p) for p in hora_str.split(':')]
            fecha_venta = ahora.replace(hour=h, minute=m, second=random.randint(0, 59))

            # Crear Venta
            venta = Venta.objects.create(
                vendedor=vendedor,
                metodo_pago=metodo,
                observaciones=f'[DEMO-DIA-NORMAL] {obs}',
                total=Decimal('0.00'),
            )
            # Forzamos la fecha para que refleje el horario del día
            Venta.objects.filter(pk=venta.pk).update(fecha_venta=fecha_venta)

            venta_total = Decimal('0.00')
            for code, cant in items:
                prod = prod_objs[code][0]
                unit_price = prod.precio_venta
                subtotal = unit_price * cant
                venta_total += subtotal

                DetalleVenta.objects.create(
                    venta=venta,
                    producto=prod,
                    cantidad=cant,
                    precio_unitario=unit_price,
                    subtotal=subtotal,
                )

                # Generamos el Movimiento de stock de tipo VENTA asociado
                mov = MovimientoStock.objects.create(
                    producto=prod,
                    tipo='VENTA',
                    cantidad=cant,
                    motivo=f'Venta mostrador #{venta.id}',
                    usuario=vendedor,
                    venta=venta,
                )
                MovimientoStock.objects.filter(pk=mov.pk).update(fecha_movimiento=fecha_venta)

            Venta.objects.filter(pk=venta.pk).update(total=venta_total)
            total_facturado_hoy += venta_total
            ventas_creadas += 1

        # 7. Agregar algunas ventas en días anteriores del mes para rotación e histórico
        dias_anteriores = [1, 2, 3, 5, 8, 12]
        ventas_anteriores = 0
        for dia_delta in dias_anteriores:
            fecha_pasada = ahora - timedelta(days=dia_delta)
            for j in range(random.randint(3, 5)):
                code1, code2 = random.sample(list(prod_objs.keys()), 2)
                p1 = prod_objs[code1][0]
                p2 = prod_objs[code2][0]

                metodo = random.choice(['EFECTIVO', 'TRANSFERENCIA', 'DEBITO'])
                v_ant = Venta.objects.create(
                    vendedor=vendedor,
                    metodo_pago=metodo,
                    observaciones=f'[DEMO-HISTORICO] Venta hace {dia_delta} días',
                    total=Decimal('0.00'),
                )
                Venta.objects.filter(pk=v_ant.pk).update(fecha_venta=fecha_pasada)

                tot = Decimal('0.00')
                for prod, cant in [(p1, random.randint(1, 2)), (p2, 1)]:
                    sub = prod.precio_venta * cant
                    tot += sub
                    DetalleVenta.objects.create(
                        venta=v_ant,
                        producto=prod,
                        cantidad=cant,
                        precio_unitario=prod.precio_venta,
                        subtotal=sub,
                    )
                    mov = MovimientoStock.objects.create(
                        producto=prod,
                        tipo='VENTA',
                        cantidad=cant,
                        motivo=f'Venta mostrador #{v_ant.id}',
                        usuario=vendedor,
                        venta=v_ant,
                    )
                    MovimientoStock.objects.filter(pk=mov.pk).update(fecha_movimiento=fecha_pasada)

                Venta.objects.filter(pk=v_ant.pk).update(total=tot)
                ventas_anteriores += 1

        self.stdout.write(self.style.SUCCESS(
            f'  ✓ {ventas_creadas} ventas del DÍA DE HOY registradas (Total recaudado: ${total_facturado_hoy:,.2f})'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'  ✓ {ventas_anteriores} ventas históricas de días anteriores agregadas para análisis de rotación'
        ))

        self.stdout.write(self.style.SUCCESS('\n============================================================='))
        self.stdout.write(self.style.SUCCESS(' ¡Carga completa exitosa de datos para Kiosco La Esquina!'))
        self.stdout.write(self.style.SUCCESS(f' Fecha actual simulada: {hoy.strftime("%d/%m/%Y")}'))
        self.stdout.write(self.style.SUCCESS(f' Total productos activos: {Producto.objects.filter(activo=True).count()}'))
        self.stdout.write(self.style.SUCCESS(f' Total ventas hoy: {ventas_creadas}'))
        self.stdout.write(self.style.SUCCESS(f' Total recaudado hoy: ${total_facturado_hoy:,.2f}'))
        self.stdout.write(self.style.SUCCESS('============================================================='))
