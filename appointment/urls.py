from django.urls import path
from . import views

urlpatterns = [
    path('api/get-available-times/', views.get_available_times, name='get_available_times'),
]