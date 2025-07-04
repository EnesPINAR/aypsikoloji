# appointments/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkingSlotViewSet, 
    PsychologistAppointmentViewSet, 
    AvailableSlotsView,
    AppointmentCreateView
)

# ViewSet'ler için router
router = DefaultRouter()
router.register(r'working-slots', WorkingSlotViewSet, basename='working-slot')
router.register(r'appointments', PsychologistAppointmentViewSet, basename='psychologist-appointment')

# Psikolog paneli için URL'ler
psychologist_patterns = [
    path('', include(router.urls)),
]

# Herkese açık (kullanıcı) URL'ler
public_patterns = [
    path('available-slots/', AvailableSlotsView.as_view(), name='available-slots'),
    path('appointments/', AppointmentCreateView.as_view(), name='create-appointment'),
]

urlpatterns = [
    path('psychologist/', include(psychologist_patterns)),
    path('public/', include(public_patterns)),
]