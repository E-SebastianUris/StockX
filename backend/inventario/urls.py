from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProveedorViewSet, ProductoViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('proveedores', ProveedorViewSet, basename='proveedor')
router.register('productos', ProductoViewSet, basename='producto')

urlpatterns = [
    path('', include(router.urls)),
]
