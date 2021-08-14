# Generated by Django 2.2.3 on 2019-07-26 13:33

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0002_auto_20190726_2058'),
    ]

    operations = [
        migrations.CreateModel(
            name='testResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stuName', models.CharField(max_length=4, verbose_name='姓名')),
                ('speed', models.IntegerField(default=0, verbose_name='速度')),
                ('completionRate', models.IntegerField(default=0, verbose_name='完成率')),
                ('correctRate', models.IntegerField(default=0, verbose_name='正确率')),
                ('testID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_rank', to='typingPage.test')),
            ],
            options={
                'verbose_name': '测试结果',
                'verbose_name_plural': '测试结果',
            },
        ),
        migrations.DeleteModel(
            name='testRank',
        ),
    ]
