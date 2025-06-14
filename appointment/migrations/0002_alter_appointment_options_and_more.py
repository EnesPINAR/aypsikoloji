# Generated by Django 5.2.3 on 2025-06-14 21:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointment', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='appointment',
            options={'ordering': ['date', 'start_time'], 'verbose_name': 'Randevu', 'verbose_name_plural': 'Randevular'},
        ),
        migrations.AlterModelOptions(
            name='availabletimeslot',
            options={'ordering': ['date', 'start_time'], 'verbose_name': 'Müsait Zaman Aralığı', 'verbose_name_plural': 'Müsait Zaman Aralıkları'},
        ),
        migrations.AlterField(
            model_name='appointment',
            name='client_email',
            field=models.EmailField(max_length=254, verbose_name='E-posta'),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='client_name',
            field=models.CharField(max_length=100, verbose_name='Danışan Adı'),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi'),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='date',
            field=models.DateField(verbose_name='Tarih'),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='end_time',
            field=models.TimeField(verbose_name='Bitiş Saati'),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='start_time',
            field=models.TimeField(verbose_name='Başlangıç Saati'),
        ),
        migrations.AlterField(
            model_name='availabletimeslot',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi'),
        ),
        migrations.AlterField(
            model_name='availabletimeslot',
            name='date',
            field=models.DateField(verbose_name='Tarih'),
        ),
        migrations.AlterField(
            model_name='availabletimeslot',
            name='end_time',
            field=models.TimeField(verbose_name='Bitiş Saati'),
        ),
        migrations.AlterField(
            model_name='availabletimeslot',
            name='start_time',
            field=models.TimeField(verbose_name='Başlangıç Saati'),
        ),
    ]
