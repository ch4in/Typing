# Generated by Django 2.2.5 on 2021-04-22 01:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0022_auto_20210422_0949'),
    ]

    operations = [
        migrations.AlterField(
            model_name='test',
            name='date',
            field=models.DateField(auto_now_add=True),
        ),
    ]