# Generated by Django 2.2.5 on 2021-04-22 01:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingPage', '0016_auto_20210422_0837'),
    ]

    operations = [
        migrations.AddField(
            model_name='test',
            name='date',
            field=models.DateField(auto_now_add=True, default=5.430107526881721),
            preserve_default=False,
        ),
    ]
