# Generated by Django 3.2.6 on 2021-08-21 13:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0031_auto_20210821_1452'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='book',
        ),
        migrations.RemoveField(
            model_name='task',
            name='lesson',
        ),
        migrations.RemoveField(
            model_name='task',
            name='unit',
        ),
        migrations.AddField(
            model_name='task',
            name='isUploaded',
            field=models.BooleanField(default=False, verbose_name='是否已提交'),
        ),
        migrations.AddField(
            model_name='task',
            name='taskContent',
            field=models.CharField(default='', max_length=100, verbose_name='任务描述'),
        ),
        migrations.AddField(
            model_name='task',
            name='taskTitle',
            field=models.CharField(default='', max_length=100, verbose_name='任务名称'),
        ),
    ]
