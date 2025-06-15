from django.urls import path
from . import views

app_name = 'appointment'

urlpatterns = [
    path('', views.appointment_view, name='appointment'),
    path('api/get-available-times/', views.get_available_times, name='get_available_times'),
]