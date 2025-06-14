from django.contrib import admin
from django.contrib.admin import AdminSite
from .models import AvailableTimeSlot, Appointment
from django import forms
from datetime import datetime, timedelta

# Customize admin site
admin.site.site_header = 'AY Psikoloji Yönetim Paneli'
admin.site.site_title = 'AY Psikoloji'
admin.site.index_title = 'Yönetim Paneli'

class AvailableTimeSlotAdminForm(forms.ModelForm):
    class Meta:
        model = AvailableTimeSlot
        fields = '__all__'
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'start_time': forms.TimeInput(attrs={'type': 'time'}),
            'end_time': forms.TimeInput(attrs={'type': 'time'})
        }

@admin.register(AvailableTimeSlot)
class AvailableTimeSlotAdmin(admin.ModelAdmin):
    form = AvailableTimeSlotAdminForm
    list_display = ('date', 'start_time', 'end_time')
    list_filter = ('date',)

    class Meta:
        verbose_name = 'Müsait Zaman Aralığı'
        verbose_name_plural = 'Müsait Zaman Aralıkları'

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('client_name', 'client_phone', 'date', 'start_time', 'calculated_end_time')
    list_filter = ('date',)
    search_fields = ('client_name', 'client_phone')
    exclude = ('end_time',)

    def calculated_end_time(self, obj):
        return obj.get_end_time()
    calculated_end_time.short_description = 'Bitiş Saati'

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['date'].widget = forms.DateInput(attrs={'type': 'date'})
        form.base_fields['start_time'].widget = forms.TimeInput(attrs={'type': 'time'})
        return form

    def save_model(self, request, obj, form, change):
        # Set end_time before saving
        start_datetime = datetime.combine(obj.date, obj.start_time)
        end_datetime = start_datetime + timedelta(minutes=50)
        obj.end_time = end_datetime.time()
        super().save_model(request, obj, form, change)
