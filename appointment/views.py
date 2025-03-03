from django.shortcuts import render
from django.contrib import messages
from .forms import AppointmentForm
from .models import AvailableTimeSlot
from django.utils import timezone


def book_appointment(request):
    success = False
    appointment_details = None

    if request.method == 'POST':
        form = AppointmentForm(request.POST)
        if form.is_valid():
            appointment = form.save()
            success = True
            appointment_details = {
                'name': appointment.name,
                'surname': appointment.surname,
                'date_time': appointment.date_time.strftime('%d/%m/%Y %H:%M'),
            }
            messages.success(request, "Randevunuz başarıyla oluşturuldu.")
            # Create a new form for subsequent appointments
            form = AppointmentForm()
        else:
            messages.warning(request, "Randevunuz oluşturulamadı. Lütfen tarih ve saati kontrol ediniz.")
    else:
        form = AppointmentForm()

    # Get available dates for the calendar
    available_dates = AvailableTimeSlot.objects.filter(
        date__gte=timezone.now().date(),
        is_active=True
    ).values_list('date', flat=True).distinct()

    return render(request, 'appointment.html', {
        'form': form,
        'available_dates': available_dates,
        'success': success,
        'appointment_details': appointment_details,
    })