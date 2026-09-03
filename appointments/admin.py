from django.contrib import admin
from .models import (
    Psychologist,
    ClientProfile,
    WeeklySchedule,
    DateOverride,
    Appointment,
    CancelledAppointmentLog,
    EmailVerificationCode,
    SiteContent
)



@admin.register(Psychologist)
class PsychologistAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'phone', 'slot_duration_minutes', 'break_duration_minutes']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email']


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'phone', 'get_email', 'status', 'created_by_psychologist', 'created_at', 'approved_at']
    list_filter = ['status', 'created_by_psychologist', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'phone']
    actions = ['approve_clients', 'reject_clients']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_full_name.short_description = "Danışan Adı"

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = "E-posta"

    @admin.action(description="Seçilen danışanları ONAYLA")
    def approve_clients(self, request, queryset):
        for client in queryset:
            client.approve()

    @admin.action(description="Seçilen danışanları REDDET")
    def reject_clients(self, request, queryset):
        for client in queryset:
            client.reject()


@admin.register(WeeklySchedule)
class WeeklyScheduleAdmin(admin.ModelAdmin):
    list_display = ['psychologist', 'day_of_week', 'start_time', 'end_time', 'is_active']
    list_filter = ['psychologist', 'day_of_week', 'is_active']


@admin.register(DateOverride)
class DateOverrideAdmin(admin.ModelAdmin):
    list_display = ['psychologist', 'date', 'override_type', 'start_time', 'end_time', 'reason']
    list_filter = ['psychologist', 'override_type', 'date']
    search_fields = ['reason']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['date', 'time', 'user_name', 'user_surname', 'phone', 'psychologist', 'status', 'created_at']
    list_filter = ['status', 'date', 'psychologist']
    search_fields = ['user_name', 'user_surname', 'phone', 'client_notes', 'psychologist_notes']


@admin.register(CancelledAppointmentLog)
class CancelledAppointmentLogAdmin(admin.ModelAdmin):
    list_display = ['appointment', 'cancelled_by', 'cancelled_at', 'client_notified']
    list_filter = ['cancelled_by', 'client_notified']


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'purpose', 'code', 'new_value', 'created_at', 'expires_at', 'is_used']
    list_filter = ['purpose', 'is_used', 'created_at']
    search_fields = ['user__username', 'user__email', 'code', 'new_value']


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'title', 'contact_email', 'contact_phone', 'updated_at']



