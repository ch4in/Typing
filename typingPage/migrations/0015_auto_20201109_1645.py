# Generated by Django 2.2.5 on 2020-11-09 08:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0014_auto_20201109_1357'),
    ]

    operations = [
        migrations.AlterField(
            model_name='practiceresult',
            name='score',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='得分'),
        ),
        migrations.AlterField(
            model_name='testresult',
            name='score',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='得分'),
        ),
    ]