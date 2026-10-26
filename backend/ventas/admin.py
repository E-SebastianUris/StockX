from django.contrib import admin
from .models import Venta, DetalleVenta, MovimientoStock


class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 0


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha_venta', 'total', 'vendedor', 'metodo_pago')
    list_filter = ('metodo_pago', 'fecha_venta')
    search_fields = ('id', 'vendedor__username')
    inlines = [DetalleVentaInline]


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha_movimiento', 'producto', 'tipo', 'cantidad', 'stock_previo', 'stock_posterior', 'usuario')
    list_filter = ('tipo', 'fecha_movimiento')
    search_fields = ('producto__nombre', 'usuario__username')
