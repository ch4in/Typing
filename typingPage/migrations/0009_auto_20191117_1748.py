# Generated by Django 2.2.5 on 2019-11-17 09:48

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0008_auto_20191117_1657'),
    ]

    operations = [
        migrations.AlterField(
            model_name='practiceresult',
            name='articleID',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='practice_rank', to='typingPage.article', verbose_name='文章'),
        ),
    ]
