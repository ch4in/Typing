# Generated by Django 2.2.5 on 2020-11-09 05:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0013_practiceresult_score'),
    ]

    operations = [
        migrations.AlterField(
            model_name='practiceresult',
            name='correctRate',
            field=models.DecimalField(decimal_places=1, default=0, max_digits=4, verbose_name='正确率'),
        ),
        migrations.AlterField(
            model_name='practiceresult',
            name='score',
            field=models.DecimalField(decimal_places=1, default=0, max_digits=4, verbose_name='得分'),
        ),
        migrations.AlterField(
            model_name='testresult',
            name='score',
            field=models.DecimalField(decimal_places=1, default=0, max_digits=4, verbose_name='得分'),
        ),
    ]