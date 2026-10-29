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
            precio_compra='50.00',
        )
        self.authenticate(self.admin)

        response = self.client.get(reverse('producto-detail', args=[self.producto.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['producto_proveedores'][0]['proveedor']['id'], self.proveedor.id)
