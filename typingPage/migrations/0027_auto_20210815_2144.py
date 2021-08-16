# Generated by Django 3.2.6 on 2021-08-15 13:44

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0026_user'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='article',
            options={'verbose_name': '02 - 文章', 'verbose_name_plural': '02 - 文章'},
        ),
        migrations.AlterModelOptions(
            name='practiceresult',
            options={'verbose_name': '03 - 练习结果', 'verbose_name_plural': '03 - 练习结果'},
        ),
        migrations.AlterModelOptions(
            name='test',
            options={'verbose_name': '04 - 测试', 'verbose_name_plural': '04 - 测试'},
        ),
        migrations.AlterModelOptions(
            name='testresult',
            options={'verbose_name': '05 - 测试结果', 'verbose_name_plural': '05 - 测试结果'},
        ),
        migrations.AlterModelOptions(
            name='user',
            options={'verbose_name': '01 - 用户', 'verbose_name_plural': '01 - 用户'},
        ),
        migrations.RemoveField(
            model_name='practiceresult',
            name='stuName',
        ),
        migrations.AddField(
            model_name='practiceresult',
            name='UID',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='practice_uid', to='typingPage.user', verbose_name='用户'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='testresult',
            name='testID',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_rank', to='typingPage.test', verbose_name='测试编号'),
        ),
    ]