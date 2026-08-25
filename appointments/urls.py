# appointments/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    CurrentUserView,
    WeeklyScheduleViewSet,
    DateOverrideViewSet,
    PsychologistClientViewSet,
    PsychologistAppointmentViewSet,
    PsychologistCalendarOverviewView,
    ClientAvailableSlotsView,
    ClientAppointmentViewSet,
    PublicAvailableSlotsView,
    ClientProfileDetailView,
    ClientSendVerificationCodeView,
    ClientVerifyAndUpdateProfileView
)

admin.site.site_title = "Randevu Yönetim Paneli"
admin.site.site_header = "Aypsikoloji Yönetim Paneli"
admin.site.index_title = "Randevu ve Müsaitlik Yönetimi"

# Psikolog paneli Router'ı
psychologist_router = DefaultRouter()
psychologist_router.register(r'weekly-schedule', WeeklyScheduleViewSet, basename='psychologist-weekly-schedule')
psychologist_router.register(r'date-overrides', DateOverrideViewSet, basename='psychologist-date-override')
psychologist_router.register(r'clients', PsychologistClientViewSet, basename='psychologist-client')
psychologist_router.register(r'appointments', PsychologistAppointmentViewSet, basename='psychologist-appointment')

# Danışan Router'ı
client_router = DefaultRouter()
client_router.register(r'my-appointments', ClientAppointmentViewSet, basename='client-appointment')

urlpatterns = [
    # Kimlik Doğrulama (Auth)
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),

    # Psikolog Yönetim Paneli
    path('psychologist/calendar-overview/', PsychologistCalendarOverviewView.as_view(), name='psychologist-calendar-overview'),
    path('psychologist/', include(psychologist_router.urls)),

    # Danışan Portalı & Randevu & Profil
    path('client/profile/', ClientProfileDetailView.as_view(), name='client-profile'),
    path('client/profile/send-verification-code/', ClientSendVerificationCodeView.as_view(), name='client-profile-send-code'),
    path('client/profile/verify-and-update/', ClientVerifyAndUpdateProfileView.as_view(), name='client-profile-verify-update'),
    path('client/available-slots/', ClientAvailableSlotsView.as_view(), name='client-available-slots'),
    path('client/appointments/', ClientAppointmentViewSet.as_view({'post': 'create'}), name='client-create-appointment'),
    path('client/', include(client_router.urls)),

    # Kamuya Açık / Geriye Dönük Uyumluluk
    path('public/available-slots/', PublicAvailableSlotsView.as_view(), name='public-available-slots'),
]


