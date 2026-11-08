from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE movimientos_stock DROP COLUMN IF EXISTS stock_previo;
                    ALTER TABLE movimientos_stock DROP COLUMN IF EXISTS stock_posterior;
                    """,
                    reverse_sql="""
                    ALTER TABLE movimientos_stock ADD COLUMN IF NOT EXISTS stock_previo integer;
                    ALTER TABLE movimientos_stock ADD COLUMN IF NOT EXISTS stock_posterior integer;
                    """,
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='movimientostock',
                    name='stock_previo',
                ),
                migrations.RemoveField(
                    model_name='movimientostock',
                    name='stock_posterior',
                ),
            ],
        ),
    ]
