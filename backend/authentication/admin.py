from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'is_active')
    list_filter = ('rol', 'is_active', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('StockX', {'fields': ('rol', 'telefono')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('StockX', {'fields': ('rol', 'telefono')}),
    )
