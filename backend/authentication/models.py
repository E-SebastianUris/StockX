from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Modelo de usuario personalizado compatible con Django Auth y el esquema SQL (tabla: usuarios).
    Extiende AbstractUser agregando rol y teléfono según db/schema.sql.

    db_table = 'usuarios' garantiza que Django mapee exactamente la tabla definida en schema.sql.
    managed = True: Django gestiona las migraciones de esta tabla (estrategia elegida: ORM como dueño).
    """

    ROL_CHOICES = [
        ('ADMIN', 'Administrador'),
        ('VENDEDOR', 'Vendedor'),
    ]

    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default='VENDEDOR',
        null=False,
    )
    telefono = models.CharField(max_length=30, null=True, blank=True)

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f'{self.username} ({self.rol})'

    @property
    def is_admin(self):
        return self.rol == 'ADMIN'

    @property
    def is_vendedor(self):
        return self.rol == 'VENDEDOR'
