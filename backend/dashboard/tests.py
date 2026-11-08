from datetime import timedelta
from decimal import Decimal
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import Usuario
from inventario.models import Categoria, Producto
from ventas.models import Venta, DetalleVenta, MovimientoStock


class DashboardTests(APITestCase):
    def setUp(self):
        # 1. Usuarios con distintos roles
        self.admin = Usuario.objects.create_user(
            username='admin_dashboard',
            password='password123',
            rol='ADMIN',
        )
        self.vendedor = Usuario.objects.create_user(
            username='vendedor_dashboard',
            password='password123',
            rol='VENDEDOR',
        )

        # 2. Categorías
        self.categoria_golosinas = Categoria.objects.create(nombre='Golosinas')
        self.categoria_bebidas = Categoria.objects.create(nombre='Bebidas')

        # 3. Productos para pruebas
        hoy = timezone.now().date()

        # Producto 1: Muy vendido, stock normal
        self.prod_top = Producto.objects.create(
            codigo_barra='7791234567890',
            nombre='Alfajor Triple Chocolate',
            categoria=self.categoria_golosinas,
            precio_venta=Decimal('150.00'),
            stock_actual=40,
            stock_minimo=10,
            fecha_vencimiento=hoy + timedelta(days=60),
            activo=True,
        )

        # Producto 2: Sin stock (alerta stock crítico)
        self.prod_sin_stock = Producto.objects.create(
            codigo_barra='7791234567891',
            nombre='Gaseosa Cola 500ml',
            categoria=self.categoria_bebidas,
            precio_venta=Decimal('300.00'),
            stock_actual=0,
            stock_minimo=10,
            fecha_vencimiento=hoy + timedelta(days=45),
            activo=True,
        )

        # Producto 3: Próximo a vencer (en 5 días -> URGENTE) y stock bajo
        self.prod_urgente_venc = Producto.objects.create(
            codigo_barra='7791234567892',
            nombre='Yogur Natural',
            categoria=self.categoria_bebidas,
            precio_venta=Decimal('200.00'),
            stock_actual=4,
            stock_minimo=8,
            fecha_vencimiento=hoy + timedelta(days=5),
            activo=True,
        )

        # Producto 4: Ya vencido (hace 2 días)
        self.prod_vencido = Producto.objects.create(
            codigo_barra='7791234567893',
            nombre='Galletitas Vainilla',
            categoria=self.categoria_golosinas,
            precio_venta=Decimal('120.00'),
            stock_actual=5,
            stock_minimo=2,
            fecha_vencimiento=hoy - timedelta(days=2),
            activo=True,
        )

        # 4. Movimientos de stock (Ingresos y reposición)
        MovimientoStock.objects.create(
            producto=self.prod_top,
            tipo='INGRESO',
            cantidad=50,
            motivo='Compra mensual',
            usuario=self.admin,
        )

        # 5. Ventas registradas
        self.venta1 = Venta.objects.create(
            vendedor=self.vendedor,
            total=Decimal('3000.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=self.venta1,
            producto=self.prod_top,
            cantidad=20,
            precio_unitario=Decimal('150.00'),
            subtotal=Decimal('3000.00'),
        )

        self.venta2 = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('750.00'),
            metodo_pago='TRANSFERENCIA',
        )
        DetalleVenta.objects.create(
            venta=self.venta2,
            producto=self.prod_top,
            cantidad=5,
            precio_unitario=Decimal('150.00'),
            subtotal=Decimal('750.00'),
        )

        self.url_dashboard = reverse('dashboard:metricas')
        self.url_mas_vendidos = reverse('dashboard:mas-vendidos')
        self.url_rotacion = reverse('dashboard:rotacion')
        self.url_alertas = reverse('dashboard:alertas')

    def test_unauthenticated_cannot_access_dashboard(self):
        response = self.client.get(self.url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vendedor_cannot_access_dashboard_forbidden_403(self):
        self.client.force_authenticate(user=self.vendedor)
        response = self.client.get(self.url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)

        # Sub-endpoints también restringidos para VENDEDOR
        res_top = self.client.get(self.url_mas_vendidos)
        self.assertEqual(res_top.status_code, status.HTTP_403_FORBIDDEN)

        res_rot = self.client.get(self.url_rotacion)
        self.assertEqual(res_rot.status_code, status.HTTP_403_FORBIDDEN)

        res_ale = self.client.get(self.url_alertas)
        self.assertEqual(res_ale.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_access_dashboard_returns_200_and_complete_structure(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('resumen_general', data)
        self.assertIn('productos_mas_vendidos', data)
        self.assertIn('rotacion_productos', data)
        self.assertIn('alertas', data)

        # Verificar resumen general
        resumen = data['resumen_general']
        self.assertEqual(float(resumen['total_ventas_recaudado']), 3750.00)
        self.assertEqual(resumen['cantidad_ventas'], 2)
        self.assertEqual(resumen['total_productos_activos'], 4)

    def test_productos_mas_vendidos_metrics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url_mas_vendidos)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items = response.data
        self.assertTrue(len(items) > 0)
        # El primero debe ser Alfajor Triple Chocolate con 25 vendidas
        top_item = items[0]
        self.assertEqual(top_item['producto_nombre'], 'Alfajor Triple Chocolate')
        self.assertEqual(top_item['total_unidades_vendidas'], 25)
        self.assertEqual(float(top_item['total_recaudado']), 3750.00)
        self.assertEqual(top_item['cantidad_ventas_asociadas'], 2)

    def test_rotacion_productos_metrics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url_rotacion)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items = response.data
        prod_top_metric = next((i for i in items if i['producto_id'] == self.prod_top.id), None)
        self.assertIsNotNone(prod_top_metric)
        self.assertEqual(prod_top_metric['total_salidas'], 25)
        self.assertEqual(prod_top_metric['total_ingresos'], 50)
        self.assertEqual(prod_top_metric['stock_actual'], 40)
        self.assertEqual(prod_top_metric['nivel_rotacion'], 'ALTA')

    def test_alertas_activas_metrics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url_alertas)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        alertas = response.data
        self.assertGreaterEqual(alertas['conteo_stock_minimo'], 2)
        self.assertGreaterEqual(alertas['conteo_vencimiento'], 2)
        self.assertGreaterEqual(alertas['conteo_sin_stock'], 1)
        self.assertGreaterEqual(alertas['conteo_vencidos'], 1)

        # Chequear que prod_sin_stock está marcado como 'SIN STOCK'
        stock_item = next(
            (i for i in alertas['items_stock_minimo'] if i['producto_id'] == self.prod_sin_stock.id),
            None,
        )
        self.assertIsNotNone(stock_item)
        self.assertEqual(stock_item['nivel_alerta'], 'SIN STOCK')
        self.assertEqual(stock_item['unidades_faltantes'], 10)

        # Chequear prod_vencido
        venc_item = next(
            (i for i in alertas['items_vencimiento'] if i['producto_id'] == self.prod_vencido.id),
            None,
        )
        self.assertIsNotNone(venc_item)
        self.assertEqual(venc_item['estado_vencimiento'], 'VENCIDO')

        # Chequear prod_urgente_venc
        urgente_item = next(
            (i for i in alertas['items_vencimiento'] if i['producto_id'] == self.prod_urgente_venc.id),
            None,
        )
        self.assertIsNotNone(urgente_item)
        self.assertEqual(urgente_item['estado_vencimiento'], 'URGENTE')

