# Generated by Django 3.2.6 on 2021-08-15 14:19

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0027_auto_20210815_2144'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='testresult',
            name='stuName',
        ),
        migrations.AddField(
            model_name='testresult',
            name='UID',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='test_uid', to='typingPage.user', verbose_name='学生姓名'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='practiceresult',
            name='UID',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='practice_uid', to='typingPage.user', verbose_name='学生姓名'),
        ),
    ]
