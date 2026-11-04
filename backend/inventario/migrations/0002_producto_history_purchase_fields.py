from datetime import date

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='productoproveedor',
            name='cantidad_compra',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='productoproveedor',
            name='fecha_compra',
            field=models.DateField(default=date.today),
        ),
        migrations.AlterUniqueTogether(
            name='productoproveedor',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='productoproveedor',
            constraint=models.CheckConstraint(condition=models.Q(('cantidad_compra__gt', 0)), name='chk_pp_cantidad_compra_gt_0'),
        ),
        migrations.RemoveField(
            model_name='producto',
            name='precio_costo',
        ),
    ]
