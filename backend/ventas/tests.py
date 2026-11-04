from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import Usuario
from inventario.models import Categoria, Producto
from ventas.models import Venta, DetalleVenta, MovimientoStock


class VentasYMovimientosTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin_test',
            password='password123',
            rol='ADMIN',
        )
        self.vendedor = Usuario.objects.create_user(
            username='vendedor_test',
            password='password123',
            rol='VENDEDOR',
        )

        self.categoria = Categoria.objects.create(nombre='Golosinas')
        self.producto_a = Producto.objects.create(
            nombre='Alfajor Chocolate',
            categoria=self.categoria,
            precio_venta=Decimal('100.00'),
            stock_actual=20,
            stock_minimo=5,
            activo=True,
        )
        self.producto_b = Producto.objects.create(
            nombre='Caramelos Menta',
            categoria=self.categoria,
            precio_venta=Decimal('25.50'),
            stock_actual=10,
            stock_minimo=2,
            activo=True,
        )

    def test_unauthenticated_cannot_access_ventas_or_movimientos(self):
        url_ventas = reverse('venta-list')
        url_movimientos = reverse('movimientostock-list')

        self.assertEqual(self.client.get(url_ventas).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(url_movimientos).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ingreso_de_stock(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('movimientostock-list')
        payload = {
            'producto_id': self.producto_a.id,
            'tipo': 'INGRESO',
            'cantidad': 15,
            'motivo': 'Compra a proveedor',
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 35)

        mov = MovimientoStock.objects.get(id=res.data['id'])
        self.assertEqual(mov.tipo, 'INGRESO')
        self.assertEqual(mov.cantidad, 15)
        self.assertEqual(mov.usuario, self.admin)

    def test_egreso_de_stock(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('movimientostock-list')
        payload = {
            'producto_id': self.producto_a.id,
            'tipo': 'EGRESO',
            'cantidad': 5,
            'motivo': 'Mercadería dañada',
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 15)

        mov = MovimientoStock.objects.get(id=res.data['id'])
        self.assertEqual(mov.tipo, 'EGRESO')
        self.assertEqual(mov.cantidad, -5)

    def test_ajuste_de_stock_positivo_y_negativo(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('movimientostock-list')

        # Ajuste positivo
        res_pos = self.client.post(url, {
            'producto_id': self.producto_a.id,
            'tipo': 'AJUSTE',
            'cantidad': 5,
            'motivo': 'Sobrante de inventario',
        }, format='json')
        self.assertEqual(res_pos.status_code, status.HTTP_201_CREATED)
        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 25)

        # Ajuste negativo
        res_neg = self.client.post(url, {
            'producto_id': self.producto_a.id,
            'tipo': 'AJUSTE',
            'cantidad': -8,
            'motivo': 'Diferencia de recuento',
        }, format='json')
        self.assertEqual(res_neg.status_code, status.HTTP_201_CREATED)
        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 17)

    def test_rechazo_operaciones_que_produzcan_stock_negativo(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('movimientostock-list')

        # Egreso mayor al stock disponible
        res_egreso = self.client.post(url, {
            'producto_id': self.producto_a.id,
            'tipo': 'EGRESO',
            'cantidad': 25,  # actual es 20
        }, format='json')
        self.assertEqual(res_egreso.status_code, status.HTTP_400_BAD_REQUEST)

        # Ajuste negativo mayor al stock disponible
        res_ajuste = self.client.post(url, {
            'producto_id': self.producto_a.id,
            'tipo': 'AJUSTE',
            'cantidad': -25,
        }, format='json')
        self.assertEqual(res_ajuste.status_code, status.HTTP_400_BAD_REQUEST)

        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 20)

    def test_vendedor_no_puede_crear_movimientos_manuales(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('movimientostock-list')
        res = self.client.post(url, {
            'producto_id': self.producto_a.id,
            'tipo': 'INGRESO',
            'cantidad': 10,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendedor_puede_consultar_movimientos(self):
        MovimientoStock.objects.create(
            producto=self.producto_a,
            tipo='INGRESO',
            cantidad=10,
            usuario=self.admin,
        )
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('movimientostock-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_venta_de_un_producto_por_vendedor(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('venta-list')
        payload = {
            'metodo_pago': 'EFECTIVO',
            'observaciones': 'Venta rápida',
            'detalles': [
                {'producto_id': self.producto_a.id, 'cantidad': 3},
            ],
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        venta_id = res.data['id']
        venta = Venta.objects.get(id=venta_id)
        self.assertEqual(venta.vendedor, self.vendedor)
        self.assertEqual(venta.total, Decimal('300.00'))  # 3 x 100.00
        self.assertEqual(venta.metodo_pago, 'EFECTIVO')

        # Detalle de venta
        self.assertEqual(venta.detalles.count(), 1)
        det = venta.detalles.first()
        self.assertEqual(det.producto, self.producto_a)
        self.assertEqual(det.cantidad, 3)
        self.assertEqual(det.precio_unitario, Decimal('100.00'))
        self.assertEqual(det.subtotal, Decimal('300.00'))

        # Descuento de stock
        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 17)

        # Movimiento de stock asociado
        movimientos = MovimientoStock.objects.filter(venta=venta)
        self.assertEqual(movimientos.count(), 1)
        mov = movimientos.first()
        self.assertEqual(mov.tipo, 'VENTA')
        self.assertEqual(mov.cantidad, -3)
        self.assertEqual(mov.usuario, self.vendedor)

    def test_venta_de_varios_productos_totales_y_subtotales(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('venta-list')
        payload = {
            'metodo_pago': 'DEBITO',
            'detalles': [
                {'producto_id': self.producto_a.id, 'cantidad': 2},  # 2 x 100 = 200.00
                {'producto_id': self.producto_b.id, 'cantidad': 4},  # 4 x 25.50 = 102.00
            ],
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        venta = Venta.objects.get(id=res.data['id'])
        self.assertEqual(venta.total, Decimal('302.00'))
        self.assertEqual(venta.detalles.count(), 2)

        self.producto_a.refresh_from_db()
        self.producto_b.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 18)
        self.assertEqual(self.producto_b.stock_actual, 6)

        # Verificar 2 movimientos generados
        movs = MovimientoStock.objects.filter(venta=venta).order_by('producto_id')
        self.assertEqual(movs.count(), 2)
        self.assertEqual(movs[0].producto, self.producto_a)
        self.assertEqual(movs[0].cantidad, -2)
        self.assertEqual(movs[1].producto, self.producto_b)
        self.assertEqual(movs[1].cantidad, -4)

    def test_rechazo_venta_sin_stock_suficiente(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('venta-list')
        payload = {
            'metodo_pago': 'EFECTIVO',
            'detalles': [
                {'producto_id': self.producto_a.id, 'cantidad': 25},  # tiene 20
            ],
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Stock insuficiente', str(res.data))

        # Confirmar que no hubo cambios en stock ni registros de venta
        self.producto_a.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 20)
        self.assertEqual(Venta.objects.count(), 0)

    def test_reversion_transaccional_completa_ante_error_parcial(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('venta-list')
        # Primer producto tiene stock suficiente, el segundo no
        payload = {
            'metodo_pago': 'EFECTIVO',
            'detalles': [
                {'producto_id': self.producto_a.id, 'cantidad': 2},
                {'producto_id': self.producto_b.id, 'cantidad': 50},  # tiene solo 10
            ],
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Verificar que el producto A no sufrió descuento parcial
        self.producto_a.refresh_from_db()
        self.producto_b.refresh_from_db()
        self.assertEqual(self.producto_a.stock_actual, 20)
        self.assertEqual(self.producto_b.stock_actual, 10)
        self.assertEqual(Venta.objects.count(), 0)
        self.assertEqual(DetalleVenta.objects.count(), 0)
        self.assertEqual(MovimientoStock.objects.count(), 0)

    def test_validaciones_de_cantidades_y_metodos_de_pago(self):
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('venta-list')

        # Cantidad menor o igual a cero
        res_cero = self.client.post(url, {
            'metodo_pago': 'EFECTIVO',
            'detalles': [{'producto_id': self.producto_a.id, 'cantidad': 0}],
        }, format='json')
        self.assertEqual(res_cero.status_code, status.HTTP_400_BAD_REQUEST)

        # Método de pago inválido
        res_metodo = self.client.post(url, {
            'metodo_pago': 'CRIPTOMONEDA',
            'detalles': [{'producto_id': self.producto_a.id, 'cantidad': 1}],
        }, format='json')
        self.assertEqual(res_metodo.status_code, status.HTTP_400_BAD_REQUEST)

        # No permitir productos repetidos en el mismo payload
        res_duplicado = self.client.post(url, {
            'metodo_pago': 'EFECTIVO',
            'detalles': [
                {'producto_id': self.producto_a.id, 'cantidad': 1},
                {'producto_id': self.producto_a.id, 'cantidad': 2},
            ],
        }, format='json')
        self.assertEqual(res_duplicado.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consultar_detalle_de_venta(self):
        self.client.force_authenticate(user=self.vendedor)
        url_create = reverse('venta-list')
        payload = {
            'metodo_pago': 'EFECTIVO',
            'detalles': [{'producto_id': self.producto_a.id, 'cantidad': 1}],
        }
        res_create = self.client.post(url_create, payload, format='json')
        venta_id = res_create.data['id']

        url_detail = reverse('venta-detail', kwargs={'pk': venta_id})
        res_detail = self.client.get(url_detail)
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data['id'], venta_id)
        self.assertEqual(len(res_detail.data['detalles']), 1)
        self.assertEqual(res_detail.data['detalles'][0]['producto_nombre'], 'Alfajor Chocolate')
