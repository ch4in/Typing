# Generated by Django 2.2.5 on 2021-04-22 02:01

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0023_auto_20210422_0954'),
    ]

    operations = [
        migrations.RenameField(
            model_name='test',
            old_name='date',
            new_name='testDate',
        ),
    ]
