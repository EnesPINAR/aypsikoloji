from django.http import JsonResponse
from django.shortcuts import render
from .models import AvailableTimeSlot
from datetime import datetime

def get_available_times(request):
    date_str = request.GET.get('date')
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        available_slot = AvailableTimeSlot.objects.filter(date=date).first()
        if available_slot:
            times = [t.strftime('%H:%M') for t in available_slot.get_available_hours()]
            return JsonResponse({'times': times})
    except (ValueError, TypeError):
        pass
    return JsonResponse({'times': []})

# Create your views here.
