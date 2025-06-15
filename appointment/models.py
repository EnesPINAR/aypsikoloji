from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import datetime, timedelta
import re

def validate_phone(value):
    # Remove any spaces or special characters
    phone_clean = re.sub(r'\D', '', value)
    
    # Check if it's a valid Turkish phone number (5XX XXX XX XX)
    tr_pattern = r'^5\d{9}$'
    # Check if it's a valid international number (+XX XXXXX...)
    intl_pattern = r'^\+?[1-9]\d{7,14}$'
    
    if not (re.match(tr_pattern, phone_clean) or re.match(intl_pattern, phone_clean)):
        raise ValidationError(
            _('Geçersiz telefon numarası formatı. Örnek: 5XX XXX XX XX veya +XX XXXXX...'),
            code='invalid_phone'
        )

class AvailableTimeSlot(models.Model):
    date = models.DateField(verbose_name='Tarih')
    start_time = models.TimeField(verbose_name='Başlangıç Saati')
    end_time = models.TimeField(verbose_name='Bitiş Saati')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("Bitiş saati başlangıç saatinden sonra olmalıdır.")

    def get_available_hours(self):
        """Returns list of available hour slots"""
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        slots = []
        
        while start + timedelta(minutes=50) <= end:
            is_booked = Appointment.objects.filter(
                date=self.date,
                start_time=start.time()
            ).exists()
            
            if not is_booked:
                slots.append(start.time())
            start = start + timedelta(minutes=50)
            
        return slots

    class Meta:
        ordering = ['date', 'start_time']
        unique_together = ['date', 'start_time', 'end_time']
        verbose_name = 'Müsait Zaman Aralığı'
        verbose_name_plural = 'Müsait Zaman Aralıkları'

    def __str__(self):
        return f"{self.date} ({self.start_time} - {self.end_time})"

class Appointment(models.Model):
    id = models.AutoField(primary_key=True)
    client_name = models.CharField(max_length=100, verbose_name='Danışan Adı')
    client_phone = models.CharField(
        max_length=15, 
        verbose_name='Telefon Numarası',
        validators=[validate_phone]
    )
    date = models.DateField(verbose_name='Tarih')
    start_time = models.TimeField(verbose_name='Başlangıç Saati')
    end_time = models.TimeField(verbose_name='Bitiş Saati', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')

    def get_end_time(self):
        """Calculate end time (50 minutes after start time)"""
        start_datetime = datetime.combine(self.date, self.start_time)
        return (start_datetime + timedelta(minutes=50)).time()

    def clean(self):
        # Validate time conflict
        conflicts = Appointment.objects.filter(
            date=self.date,
            start_time=self.start_time
        ).exclude(id=self.id)
        
        if conflicts.exists():
            raise ValidationError({
                '__all__': _('Bu zaman aralığında başka bir randevu bulunmaktadır.')
            })

    def save(self, *args, **kwargs):
        self.client_phone = re.sub(r'\D', '', self.client_phone)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-date', '-start_time']
        verbose_name = 'Randevu'
        verbose_name_plural = 'Randevular'

    def __str__(self):
        return f"{self.client_name} - {self.date} {self.start_time}"
