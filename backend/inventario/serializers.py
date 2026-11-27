from decimal import Decimal

from django.utils import timezone
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
        fields = (
            'id', 'proveedor', 'proveedor_id',
            'codigo_articulo_proveedor',
            'cantidad_compra', 'fecha_compra', 'precio_compra',
            'creado_el',
        )
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
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.filter(activo=True),
        required=False,
        allow_null=True,
        write_only=True,
    )
    fecha_compra = serializers.DateField(required=False, allow_null=True, write_only=True)
    cantidad_compra = serializers.IntegerField(required=False, allow_null=True, min_value=1, write_only=True)
    producto_proveedores = ProductoProveedorSerializer(many=True, read_only=True)
    precio_costo = serializers.SerializerMethodField()
    en_alerta_stock = serializers.BooleanField(read_only=True)
    sin_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id', 'codigo_barra', 'nombre', 'descripcion',
            'categoria', 'categoria_id', 'proveedor_id',
            'fecha_compra', 'cantidad_compra',
            'precio_costo', 'precio_venta',
            'stock_actual', 'stock_minimo',
            'en_alerta_stock', 'sin_stock',
            'fecha_vencimiento', 'activo',
            'producto_proveedores',
            'creado_el', 'actualizado_el',
        )
        read_only_fields = ('id', 'creado_el', 'actualizado_el', 'precio_costo')
        extra_kwargs = {
            'precio_venta': {'min_value': Decimal('0')},
            'stock_actual': {'min_value': 0},
            'stock_minimo': {'min_value': 0},
        }

    def get_precio_costo(self, obj):
        return obj.precio_costo

    def validate(self, attrs):
        proveedor = attrs.get('proveedor_id')
        fecha_compra = attrs.get('fecha_compra')
        cantidad_compra = attrs.get('cantidad_compra')

        if fecha_compra is not None and cantidad_compra is None:
            raise serializers.ValidationError({
                'cantidad_compra': 'Debe informar la cantidad comprada junto con la fecha de compra.'
            })
        if cantidad_compra is not None and fecha_compra is None:
            raise serializers.ValidationError({
                'fecha_compra': 'Debe informar la fecha de compra junto con la cantidad comprada.'
            })
        if cantidad_compra is not None and cantidad_compra < 1:
            raise serializers.ValidationError({
                'cantidad_compra': 'La cantidad comprada debe ser mayor a cero.'
            })
        if self.instance is None and proveedor is None:
            raise serializers.ValidationError({
                'proveedor_id': 'Debe seleccionar un proveedor al crear el producto.'
            })

        return attrs

    def validate_fecha_vencimiento(self, value):
        if value is not None and value < timezone.now().date():
            raise serializers.ValidationError('La fecha de vencimiento no puede haber pasado.')
        return value

    def create(self, validated_data):
        proveedor = validated_data.pop('proveedor_id', None)
        fecha_compra = validated_data.pop('fecha_compra', None)
        cantidad_compra = validated_data.pop('cantidad_compra', None)
        producto = super().create(validated_data)
        if proveedor and fecha_compra and cantidad_compra:
            ProductoProveedor.objects.create(
                producto=producto,
                proveedor=proveedor,
                cantidad_compra=cantidad_compra,
                fecha_compra=fecha_compra,
            )
        return producto

    def update(self, instance, validated_data):
        proveedor = validated_data.pop('proveedor_id', None)
        fecha_compra = validated_data.pop('fecha_compra', None)
        cantidad_compra = validated_data.pop('cantidad_compra', None)
        producto = super().update(instance, validated_data)
        if proveedor and fecha_compra and cantidad_compra:
            if not ProductoProveedor.objects.filter(
                producto=producto,
                proveedor=proveedor,
                fecha_compra=fecha_compra,
                cantidad_compra=cantidad_compra,
            ).exists():
                ProductoProveedor.objects.create(
                    producto=producto,
                    proveedor=proveedor,
                    cantidad_compra=cantidad_compra,
                    fecha_compra=fecha_compra,
                )
        return producto
