from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from authentication.serializers import UsuarioSerializer
from inventario.models import Producto
from .models import Venta, DetalleVenta, MovimientoStock


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo_barra', read_only=True)

    class Meta:
        model = DetalleVenta
        fields = (
            'id',
            'producto',
            'producto_nombre',
            'producto_codigo',
            'cantidad',
            'precio_unitario',
            'subtotal',
        )
        read_only_fields = ('id', 'precio_unitario', 'subtotal')


class DetalleVentaItemInputSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)


class VentaSerializer(serializers.ModelSerializer):
    vendedor = UsuarioSerializer(read_only=True)
    detalles = DetalleVentaSerializer(many=True, read_only=True)

    class Meta:
        model = Venta
        fields = (
            'id',
            'fecha_venta',
            'total',
            'vendedor',
            'metodo_pago',
            'observaciones',
            'detalles',
        )
        read_only_fields = ('id', 'fecha_venta', 'total', 'vendedor', 'detalles')


class VentaCreateSerializer(serializers.Serializer):
    metodo_pago = serializers.ChoiceField(choices=Venta.METODOS_PAGO, default='EFECTIVO')
    observaciones = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    detalles = DetalleVentaItemInputSerializer(many=True, allow_empty=False)

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError('La venta debe incluir al menos un producto.')

        producto_ids = [item['producto_id'] for item in value]
        if len(producto_ids) != len(set(producto_ids)):
            raise serializers.ValidationError('No se permite repetir el mismo producto en los detalles de la venta.')

        return value

    def create(self, validated_data):
        request = self.context.get('request')
        vendedor = request.user
        metodo_pago = validated_data.get('metodo_pago', 'EFECTIVO')
        observaciones = validated_data.get('observaciones', '')
        detalles_data = validated_data['detalles']

        with transaction.atomic():
            producto_ids = [d['producto_id'] for d in detalles_data]
            productos = (
                Producto.objects.select_for_update()
                .filter(id__in=producto_ids)
                .in_bulk()
            )

            faltantes = set(producto_ids) - set(productos.keys())
            if faltantes:
                raise serializers.ValidationError(
                    {'detalles': f'Los siguientes productos no existen: {sorted(list(faltantes))}.'}
                )

            hoy = timezone.now().date()
            total_venta = Decimal('0.00')
            items_a_procesar = []

            for item in detalles_data:
                prod = productos[item['producto_id']]
                cantidad = item['cantidad']

                if not prod.activo:
                    raise serializers.ValidationError(
                        {'detalles': f"El producto '{prod.nombre}' está inactivo y no se puede vender."}
                    )

                if prod.fecha_vencimiento is not None and prod.fecha_vencimiento < hoy:
                    raise serializers.ValidationError(
                        {'detalles': f"El producto '{prod.nombre}' está vencido y no se puede vender."}
                    )

                if prod.stock_actual <= 0:
                    raise serializers.ValidationError(
                        {'detalles': f"El producto '{prod.nombre}' no tiene stock disponible."}
                    )

                if prod.stock_actual < cantidad:
                    raise serializers.ValidationError(
                        {
                            'detalles': (
                                f"Stock insuficiente para '{prod.nombre}'. "
                                f"Disponible: {prod.stock_actual}, solicitado: {cantidad}."
                            )
                        }
                    )

                precio_unitario = prod.precio_venta
                subtotal = precio_unitario * cantidad
                total_venta += subtotal

                items_a_procesar.append({
                    'producto': prod,
                    'cantidad': cantidad,
                    'precio_unitario': precio_unitario,
                    'subtotal': subtotal,
                    'stock_final': prod.stock_actual - cantidad,
                })

            venta = Venta.objects.create(
                vendedor=vendedor,
                metodo_pago=metodo_pago,
                observaciones=observaciones,
                total=total_venta,
            )

            detalles_instances = []
            movimientos_instances = []

            for item in items_a_procesar:
                prod = item['producto']
                cantidad = item['cantidad']

                prod.stock_actual = item['stock_final']
                prod.save(update_fields=['stock_actual', 'actualizado_el'])

                detalles_instances.append(
                    DetalleVenta(
                        venta=venta,
                        producto=prod,
                        cantidad=cantidad,
                        precio_unitario=item['precio_unitario'],
                        subtotal=item['subtotal'],
                    )
                )

                movimientos_instances.append(
                    MovimientoStock(
                        producto=prod,
                        tipo='VENTA',
                        cantidad=-cantidad,
                        motivo=f'Venta #{venta.id}',
                        usuario=vendedor,
                        venta=venta,
                    )
                )

            DetalleVenta.objects.bulk_create(detalles_instances)
            MovimientoStock.objects.bulk_create(movimientos_instances)

            return venta


class MovimientoStockSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = MovimientoStock
        fields = (
            'id',
            'producto',
            'producto_nombre',
            'tipo',
            'cantidad',
            'motivo',
            'fecha_vencimiento_asociada',
            'usuario',
            'usuario_username',
            'venta',
            'fecha_movimiento',
        )
        read_only_fields = fields


class MovimientoStockCreateSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    tipo = serializers.ChoiceField(choices=['INGRESO', 'EGRESO', 'AJUSTE'])
    cantidad = serializers.IntegerField()
    motivo = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    fecha_vencimiento_asociada = serializers.DateField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        tipo = attrs['tipo']
        cantidad = attrs['cantidad']

        if cantidad == 0:
            raise serializers.ValidationError({'cantidad': 'La cantidad no puede ser cero.'})

        if tipo in ('INGRESO', 'EGRESO') and cantidad < 0:
            raise serializers.ValidationError(
                {'cantidad': f'Para movimientos de tipo {tipo}, la cantidad debe ser positiva.'}
            )

        fecha_vencimiento = attrs.get('fecha_vencimiento_asociada')
        if fecha_vencimiento is not None and fecha_vencimiento < timezone.now().date():
            raise serializers.ValidationError({
                'fecha_vencimiento_asociada': 'La fecha de vencimiento no puede haber pasado.'
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        usuario = request.user
        producto_id = validated_data['producto_id']
        tipo = validated_data['tipo']
        cantidad_input = validated_data['cantidad']
        motivo = validated_data.get('motivo', '')
        fecha_vencimiento = validated_data.get('fecha_vencimiento_asociada')

        with transaction.atomic():
            try:
                producto = Producto.objects.select_for_update().get(id=producto_id)
            except Producto.DoesNotExist:
                raise serializers.ValidationError({'producto_id': f'El producto {producto_id} no existe.'})

            stock_actual = producto.stock_actual

            if tipo == 'INGRESO':
                stock_nuevo = stock_actual + cantidad_input
                cantidad_movimiento = cantidad_input
            elif tipo == 'EGRESO':
                if stock_actual < cantidad_input:
                    raise serializers.ValidationError(
                        {'cantidad': f'Stock insuficiente para egreso. Stock actual: {stock_actual}, solicitado: {cantidad_input}.'}
                    )
                stock_nuevo = stock_actual - cantidad_input
                cantidad_movimiento = -cantidad_input
            else:
                stock_nuevo = stock_actual + cantidad_input
                if stock_nuevo < 0:
                    raise serializers.ValidationError(
                        {'cantidad': f'El ajuste solicitado provocaría un stock negativo ({stock_nuevo}).'}
                    )
                cantidad_movimiento = cantidad_input

            producto.stock_actual = stock_nuevo
            if fecha_vencimiento:
                producto.fecha_vencimiento = fecha_vencimiento
                producto.save(update_fields=['stock_actual', 'fecha_vencimiento', 'actualizado_el'])
            else:
                producto.save(update_fields=['stock_actual', 'actualizado_el'])

            return MovimientoStock.objects.create(
                producto=producto,
                tipo=tipo,
                cantidad=cantidad_movimiento,
                motivo=motivo,
                fecha_vencimiento_asociada=fecha_vencimiento,
                usuario=usuario,
            )
