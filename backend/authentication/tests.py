from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Usuario


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username='admin_test',
            password='testpassword123',
            email='admin@stockx.local',
            rol='ADMIN',
            telefono='221-555-0000',
        )
        self.token_url = reverse('token_obtain_pair')
        self.token_refresh_url = reverse('token_refresh')
        self.me_url = reverse('usuario_me')

    def test_login_obtains_tokens_and_user_profile(self):
        payload = {
            'username': 'admin_test',
            'password': 'testpassword123',
        }
        response = self.client.post(self.token_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('usuario', response.data)
        self.assertEqual(response.data['usuario']['username'], 'admin_test')
        self.assertEqual(response.data['usuario']['rol'], 'ADMIN')

    def test_login_invalid_credentials_fails(self):
        payload = {
            'username': 'admin_test',
            'password': 'wrongpassword',
        }
        response = self.client.post(self.token_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_authenticated_user_data(self):
        login_response = self.client.post(
            self.token_url,
            {'username': 'admin_test', 'password': 'testpassword123'},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin_test')
        self.assertEqual(response.data['rol'], 'ADMIN')
        self.assertEqual(response.data['email'], 'admin@stockx.local')
        self.assertEqual(response.data['telefono'], '221-555-0000')

    def test_refresh_returns_a_new_access_token(self):
        login_response = self.client.post(
            self.token_url,
            {'username': 'admin_test', 'password': 'testpassword123'},
        )
        response = self.client.post(
            self.token_refresh_url,
            {'refresh': login_response.data['refresh']},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_cors_allows_local_frontend_origin(self):
        for origin in ('http://localhost:5173', 'http://127.0.0.1:5173'):
            with self.subTest(origin=origin):
                response = self.client.get('/api/health/', HTTP_ORIGIN=origin)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response['Access-Control-Allow-Origin'], origin)
