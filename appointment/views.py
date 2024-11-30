from django.contrib import messages
from django.shortcuts import render
from . import models

# Create your views here.
def appointment(request):
    if request.method == 'POST':
        models.Appointment.objects.create(name=request.POST.get('name'), surname=request.POST.get('surname'), phone_number=request.POST.get('phone_number'), date_time=request.POST.get('date_time')).save()
        messages.success(request, f"{request.POST.get('date_time').replace('T', ' ')}")
        return render(request, 'appointment.html')
    return render(request, 'appointment.html')