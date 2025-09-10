from django.db import models

# Create your models here.
# appointments/models.py

from django.db import models
from django.contrib.auth.models import User # Psikolog girişi için temel User modeli

# Gelecekte psikologlara özel daha fazla alan eklemek için bu model kullanılabilir.
class Psychologist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # Gelecekte buraya uzmanlık alanı, fotoğraf gibi alanlar eklenebilir.

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    class Meta:
        verbose_name = "Psikolog"
        verbose_name_plural = "Psikologlar"


class WorkingSlot(models.Model):
    """ Psikoloğun belirli bir gün için çalışma saatlerini tanımlar. """
    psychologist = models.ForeignKey(Psychologist, on_delete=models.CASCADE, related_name='working_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        # Bir psikolog bir günde sadece bir çalışma aralığı tanımlayabilir.
        unique_together = ('psychologist', 'date')
        verbose_name = "Çalışma Saati"
        verbose_name_plural = "Çalışma Saatleri"

    def __str__(self):
        return f"{self.psychologist} - {self.date} ({self.start_time}-{self.end_time})"

class Appointment(models.Model):
    """ Müşterilerin aldığı randevuları temsil eder. """

    STATUS_CHOICES = [
        ('BOOKED', 'Dolu'),
        ('CANCELLED', 'İptal Edildi'),
    ]

    psychologist = models.ForeignKey(Psychologist, on_delete=models.CASCADE, related_name='appointments')
    # WorkingSlot'a ForeignKey eklemek, hangi slotun dolduğunu bilmek için önemlidir.
    working_slot = models.ForeignKey(WorkingSlot, on_delete=models.CASCADE, related_name='appointments')

    user_name = models.CharField(max_length=100)
    user_surname = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)

    date = models.DateField()
    time = models.TimeField() # Randevunun tam başlangıç saati

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='BOOKED')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Randevu: {self.user_name} {self.user_surname} - {self.date} {self.time}"

    class Meta:
        verbose_name = "Randevu"
        verbose_name_plural = "Randevular"

class CancelledAppointmentLog(models.Model):
    """ Psikolog tarafından iptal edilen randevuların kaydını tutar. """
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE)
    cancelled_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, null=True) # İptal nedeni (opsiyonel)
    # Markdown'da belirtildiği gibi, müşteriye bilgi verilip verilmediğini takip eder.
    client_notified = models.BooleanField(default=False)

    def __str__(self):
        return f"İptal Edilen Randevu: {self.appointment}"
