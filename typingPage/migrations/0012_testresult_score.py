# Generated by Django 2.2.5 on 2020-11-09 05:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0011_auto_20191118_1824'),
    ]

    operations = [
        migrations.AddField(
            model_name='testresult',
            name='score',
            field=models.IntegerField(default=0, verbose_name='得分'),
        ),
    ]
