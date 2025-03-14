from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import datetime


class AvailableTimeSlot(models.Model):
    date = models.DateField(verbose_name="Tarih")
    start_time = models.TimeField(verbose_name="Başlangıç Saati")
    end_time = models.TimeField(verbose_name="Bitiş Saati")
    duration = models.IntegerField(default=50, verbose_name="Süre (dakika)")
    is_active = models.BooleanField(default=True, verbose_name="Aktif")

    def __str__(self):
        return f"{self.date.strftime('%d/%m/%Y')} {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"

    def clean(self):
        # Validate that end_time is after start_time
        if self.start_time >= self.end_time:
            raise ValidationError(_("Bitiş saati başlangıç saatinden sonra olmalıdır."))

        # Check for overlapping time slots on the same day
        overlaps = AvailableTimeSlot.objects.filter(
            date=self.date,
            is_active=True
        ).exclude(pk=self.pk)

        for slot in overlaps:
            if (self.start_time < slot.end_time and self.end_time > slot.start_time):
                raise ValidationError(_("Bu zaman dilimi başka bir zaman dilimiyle çakışıyor."))

    def get_available_slots(self):
        """Returns a list of available datetime slots based on duration"""
        slots = []
        current_time = datetime.datetime.combine(self.date, self.start_time)
        end_datetime = datetime.datetime.combine(self.date, self.end_time)

        # Create slots based on duration
        while current_time + datetime.timedelta(minutes=self.duration) <= end_datetime:
            # Check if this slot is already booked
            appointment_exists = Appointment.objects.filter(
                date_time=current_time
            ).exists()

            if not appointment_exists:
                slots.append(current_time)

            current_time += datetime.timedelta(minutes=self.duration)

        return slots

    class Meta:
        verbose_name = "Müsait Zaman Dilimi"
        verbose_name_plural = "Müsait Zaman Dilimleri"
        unique_together = ('date', 'start_time', 'end_time')


class Appointment(models.Model):
    """Model for appointment booking"""
    name = models.CharField(max_length=20, verbose_name="İsim")
    surname = models.CharField(max_length=20, verbose_name="Soyisim")
    phone_number = models.CharField(max_length=11, verbose_name="Telefon Numarası")
    date_time = models.DateTimeField(unique=True, verbose_name='Tarih ve Saat')

    def __str__(self):
        return self.name + ' ' + self.surname

    def clean(self):
        """Validate that appointment falls within an available time slot"""
        self._validate_appointment_time()

    def _validate_appointment_time(self):
        """Check if the appointment time is valid"""
        if self.date_time:
            appointment_date = self.date_time.date()
            appointment_time = self.date_time.time()

            # Get all active time slots for this date
            available_slots = AvailableTimeSlot.objects.filter(
                date=appointment_date,
                is_active=True
            )

            if not available_slots.exists():
                raise ValidationError(_("Bu tarihte randevu alınamaz."))

            # Check if the appointment time falls within any available slot
            valid_slot = False
            for slot in available_slots:
                # Check if time is within the slot's start and end times
                if slot.start_time <= appointment_time < slot.end_time:
                    # Check if the time aligns with the slot's duration
                    minutes_since_start = (
                            (appointment_time.hour - slot.start_time.hour) * 60 +
                            (appointment_time.minute - slot.start_time.minute)
                    )
                    if minutes_since_start % slot.duration == 0:
                        valid_slot = True
                        break

            if not valid_slot:
                raise ValidationError(_("Seçilen zaman uygun değil. Lütfen müsait bir zaman seçin."))

    def save(self, *args, **kwargs):
        """Override save method to ensure validation occurs"""
        self._validate_appointment_time()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Randevu"
        verbose_name_plural = "Randevular"