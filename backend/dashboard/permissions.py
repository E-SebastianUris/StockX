from rest_framework.permissions import BasePermission


class IsAdminRolePermission(BasePermission):
    """
    Permiso estricto que autoriza exclusivamente a usuarios autenticados con rol ADMIN.
    Deniega el acceso a usuarios con rol VENDEDOR (HTTP 403) o no autenticados (HTTP 401).
    """

    message = 'Solo los usuarios administradores pueden acceder al Dashboard y sus reportes.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.rol == 'ADMIN'

