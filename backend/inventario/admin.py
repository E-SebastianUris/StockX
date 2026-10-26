from django.contrib import admin
from .models import Categoria, Proveedor, Producto, ProductoProveedor


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'creado_el')
    list_filter = ('activo',)
    search_fields = ('nombre',)


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'cuit', 'contacto', 'telefono', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre', 'cuit')


class ProductoProveedorInline(admin.TabularInline):
    model = ProductoProveedor
    extra = 1


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo_barra', 'categoria', 'precio_venta', 'stock_actual', 'stock_minimo', 'activo')
    list_filter = ('activo', 'categoria')
    search_fields = ('nombre', 'codigo_barra')
    inlines = [ProductoProveedorInline]
