from django.shortcuts import render
from django.http import JsonResponse
from django.contrib import messages
from django.core.exceptions import ValidationError
from .models import AvailableTimeSlot, Appointment
from datetime import datetime, date, timedelta
import calendar

def get_calendar_days(year, month):
    """Generate calendar days for the specified month"""
    cal = calendar.monthcalendar(year, month)
    calendar_days = []
    today = date.today()
    
    # Get the first day of current month
    first_day = date(year, month, 1)
    
    for week in cal:
        for day in week:
            if day != 0:
                current_date = date(year, month, day)
                calendar_days.append({
                    'day': day,
                    'date': current_date,
                    'is_previous_month': current_date < today
                })
    
    return calendar_days

def appointment_view(request):
    if request.method == 'POST':
        try:
            # Get form data
            name = request.POST.get('name', '').strip()
            phone = request.POST.get('phone_number', '').strip()
            date_str = request.POST.get('date', '').strip()
            time_str = request.POST.get('time', '').strip()
            
            # Basic validation
            if not all([name, phone, date_str, time_str]):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Lütfen tüm alanları doldurunuz.'
                }, status=400)

            # Parse date and time
            try:
                appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                appointment_time = datetime.strptime(time_str, '%H:%M').time()
            except ValueError:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Geçersiz tarih veya saat formatı.'
                }, status=400)

            # Create appointment instance
            appointment = Appointment(
                client_name=name,
                client_phone=phone,
                date=appointment_date,
                start_time=appointment_time
            )

            # Validate before saving
            try:
                appointment.full_clean()
            except ValidationError as e:
                if 'client_phone' in e.message_dict:
                    error_message = e.message_dict['client_phone'][0]
                elif '__all__' in e.message_dict:
                    error_message = e.message_dict['__all__'][0]
                else:
                    error_message = 'Validasyon hatası oluştu.'
                return JsonResponse({
                    'status': 'error',
                    'message': error_message
                }, status=400)

            # Save if validation passes
            appointment.save()  # No validation in save() method now
            return JsonResponse({
                'status': 'success',
                'message': 'Randevunuz başarıyla oluşturuldu.'
            })

        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'
            }, status=500)

    # GET request - show calendar
    today = date.today()
    calendar_days = get_calendar_days(today.year, today.month)
    
    return render(request, 'appointment.html', {
        'calendar_days': calendar_days
    })

def get_available_times(request):
    date_str = request.GET.get('date')
    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        available_slot = AvailableTimeSlot.objects.filter(date=selected_date).first()
        
        if available_slot:
            times = []
            start = datetime.combine(selected_date, available_slot.start_time)
            end = datetime.combine(selected_date, available_slot.end_time)
            
            while start + timedelta(minutes=50) <= end:
                # Check if this time slot is already booked
                is_booked = Appointment.objects.filter(
                    date=selected_date,
                    start_time=start.time()
                ).exists()
                
                if not is_booked:
                    times.append(start.strftime('%H:%M'))
                start = start + timedelta(minutes=50)
                
            return JsonResponse({'times': times})
    except (ValueError, TypeError):
        pass
    
    return JsonResponse({'times': []})