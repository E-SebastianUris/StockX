from datetime import date

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE productos_proveedores ADD COLUMN IF NOT EXISTS cantidad_compra integer NOT NULL DEFAULT 1;
                    ALTER TABLE productos_proveedores ADD COLUMN IF NOT EXISTS fecha_compra date NOT NULL DEFAULT CURRENT_DATE;
                    ALTER TABLE productos DROP COLUMN IF EXISTS precio_costo;
                    """,
                    reverse_sql="""
                    ALTER TABLE productos_proveedores DROP COLUMN IF EXISTS cantidad_compra;
                    ALTER TABLE productos_proveedores DROP COLUMN IF EXISTS fecha_compra;
                    ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_costo numeric(12, 2) DEFAULT 0;
                    """,
                ),
            ],
            state_operations=[
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
            ],
        ),
    ]
