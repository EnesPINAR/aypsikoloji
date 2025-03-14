from django import forms
from django.utils import timezone
from appointment.models import Appointment, AvailableTimeSlot
from datetime import datetime

class AppointmentForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = ['name', 'surname', 'phone_number', 'date_time']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add required attributes
        self.fields['name'].required = True
        self.fields['surname'].required = True
        self.fields['phone_number'].required = True
        self.fields['date_time'].required = True
        
        # Add a hidden input for datetime
        self.fields['date_time'].widget = forms.HiddenInput()

    def clean_date_time(self):
        date_time = self.cleaned_data.get('date_time')
        if not date_time:
            raise forms.ValidationError("Lütfen tarih ve saat seçiniz.")
        
        # Convert string to datetime if needed
        if isinstance(date_time, str):
            try:
                if 'T' in date_time:
                    date_time = datetime.strptime(date_time, '%Y-%m-%dT%H:%M:%S')
                else:
                    date_time = datetime.strptime(date_time, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                raise forms.ValidationError("Geçersiz tarih formatı.")

        return date_time

    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        if not phone.isdigit() or len(phone) != 11:
            raise forms.ValidationError("Geçerli bir telefon numarası giriniz. (11 haneli)")
        return phone