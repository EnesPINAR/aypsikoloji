from django import forms
from .models import Appointment, AvailableTimeSlot
from datetime import datetime

class AppointmentAdminForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Get available dates
        available_dates = AvailableTimeSlot.objects.values_list('date', flat=True).distinct()
        self.fields['date'].widget = forms.Select(choices=[(date, date) for date in available_dates])
        
        if 'date' in self.data:
            try:
                date = datetime.strptime(self.data['date'], '%Y-%m-%d').date()
                available_slot = AvailableTimeSlot.objects.filter(date=date).first()
                if available_slot:
                    available_hours = available_slot.get_available_hours()
                    self.fields['start_time'].widget = forms.Select(
                        choices=[(time, time.strftime('%H:%M')) for time in available_hours]
                    )
            except (ValueError, TypeError):
                pass