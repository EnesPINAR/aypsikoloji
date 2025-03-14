from django.shortcuts import render
from django.contrib import messages
from .forms import AppointmentForm
from .models import AvailableTimeSlot
from django.utils import timezone
from django.http import JsonResponse
from datetime import datetime, timedelta, date

def get_calendar_days():
    """Generate calendar days for the current month"""
    today = date.today()
    year = today.year
    month = today.month
    
    # Get the first day of the month
    first_day = date(year, month, 1)
    
    # Get the last day of the month
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get the weekday of the first day (0 = Monday, 6 = Sunday)
    first_weekday = first_day.weekday()
    
    # Calculate days from previous month to show
    prev_month_days = []
    if first_weekday > 0:
        for i in range(first_weekday):
            day = first_day - timedelta(days=i+1)
            prev_month_days.insert(0, {
                'day': day.day,
                'date': day,
                'is_previous_month': True
            })
    
    # Current month days
    current_month_days = [
        {
            'day': day,
            'date': date(year, month, day),
            'is_previous_month': False
        }
        for day in range(1, last_day.day + 1)
    ]
    
    return prev_month_days + current_month_days

def book_appointment(request):
    if request.method == 'POST':
        form = AppointmentForm(request.POST)
        if form.is_valid():
            appointment = form.save()
            messages.success(request, 'Randevunuz başarıyla oluşturuldu.')
            return render(request, 'appointment.html', {
                'form': AppointmentForm(),
                'appointment_details': appointment,
                'success': True,
                'calendar_days': get_calendar_days()
            })
        else:
            error_messages = []
            for field, errors in form.errors.items():
                for error in errors:
                    error_messages.append(f"{field}: {error}")
            
            error_message = " | ".join(error_messages)
            messages.warning(request, f'Form validasyonu başarısız oldu: {error_message}')
            return render(request, 'appointment.html', {
                'form': form,
                'calendar_days': get_calendar_days()
            })
    else:
        form = AppointmentForm()
        return render(request, 'appointment.html', {
            'form': form,
            'calendar_days': get_calendar_days()
        })

def get_available_hours(request):
    selected_date = request.GET.get('date')
    print(f"Received date: {selected_date}")  # Debug log
    
    try:
        date_obj = datetime.strptime(selected_date, '%Y-%m-%d').date()
        
        available_slots = AvailableTimeSlot.objects.filter(
            date=date_obj,
            is_active=True
        )
        
        print(f"Found slots: {available_slots.count()}")  # Debug log
        
        if not available_slots.exists():
            return JsonResponse({
                'available': False,
                'message': 'Bugün için müsait saat bulunmamaktadır.'
            })
        
        available_hours = []
        for slot in available_slots:
            available_hours.extend([
                time.strftime('%H:%M')
                for time in slot.get_available_slots()
            ])
        
        print(f"Available hours: {available_hours}")  # Debug log
        
        return JsonResponse({
            'available': True,
            'hours': available_hours
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug log
        return JsonResponse({
            'available': False,
            'message': 'Bir hata oluştu.'
        })