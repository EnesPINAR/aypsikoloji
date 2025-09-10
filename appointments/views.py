from django.shortcuts import render

# Create your views here.
# appointments/views.py

from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from .models import Psychologist, WorkingSlot, Appointment, CancelledAppointmentLog
from .serializers import WorkingSlotSerializer, AppointmentSerializer, PsychologistAppointmentSerializer
from datetime import datetime, timedelta
from django.utils import timezone
from django.utils.timezone import localtime
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

# --- Psikolog (Admin Panel) için View'lar ---

class WorkingSlotViewSet(viewsets.ModelViewSet):
    """
    Giriş yapmış psikoloğun kendi çalışma saatlerini yönetmesi için.
    - list: /api/psychologist/working-slots/
    - create: /api/psychologist/working-slots/
    - update: /api/psychologist/working-slots/{id}/
    - delete: /api/psychologist/working-slots/{id}/
    """
    serializer_class = WorkingSlotSerializer
    permission_classes = [IsAuthenticated] # Sadece giriş yapmış kullanıcılar

    def get_queryset(self):
        # Sadece isteği yapan psikoloğun kendi slotlarını döndürür.
        psychologist = Psychologist.objects.get(user=self.request.user)
        return WorkingSlot.objects.filter(psychologist=psychologist)

    def perform_create(self, serializer):
        # Yeni slot oluşturulurken psikolog olarak mevcut kullanıcıyı ata.
        psychologist = Psychologist.objects.get(user=self.request.user)
        serializer.save(psychologist=psychologist)

class PsychologistAppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Giriş yapmış psikoloğun kendi randevularını listelemesi ve iptal etmesi için.
    - list: /api/psychologist/appointments/
    - retrieve: /api/psychologist/appointments/{id}/
    - cancel (custom action): /api/psychologist/appointments/{id}/cancel/
    """
    serializer_class = PsychologistAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        psychologist = Psychologist.objects.get(user=self.request.user)
        return Appointment.objects.filter(psychologist=psychologist, status='BOOKED').order_by('date', 'time')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ Bir randevuyu iptal eder. """
        appointment = self.get_object()

        # Sadece 'BOOKED' durumundaki randevular iptal edilebilir.
        if appointment.status != 'BOOKED':
            return Response({'error': 'Bu randevu zaten iptal edilmiş veya tamamlanmış.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = 'CANCELLED'
        appointment.save()

        # İptal kaydı oluştur.
        CancelledAppointmentLog.objects.create(appointment=appointment)

        # Markdown'daki gereksinim: İptal sonrası müşteri bilgilerini göster.
        response_data = {
            'message': 'Randevu başarıyla iptal edildi. Lütfen danışanı bilgilendirmeyi unutmayın.',
            'cancelled_appointment_info': {
                'client_name': f"{appointment.user_name} {appointment.user_surname}",
                'client_phone': appointment.phone,
                'appointment_date': appointment.date,
                'appointment_time': appointment.time
            }
        }
        return Response(response_data, status=status.HTTP_200_OK)


# --- Kullanıcı (Randevu Alan) için View'lar ---

class AvailableSlotsView(generics.ListAPIView):
    """
    Belirli bir tarih için müsait randevu saatlerini listeler.
    Kullanım: /api/public/available-slots/?date=YYYY-MM-DD&psychologist_id=1
    """
    permission_classes = [AllowAny]
    serializer_class = None

    def get(self, request, *args, **kwargs):
        date_str = request.query_params.get('date')
        psychologist_id = request.query_params.get('psychologist_id')

        if not date_str or not psychologist_id:
            return Response({'error': 'Tarih (date) ve psikolog ID (psychologist_id) gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            psychologist = Psychologist.objects.get(id=psychologist_id)
        except (ValueError, Psychologist.DoesNotExist):
            return Response({'error': 'Geçersiz tarih formatı veya bulunamayan psikolog.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            working_slot = WorkingSlot.objects.get(psychologist=psychologist, date=date)
        except WorkingSlot.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        booked_appointments = Appointment.objects.filter(
            psychologist=psychologist,
            date=date,
            status='BOOKED'
        ).values_list('time', flat=True)

        available_slots = []
        current_time_dt = datetime.combine(date, working_slot.start_time)
        end_time_dt = datetime.combine(date, working_slot.end_time)

        while current_time_dt < end_time_dt:
            if current_time_dt.time() not in booked_appointments:
                available_slots.append(current_time_dt.strftime('%H:%M'))
            current_time_dt += timedelta(hours=1)

        now = localtime(timezone.now())

        if date == now.date():
            current_time_str = now.strftime('%H:%M')
            # Sadece şu anki zamandan daha ileri olan slotları tut
            available_slots = [slot for slot in available_slots if slot > current_time_str]
        # --- KONTROL SONU ---

        return Response(available_slots, status=status.HTTP_200_OK)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class AppointmentCreateView(generics.CreateAPIView):
    """
    Kullanıcının yeni bir randevu oluşturmasını sağlar.
    Kullanım: POST /api/public/appointments/
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        # Bu kısımda randevu alınmak istenen saatin gerçekten müsait olup
        # olmadığını tekrar kontrol etmek kritik öneme sahiptir (Double booking önlemek için).
        # Basitlik adına bu kontrol şimdilik atlanmıştır, ancak production'da eklenmelidir.

        # Şimdilik, tek psikolog olduğunu varsayarak atama yapıyoruz.
        # Gelecekte, request body'den psychologist_id alınmalıdır.
        psychologist = Psychologist.objects.first() # Varsayılan olarak ilk psikolog
        date = serializer.validated_data.get('date')
        working_slot = WorkingSlot.objects.get(psychologist=psychologist, date=date)

        serializer.save(psychologist=psychologist, working_slot=working_slot)
