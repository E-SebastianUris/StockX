from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasVentaPermission(BasePermission):
    """
    Permisos para el recurso Venta:
    - Autenticado requerido.
    - ADMIN y VENDEDOR pueden consultar (GET) y registrar ventas (POST).
    """

    message = 'No tenés permisos para acceder a ventas.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.rol in ('ADMIN', 'VENDEDOR'):
            return request.method in SAFE_METHODS or request.method == 'POST'

        return False


class HasMovimientoStockPermission(BasePermission):
    """
    Permisos para el recurso Movimientos de Stock:
    - Autenticado requerido.
    - ADMIN puede consultar (GET) y registrar movimientos manuales (POST: INGRESO, EGRESO, AJUSTE).
    - VENDEDOR sólo puede consultar movimientos (GET / SAFE_METHODS).
    """

    message = 'No tenés permisos para operar sobre movimientos de stock.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.rol == 'ADMIN':
            return request.method in SAFE_METHODS or request.method == 'POST'

        if user.rol == 'VENDEDOR':
            return request.method in SAFE_METHODS

        return False
