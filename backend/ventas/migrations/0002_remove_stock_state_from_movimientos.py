from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='movimientostock',
            name='stock_previo',
        ),
        migrations.RemoveField(
            model_name='movimientostock',
            name='stock_posterior',
        ),
    ]
