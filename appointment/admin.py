from django.contrib import admin
from appointment.models import AvailableTimeSlot, Appointment


@admin.register(AvailableTimeSlot)
class AvailableTimeSlotAdmin(admin.ModelAdmin):
    list_display = ('date', 'start_time', 'end_time', 'duration', 'is_active')
    list_filter = ('date', 'is_active')
    search_fields = ('date',)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'surname', 'phone_number', 'date_time')
    list_filter = ('date_time',)
    search_fields = ('name', 'surname', 'phone_number')

    def save_model(self, request, obj, form, change):
        """Ensure validation happens when saving from admin"""
        super().save_model(request, obj, form, change)