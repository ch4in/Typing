# Generated by Django 2.2.3 on 2019-07-26 14:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0003_auto_20190726_2133'),
    ]

    operations = [
        migrations.AddField(
            model_name='test',
            name='testTotalTime',
            field=models.IntegerField(default=20, verbose_name='测试时间'),
        ),
    ]
