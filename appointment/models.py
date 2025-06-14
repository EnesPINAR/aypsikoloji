from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta
import re

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
    client_name = models.CharField(max_length=100, verbose_name='Danışan Adı')
    client_phone = models.CharField(max_length=15, verbose_name='Telefon Numarası', default='000000000') 
    date = models.DateField(verbose_name='Tarih')
    start_time = models.TimeField(verbose_name='Başlangıç Saati')
    end_time = models.TimeField(verbose_name='Bitiş Saati', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')

    def get_end_time(self):
        """Calculate end time (50 minutes after start time)"""
        start_datetime = datetime.combine(self.date, self.start_time)
        return (start_datetime + timedelta(minutes=50)).time()

    def clean(self):
        # Validate phone number format
        if self.client_phone:
            # Remove any spaces, dashes, parentheses
            cleaned_phone = ''.join(filter(str.isdigit, self.client_phone))
            
            # Check if it starts with + or 00
            original_phone = self.client_phone.strip()
            if original_phone.startswith('+') or original_phone.startswith('00'):
                # International format validation
                if not (8 <= len(cleaned_phone) <= 15):
                    raise ValidationError({'client_phone': 'Geçerli bir telefon numarası giriniz. (+XX XXXXX...)'})
                
                # Convert all international numbers to + format
                if original_phone.startswith('00'):
                    cleaned_phone = cleaned_phone[2:]  # Remove '00' prefix
                self.client_phone = f'+{cleaned_phone}'
            else:
                # Turkish format validation
                if not (10 <= len(cleaned_phone) <= 11):
                    raise ValidationError({'client_phone': 'Geçerli bir telefon numarası giriniz. (5XX XXX XX XX)'})
                # Format Turkish numbers
                if len(cleaned_phone) == 10:
                    self.client_phone = f'0{cleaned_phone}'
                else:
                    self.client_phone = cleaned_phone

        # Check if slot is available
        if self.start_time:
            available_slot = AvailableTimeSlot.objects.filter(
                date=self.date,
                start_time__lte=self.start_time,
                end_time__gte=self.get_end_time()
            ).exists()

            if not available_slot:
                raise ValidationError("Bu zaman aralığı müsait değil.")

            # Check for overlapping appointments
            start_datetime = datetime.combine(self.date, self.start_time)
            end_datetime = start_datetime + timedelta(minutes=50)
            
            overlapping = Appointment.objects.filter(
                date=self.date
            ).filter(
                models.Q(start_time__lt=end_datetime.time()) &
                models.Q(start_time__gte=self.start_time)
            )
            
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
                
            if overlapping.exists():
                raise ValidationError("Bu zaman aralığında başka bir randevu bulunmaktadır.")

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name = 'Randevu'
        verbose_name_plural = 'Randevular'

    def __str__(self):
        return f"{self.client_name} - {self.date} {self.start_time}"
