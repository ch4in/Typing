# Generated by Django 2.2.3 on 2019-07-26 12:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='test',
            name='testID',
            field=models.AutoField(primary_key=True, serialize=False, verbose_name='测试编号'),
        ),
    ]
