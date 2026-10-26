from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint: devuelve access + refresh token, más datos básicos del usuario."""
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Devuelve los datos del usuario autenticado actual."""
    from .serializers import UsuarioSerializer
    return Response(UsuarioSerializer(request.user).data)
