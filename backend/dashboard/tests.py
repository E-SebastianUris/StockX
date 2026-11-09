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


class DashboardCasosAdicionalesTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin_casos',
            password='password123',
            rol='ADMIN',
        )
        self.categoria = Categoria.objects.create(nombre='General')
        self.client.force_authenticate(user=self.admin)

    def test_e1_dashboard_sin_ventas_ni_movimientos(self):
        """E1: Métricas cuando no existen ventas ni movimientos de stock."""
        Producto.objects.create(
            nombre='Producto Sin Operaciones',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=10,
            stock_minimo=2,
            activo=True,
        )

        response = self.client.get(reverse('dashboard:metricas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        resumen = response.data['resumen_general']
        self.assertEqual(Decimal(str(resumen['total_ventas_recaudado'])), Decimal('0.00'))
        self.assertEqual(resumen['cantidad_ventas'], 0)
        self.assertEqual(resumen['total_productos_activos'], 1)

        mas_vendidos = response.data['productos_mas_vendidos']
        self.assertEqual(len(mas_vendidos), 1)
        self.assertEqual(mas_vendidos[0]['total_unidades_vendidas'], 0)
        self.assertEqual(Decimal(str(mas_vendidos[0]['total_recaudado'])), Decimal('0.00'))

        rotacion = response.data['rotacion_productos']
        self.assertEqual(len(rotacion), 1)
        self.assertEqual(rotacion[0]['nivel_rotacion'], 'SIN_MOVIMIENTO')
        self.assertEqual(rotacion[0]['ratio_rotacion'], 0.0)

    def test_e2_y_e3_rotacion_media_baja_y_sin_movimiento(self):
        """E2 y E3: Clasificación de rotación MEDIA, BAJA y SIN_MOVIMIENTO."""
        prod_media = Producto.objects.create(
            nombre='Prod Media Rotacion',
            categoria=self.categoria,
            precio_venta=Decimal('50.00'),
            stock_actual=20,
            stock_minimo=5,
            activo=True,
        )
        prod_baja = Producto.objects.create(
            nombre='Prod Baja Rotacion',
            categoria=self.categoria,
            precio_venta=Decimal('50.00'),
            stock_actual=50,
            stock_minimo=5,
            activo=True,
        )
        prod_sin_mov = Producto.objects.create(
            nombre='Prod Sin Mov',
            categoria=self.categoria,
            precio_venta=Decimal('50.00'),
            stock_actual=15,
            stock_minimo=5,
            activo=True,
        )

        venta = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('600.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_media,
            cantidad=10,
            precio_unitario=Decimal('50.00'),
            subtotal=Decimal('500.00'),
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_baja,
            cantidad=2,
            precio_unitario=Decimal('50.00'),
            subtotal=Decimal('100.00'),
        )

        response = self.client.get(reverse('dashboard:rotacion'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items_by_id = {item['producto_id']: item for item in response.data}

        self.assertEqual(items_by_id[prod_media.id]['nivel_rotacion'], 'MEDIA')
        self.assertEqual(items_by_id[prod_baja.id]['nivel_rotacion'], 'BAJA')
        self.assertEqual(items_by_id[prod_sin_mov.id]['nivel_rotacion'], 'SIN_MOVIMIENTO')
        self.assertEqual(items_by_id[prod_sin_mov.id]['ratio_rotacion'], 0.0)

    def test_e4_alerta_stock_critico(self):
        """E4: Detección y clasificación de alerta de stock en nivel CRITICO."""
        prod_critico = Producto.objects.create(
            nombre='Prod Stock Critico',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=3,
            stock_minimo=10,
            activo=True,
        )

        response = self.client.get(reverse('dashboard:alertas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items_stock = response.data['items_stock_minimo']
        item = next((i for i in items_stock if i['producto_id'] == prod_critico.id), None)
        self.assertIsNotNone(item)
        self.assertEqual(item['nivel_alerta'], 'CRITICO')
        self.assertEqual(item['unidades_faltantes'], 7)

    def test_e5_alerta_vencimiento_proximo(self):
        """E5: Detección de alerta de vencimiento en estado PROXIMO (entre 8 y 15 días)."""
        hoy = timezone.now().date()
        prod_proximo = Producto.objects.create(
            nombre='Prod Vence Proximo',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=10,
            stock_minimo=2,
            fecha_vencimiento=hoy + timedelta(days=12),
            activo=True,
        )

        response = self.client.get(reverse('dashboard:alertas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items_venc = response.data['items_vencimiento']
        item = next((i for i in items_venc if i['producto_id'] == prod_proximo.id), None)
        self.assertIsNotNone(item)
        self.assertEqual(item['estado_vencimiento'], 'PROXIMO')
        self.assertEqual(item['dias_para_vencer'], 12)

    def test_e6_y_e7_query_param_limit_valido_e_invalido(self):
        """E6 y E7: Comportamiento del query parameter limit con valor numérico y fallback ante valor inválido."""
        for i in range(5):
            Producto.objects.create(
                nombre=f'Prod Top {i}',
                categoria=self.categoria,
                precio_venta=Decimal('10.00'),
                stock_actual=50,
                stock_minimo=5,
                activo=True,
            )

        # E6: limit=2 debe devolver exactamente 2 elementos
        res_limit_2 = self.client.get(reverse('dashboard:mas-vendidos'), {'limit': 2})
        self.assertEqual(res_limit_2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_limit_2.data), 2)

        # E7: limit=abc debe aplicar fallback por defecto a 10 (retorna los 5 existentes)
        res_limit_invalido = self.client.get(reverse('dashboard:mas-vendidos'), {'limit': 'abc'})
        self.assertEqual(res_limit_invalido.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_limit_invalido.data), 5)

        # También verificar limit=2 en la vista consolidada de métricas
        res_metricas_limit = self.client.get(reverse('dashboard:metricas'), {'limit': 2})
        self.assertEqual(res_metricas_limit.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_metricas_limit.data['productos_mas_vendidos']), 2)

    def test_e8_exclusion_productos_inactivos(self):
        """E8: Los productos inactivos (activo=False) deben quedar excluidos de rankings, rotación y alertas."""
        hoy = timezone.now().date()
        prod_inactivo = Producto.objects.create(
            nombre='Prod Inactivo',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=0,
            stock_minimo=10,
            fecha_vencimiento=hoy - timedelta(days=5),
            activo=False,
        )

        venta = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('500.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_inactivo,
            cantidad=5,
            precio_unitario=Decimal('100.00'),
            subtotal=Decimal('500.00'),
        )

        response = self.client.get(reverse('dashboard:metricas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        mas_vendidos_ids = [p['producto_id'] for p in response.data['productos_mas_vendidos']]
        self.assertNotIn(prod_inactivo.id, mas_vendidos_ids)

        rotacion_ids = [p['producto_id'] for p in response.data['rotacion_productos']]
        self.assertNotIn(prod_inactivo.id, rotacion_ids)

        alertas_stock_ids = [p['producto_id'] for p in response.data['alertas']['items_stock_minimo']]
        alertas_venc_ids = [p['producto_id'] for p in response.data['alertas']['items_vencimiento']]
        self.assertNotIn(prod_inactivo.id, alertas_stock_ids)
        self.assertNotIn(prod_inactivo.id, alertas_venc_ids)

        self.assertEqual(response.data['resumen_general']['total_productos_activos'], 0)

    def test_e9_y_e10_total_alertas_con_producto_en_doble_alerta(self):
        """E9 y E10: Verificación de total_alertas_activas en el resumen y desduplicación cuando un producto está en alerta de stock y de vencimiento."""
        hoy = timezone.now().date()
        # Producto en alerta doble: stock <= stock_minimo Y fecha_vencimiento <= hoy + 15
        prod_doble = Producto.objects.create(
            nombre='Prod Doble Alerta',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=1,
            stock_minimo=5,
            fecha_vencimiento=hoy + timedelta(days=3),
            activo=True,
        )
        # Producto solo en alerta de stock
        prod_solo_stock = Producto.objects.create(
            nombre='Prod Solo Stock',
            categoria=self.categoria,
            precio_venta=Decimal('50.00'),
            stock_actual=0,
            stock_minimo=5,
            fecha_vencimiento=None,
            activo=True,
        )
        # Producto sin alertas
        Producto.objects.create(
            nombre='Prod Normal',
            categoria=self.categoria,
            precio_venta=Decimal('20.00'),
            stock_actual=100,
            stock_minimo=5,
            fecha_vencimiento=hoy + timedelta(days=90),
            activo=True,
        )

        response = self.client.get(reverse('dashboard:metricas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        alertas = response.data['alertas']
        # 2 productos en alerta de stock (prod_doble y prod_solo_stock)
        self.assertEqual(alertas['conteo_stock_minimo'], 2)
        # 1 producto en alerta de vencimiento (prod_doble)
        self.assertEqual(alertas['conteo_vencimiento'], 1)
        # Total alertas activas debe ser 2 (unión sin duplicar prod_doble)
        self.assertEqual(alertas['total_alertas'], 2)
        # E9: El resumen general debe coincidir exactamente con el total desduplicado
        self.assertEqual(response.data['resumen_general']['total_alertas_activas'], 2)

    def test_e11_rotacion_stock_cero_con_ventas(self):
        """E11: Cálculo de rotación cuando stock_actual es 0 pero hubo ventas (ratio = float(salidas))."""
        prod_agotado_vendido = Producto.objects.create(
            nombre='Prod Agotado Vendido',
            categoria=self.categoria,
            precio_venta=Decimal('80.00'),
            stock_actual=0,
            stock_minimo=5,
            activo=True,
        )
        venta = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('240.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_agotado_vendido,
            cantidad=3,
            precio_unitario=Decimal('80.00'),
            subtotal=Decimal('240.00'),
        )

        response = self.client.get(reverse('dashboard:rotacion'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        item = next((i for i in response.data if i['producto_id'] == prod_agotado_vendido.id), None)
        self.assertIsNotNone(item)
        self.assertEqual(item['stock_actual'], 0)
        self.assertEqual(item['total_salidas'], 3)
        self.assertEqual(item['ratio_rotacion'], 3.0)
        # ratio 3.0 >= 2.0 -> clasifica ALTA
        self.assertEqual(item['nivel_rotacion'], 'ALTA')

    def test_e12_alertas_producto_sin_fecha_vencimiento(self):
        """E12: Un producto con fecha_vencimiento=None no debe figurar en items_vencimiento ni generar errores."""
        prod_sin_venc = Producto.objects.create(
            nombre='Prod Sin Fecha Vencimiento',
            categoria=self.categoria,
            precio_venta=Decimal('15.00'),
            stock_actual=50,
            stock_minimo=5,
            fecha_vencimiento=None,
            activo=True,
        )

        response = self.client.get(reverse('dashboard:alertas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items_venc_ids = [i['producto_id'] for i in response.data['items_vencimiento']]
        self.assertNotIn(prod_sin_venc.id, items_venc_ids)

    def test_e13_mas_vendidos_desempate_por_monto_recaudado(self):
        """E13: Desempate en ranking de más vendidos ante igual cantidad de unidades (ordena por total_recaudado descendente)."""
        prod_barato = Producto.objects.create(
            nombre='Alfajor Simple',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=50,
            stock_minimo=5,
            activo=True,
        )
        prod_caro = Producto.objects.create(
            nombre='Alfajor Premium',
            categoria=self.categoria,
            precio_venta=Decimal('250.00'),
            stock_actual=50,
            stock_minimo=5,
            activo=True,
        )

        # Misma cantidad vendida (4 unidades cada uno), distinto monto
        venta = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('1400.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_barato,
            cantidad=4,
            precio_unitario=Decimal('100.00'),
            subtotal=Decimal('400.00'),
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_caro,
            cantidad=4,
            precio_unitario=Decimal('250.00'),
            subtotal=Decimal('1000.00'),
        )

        response = self.client.get(reverse('dashboard:mas-vendidos'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Encontrar las posiciones relativas
        items = response.data
        pos_caro = next(idx for idx, i in enumerate(items) if i['producto_id'] == prod_caro.id)
        pos_barato = next(idx for idx, i in enumerate(items) if i['producto_id'] == prod_barato.id)

        # Con igual cantidad vendida (4 u.), el de mayor recaudación ($1000 vs $400) debe estar antes
        self.assertLess(pos_caro, pos_barato)

    def test_e15_rotacion_endpoint_parametro_limit(self):
        """E15: Verificación del parámetro limit en el endpoint individual de rotación (/api/dashboard/rotacion/?limit=N)."""
        for i in range(6):
            Producto.objects.create(
                nombre=f'Prod Rotacion {i}',
                categoria=self.categoria,
                precio_venta=Decimal('10.00'),
                stock_actual=10,
                stock_minimo=2,
                activo=True,
            )

        res_sin_limit = self.client.get(reverse('dashboard:rotacion'))
        self.assertEqual(res_sin_limit.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res_sin_limit.data), 6)

        res_con_limit = self.client.get(reverse('dashboard:rotacion'), {'limit': 3})
        self.assertEqual(res_con_limit.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_con_limit.data), 3)

    def test_e17_rotacion_alta_por_umbral_absoluto_de_salidas(self):
        """E17: Clasificación ALTA por umbral absoluto de 20 salidas aun con ratio bajo (salidas >= 20 con stock alto)."""
        prod_alto_volumen = Producto.objects.create(
            nombre='Gaseosa Alto Volumen',
            categoria=self.categoria,
            precio_venta=Decimal('200.00'),
            stock_actual=200,  # ratio = 20 / 200 = 0.10 (no clasificaría ALTA por ratio >= 2.0)
            stock_minimo=10,
            activo=True,
        )
        venta = Venta.objects.create(
            vendedor=self.admin,
            total=Decimal('4000.00'),
            metodo_pago='EFECTIVO',
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=prod_alto_volumen,
            cantidad=20,
            precio_unitario=Decimal('200.00'),
            subtotal=Decimal('4000.00'),
        )

        response = self.client.get(reverse('dashboard:rotacion'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        item = next((i for i in response.data if i['producto_id'] == prod_alto_volumen.id), None)
        self.assertIsNotNone(item)
        self.assertEqual(item['total_salidas'], 20)
        self.assertEqual(item['ratio_rotacion'], 0.1)
        # Regla: ratio >= 2.0 or salidas >= 20 -> debe ser ALTA
        self.assertEqual(item['nivel_rotacion'], 'ALTA')

