from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import Usuario
from .models import Categoria, Producto, ProductoProveedor, Proveedor


class InventarioRolePermissionsTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(username='admin', password='secret', rol='ADMIN')
        self.vendedor = Usuario.objects.create_user(username='vendedor', password='secret', rol='VENDEDOR')
        self.categoria = Categoria.objects.create(nombre='Bebidas')
        self.producto = Producto.objects.create(
            nombre='Agua',
            categoria=self.categoria,
            precio_venta='100.00',
            stock_actual=2,
            stock_minimo=5,
        )
        self.proveedor = Proveedor.objects.create(nombre='Distribuidora')

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def producto_payload(self):
        return {
            'nombre': 'Gaseosa',
            'categoria_id': self.categoria.id,
            'precio_venta': '250.00',
            'stock_actual': 10,
            'stock_minimo': 3,
            'proveedor_id': self.proveedor.id,
        }

    def test_unauthenticated_users_cannot_access_protected_endpoints(self):
        urls = [
            reverse('categoria-list'),
            reverse('proveedor-list'),
            reverse('producto-list'),
            reverse('producto-alertas-stock'),
            reverse('producto-alertas-vencimiento'),
        ]

        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vendedor_can_only_read_products_and_categories(self):
        self.authenticate(self.vendedor)

        allowed_urls = [
            reverse('categoria-list'),
            reverse('categoria-detail', args=[self.categoria.id]),
            reverse('producto-list'),
            reverse('producto-detail', args=[self.producto.id]),
            reverse('producto-alertas-stock'),
            reverse('producto-alertas-vencimiento'),
        ]
        for url in allowed_urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

        denied_requests = [
            ('post', reverse('categoria-list'), {'nombre': 'Lacteos'}),
            ('patch', reverse('categoria-detail', args=[self.categoria.id]), {'nombre': 'Otra'}),
            ('delete', reverse('categoria-detail', args=[self.categoria.id]), None),
            ('post', reverse('producto-list'), self.producto_payload()),
            ('patch', reverse('producto-detail', args=[self.producto.id]), {'nombre': 'Otra agua'}),
            ('delete', reverse('producto-detail', args=[self.producto.id]), None),
            ('get', reverse('proveedor-list'), None),
            ('post', reverse('proveedor-list'), {'nombre': 'Otro proveedor'}),
        ]
        for method, url, payload in denied_requests:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, payload, format='json')
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_manage_products_categories_and_suppliers(self):
        self.authenticate(self.admin)
        resources = [
            ('categoria', {'nombre': 'Lacteos'}),
            ('proveedor', {'nombre': 'Nuevo proveedor'}),
            ('producto', self.producto_payload()),
        ]

        for basename, payload in resources:
            with self.subTest(resource=basename):
                create_response = self.client.post(reverse(f'{basename}-list'), payload, format='json')
                self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
                resource_id = create_response.data['id']
                detail_url = reverse(f'{basename}-detail', args=[resource_id])

                self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_200_OK)
                self.assertEqual(
                    self.client.patch(detail_url, {'nombre': f'{basename} actualizado'}, format='json').status_code,
                    status.HTTP_200_OK,
                )
                self.assertEqual(self.client.delete(detail_url).status_code, status.HTTP_204_NO_CONTENT)

    def test_product_validation_and_category_integrity_errors_are_client_errors(self):
        self.authenticate(self.admin)

        invalid_product = self.producto_payload()
        invalid_product['precio_venta'] = '-1.00'
        response = self.client.post(reverse('producto-list'), invalid_product, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('precio_venta', response.data)

        response = self.client.post(
            reverse('producto-list'),
            {
                **self.producto_payload(),
                'categoria_id': 999999,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('categoria_id', response.data)

        response = self.client.delete(reverse('categoria-detail', args=[self.categoria.id]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Categoria.objects.filter(id=self.categoria.id).exists())

    def test_product_detail_includes_its_supplier_relationship(self):
        ProductoProveedor.objects.create(
            producto=self.producto,
            proveedor=self.proveedor,
            codigo_articulo_proveedor='AGUA-001',
            cantidad_compra=10,
            fecha_compra='2026-10-01',
            precio_compra='50.00',
        )
        self.authenticate(self.admin)

        response = self.client.get(reverse('producto-detail', args=[self.producto.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['producto_proveedores'][0]['proveedor']['id'], self.proveedor.id)

    def test_product_expiry_cannot_be_in_the_past(self):
        self.authenticate(self.admin)
        payload = self.producto_payload()
        payload.update({
            'fecha_vencimiento': '2020-01-01',
            'proveedor_id': self.proveedor.id,
        })

        response = self.client.post(reverse('producto-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_vencimiento', response.data)

    def test_admin_can_create_product_with_supplier_without_fake_purchase(self):
        self.authenticate(self.admin)
        payload = self.producto_payload()
        payload.update({
            'fecha_vencimiento': '2030-12-31',
            'proveedor_id': self.proveedor.id,
        })

        response = self.client.post(reverse('producto-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        producto = Producto.objects.get(id=response.data['id'])
        self.assertFalse(
            ProductoProveedor.objects.filter(
                producto=producto,
                proveedor=self.proveedor,
            ).exists()
        )

    def test_producto_nuevo_requiere_proveedor(self):
        self.authenticate(self.admin)
        payload = self.producto_payload()
        payload.pop('proveedor_id', None)

        response = self.client.post(reverse('producto-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('proveedor_id', response.data)

    def test_crear_producto_sin_compra_no_crea_producto_proveedor(self):
        self.authenticate(self.admin)
        payload = self.producto_payload()
        payload['proveedor_id'] = self.proveedor.id

        response = self.client.post(reverse('producto-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        producto = Producto.objects.get(id=response.data['id'])
        self.assertFalse(
            ProductoProveedor.objects.filter(
                producto=producto,
                proveedor=self.proveedor,
            ).exists()
        )

    def test_crear_producto_con_compra_real_crea_producto_proveedor(self):
        self.authenticate(self.admin)
        payload = self.producto_payload()
        payload.update({
            'proveedor_id': self.proveedor.id,
            'fecha_compra': '2026-10-01',
            'cantidad_compra': 10,
        })

        response = self.client.post(reverse('producto-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        producto = Producto.objects.get(id=response.data['id'])
        asociacion = ProductoProveedor.objects.get(
            producto=producto,
            proveedor=self.proveedor,
        )
        self.assertEqual(asociacion.cantidad_compra, 10)
        self.assertEqual(str(asociacion.fecha_compra), '2026-10-01')

    def test_compra_real_requiere_fecha_y_cantidad(self):
        self.authenticate(self.admin)

        solo_fecha = self.producto_payload()
        solo_fecha.update({
            'proveedor_id': self.proveedor.id,
            'fecha_compra': '2026-10-01',
        })
        res_fecha = self.client.post(reverse('producto-list'), solo_fecha, format='json')
        self.assertEqual(res_fecha.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cantidad_compra', res_fecha.data)

        solo_cantidad = self.producto_payload()
        solo_cantidad.update({
            'proveedor_id': self.proveedor.id,
            'cantidad_compra': 10,
        })
        res_cantidad = self.client.post(reverse('producto-list'), solo_cantidad, format='json')
        self.assertEqual(res_cantidad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_compra', res_cantidad.data)
