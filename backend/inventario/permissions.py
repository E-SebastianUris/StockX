from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasInventarioRolePermission(BasePermission):
    """Aplica el acceso de inventario según el rol del usuario autenticado."""

    message = 'No tenés permisos para acceder a este recurso.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.rol == 'ADMIN':
            return True

        return (
            user.rol == 'VENDEDOR'
            and view.basename in {'categoria', 'producto'}
            and request.method in SAFE_METHODS
        )
