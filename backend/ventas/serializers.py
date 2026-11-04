from decimal import Decimal
from django.db import transaction
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
            # Bloquear productos para evitar condiciones de carrera en stock
            productos = (
                Producto.objects.select_for_update()
                .filter(id__in=producto_ids)
                .in_bulk()
            )

            # Validar existencia de todos los productos solicitados
            faltantes = set(producto_ids) - set(productos.keys())
            if faltantes:
                raise serializers.ValidationError(
                    {'detalles': f'Los siguientes productos no existen: {sorted(list(faltantes))}.'}
                )

            total_venta = Decimal('0.00')
            items_a_procesar = []

            for item in detalles_data:
                prod = productos[item['producto_id']]
                cantidad = item['cantidad']

                if not prod.activo:
                    raise serializers.ValidationError(
                        {'detalles': f"El producto '{prod.nombre}' está inactivo y no se puede vender."}
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

                stock_previo = prod.stock_actual
                stock_posterior = stock_previo - cantidad

                items_a_procesar.append({
                    'producto': prod,
                    'cantidad': cantidad,
                    'precio_unitario': precio_unitario,
                    'subtotal': subtotal,
                    'stock_previo': stock_previo,
                    'stock_posterior': stock_posterior,
                })

            # Crear cabecera de la venta
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

                # Descontar stock
                prod.stock_actual = item['stock_posterior']
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
                        cantidad=-cantidad,  # egreso por venta
                        stock_previo=item['stock_previo'],
                        stock_posterior=item['stock_posterior'],
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
            'stock_previo',
            'stock_posterior',
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

            stock_previo = producto.stock_actual

            if tipo == 'INGRESO':
                delta = cantidad_input
                stock_posterior = stock_previo + delta
                cantidad_movimiento = delta
            elif tipo == 'EGRESO':
                delta = cantidad_input
                if stock_previo < delta:
                    raise serializers.ValidationError(
                        {'cantidad': f'Stock insuficiente para egreso. Stock actual: {stock_previo}, solicitado: {delta}.'}
                    )
                stock_posterior = stock_previo - delta
                cantidad_movimiento = -delta
            elif tipo == 'AJUSTE':
                # AJUSTE permite correcciones positivas o negativas
                delta = cantidad_input
                stock_posterior = stock_previo + delta
                if stock_posterior < 0:
                    raise serializers.ValidationError(
                        {
                            'cantidad': (
                                f'El ajuste solicitado provocaría un stock negativo ({stock_posterior}). '
                                f'Stock actual: {stock_previo}.'
                            )
                        }
                    )
                cantidad_movimiento = delta
            else:
                raise serializers.ValidationError({'tipo': f'Tipo no permitido para registro manual: {tipo}.'})

            # Actualizar stock en el producto
            producto.stock_actual = stock_posterior
            if fecha_vencimiento:
                producto.fecha_vencimiento = fecha_vencimiento
                producto.save(update_fields=['stock_actual', 'fecha_vencimiento', 'actualizado_el'])
            else:
                producto.save(update_fields=['stock_actual', 'actualizado_el'])

            # Registrar movimiento
            movimiento = MovimientoStock.objects.create(
                producto=producto,
                tipo=tipo,
                cantidad=cantidad_movimiento,
                stock_previo=stock_previo,
                stock_posterior=stock_posterior,
                motivo=motivo,
                fecha_vencimiento_asociada=fecha_vencimiento,
                usuario=usuario,
            )

            return movimiento
