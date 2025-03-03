from django import forms
from django.utils import timezone
from appointment.models import Appointment, AvailableTimeSlot


class AppointmentForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = ['name', 'surname', 'phone_number', 'date_time']
        widgets = {
            'date_time': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Get available slots for date_time field
        available_slots = []

        available_time_slots = AvailableTimeSlot.objects.filter(
            date__gte=timezone.now().date(),
            is_active=True
        )

        for slot in available_time_slots:
            available_slots.extend(slot.get_available_slots())

        # Filter out slots that already have appointments
        booked_slots = Appointment.objects.values_list('date_time', flat=True)
        available_slots = [slot for slot in available_slots if slot not in booked_slots]

        # Update the choices for the date_time field
        if available_slots:
            self.fields['date_time'].widget = forms.Select(
                choices=[(slot.strftime('%Y-%m-%dT%H:%M'), slot.strftime('%d/%m/%Y %H:%M')) for slot in available_slots]
            )