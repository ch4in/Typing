# Generated by Django 3.2.6 on 2021-08-15 08:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0025_remove_test_testdate'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('uid', models.AutoField(primary_key=True, serialize=False, verbose_name='用户编号')),
                ('school', models.CharField(max_length=20, verbose_name='学校')),
                ('stuClass', models.CharField(max_length=10, verbose_name='班级')),
                ('stuName', models.CharField(max_length=4, verbose_name='姓名')),
                ('points', models.IntegerField(default=0, verbose_name='积分')),
            ],
            options={
                'verbose_name': '用户',
                'verbose_name_plural': '用户',
            },
        ),
    ]