from rest_framework import serializers
from .models import Categoria, Proveedor, Producto, ProductoProveedor


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ('id', 'nombre', 'descripcion', 'activo', 'creado_el', 'actualizado_el')
        read_only_fields = ('id', 'creado_el', 'actualizado_el')


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ('id', 'nombre', 'contacto', 'telefono', 'email', 'direccion', 'cuit', 'activo', 'creado_el', 'actualizado_el')
        read_only_fields = ('id', 'creado_el', 'actualizado_el')


class ProductoProveedorSerializer(serializers.ModelSerializer):
    proveedor = ProveedorSerializer(read_only=True)
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.all(), source='proveedor', write_only=True
    )

    class Meta:
        model = ProductoProveedor
        fields = ('id', 'proveedor', 'proveedor_id', 'codigo_articulo_proveedor', 'precio_compra', 'creado_el')
        read_only_fields = ('id', 'creado_el')


class ProductoListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    en_alerta_stock = serializers.BooleanField(read_only=True)
    sin_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id', 'codigo_barra', 'nombre', 'categoria', 'categoria_nombre',
            'precio_venta', 'stock_actual', 'stock_minimo',
            'en_alerta_stock', 'sin_stock', 'fecha_vencimiento', 'activo',
        )


class ProductoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo con proveedores anidados."""
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(), source='categoria', write_only=True
    )
    producto_proveedores = ProductoProveedorSerializer(many=True, read_only=True)
    en_alerta_stock = serializers.BooleanField(read_only=True)
    sin_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id', 'codigo_barra', 'nombre', 'descripcion',
            'categoria', 'categoria_id',
            'precio_costo', 'precio_venta',
            'stock_actual', 'stock_minimo',
            'en_alerta_stock', 'sin_stock',
            'fecha_vencimiento', 'activo',
            'producto_proveedores',
            'creado_el', 'actualizado_el',
        )
        read_only_fields = ('id', 'creado_el', 'actualizado_el')
