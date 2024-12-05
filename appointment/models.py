from django.db import models

# Create your models here.
class Appointment(models.Model):
    name = models.CharField(max_length=20, verbose_name="İsim")
    surname = models.CharField(max_length=20, verbose_name="Soyisim")
    phone_number = models.CharField(max_length=11, verbose_name="Telefon Numarası")
    date_time = models.DateTimeField(unique=True ,verbose_name='Tarih ve Saat')

    def __str__(self):
        return self.name +  ' ' + self.surname

    class Meta:
        verbose_name = "Randevu"
        verbose_name_plural = "Randevular"

# TODO add available time logic