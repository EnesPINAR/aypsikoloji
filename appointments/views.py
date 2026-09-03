import random
import re
from django.shortcuts import render

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.timezone import localtime
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from datetime import datetime, timedelta, time as dt_time

from .models import (
    Psychologist,
    ClientProfile,
    WeeklySchedule,
    DateOverride,
    Appointment,
    CancelledAppointmentLog,
    EmailVerificationCode,
    SiteContent
)
from .serializers import (
    UserSerializer,
    ClientProfileSerializer,
    ClientRegisterSerializer,
    ManualClientCreateSerializer,
    PsychologistSerializer,
    WeeklyScheduleSerializer,
    DateOverrideSerializer,
    AppointmentSerializer,
    ClientCreateAppointmentSerializer,
    ClientProfileUpdateSerializer,
    SendVerificationCodeSerializer,
    VerifyAndUpdateProfileSerializer,
    SiteContentSerializer
)




# --- Yetkilendirme İzin Sınıfları (Custom Permissions) ---

class IsPsychologist(permissions.BasePermission):
    """ Sadece giriş yapmış psikologlar veya adminler erişebilir """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'psychologist_profile') or request.user.is_staff or request.user.is_superuser


class IsApprovedClient(permissions.BasePermission):
    """ Sadece psikolog tarafından onaylanmış danışanlar erişebilir """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Eğer psikolog veya admin ise yine erişebilir
        if hasattr(request.user, 'psychologist_profile') or request.user.is_staff:
            return True
        if hasattr(request.user, 'client_profile'):
            return request.user.client_profile.status == 'APPROVED'
        return False


# --- Slot Hesaplama Yardımcı Fonksiyonu ---

def get_available_slots_for_date(psychologist, target_date):
    """
    Belirli bir tarih için psikoloğun haftalık şablonunu ve özel gün istisnalarını kontrol edip
    müsait seans saatlerini döndürür.
    """
    now = localtime(timezone.now())
    if target_date < now.date():
        return []

    # 1. Özel gün / istisna kontrolü
    override = DateOverride.objects.filter(psychologist=psychologist, date=target_date).first()
    start_time = None
    end_time = None

    if override:
        if override.override_type == 'OFF':
            return [] # O gün kapalı
        elif override.override_type == 'CUSTOM' and override.start_time and override.end_time:
            start_time = override.start_time
            end_time = override.end_time
    else:
        # 2. Haftalık şablon kontrolü (0: Pazartesi ... 6: Pazar)
        day_of_week = target_date.weekday()
        schedule = WeeklySchedule.objects.filter(
            psychologist=psychologist,
            day_of_week=day_of_week
        ).first()

        if not schedule or not schedule.is_active:
            return [] # O gün çalışma yok

        start_time = schedule.start_time
        end_time = schedule.end_time

    if not start_time or not end_time:
        return []

    # 3. Seans saatlerini oluştur
    slot_interval_minutes = 60 # Saat başı randevular
    booked_times = Appointment.objects.filter(
        psychologist=psychologist,
        date=target_date,
        status='BOOKED'
    ).values_list('time', flat=True)

    available_slots = []
    curr_dt = datetime.combine(target_date, start_time)
    end_dt = datetime.combine(target_date, end_time)

    while curr_dt < end_dt:
        t = curr_dt.time()
        if t not in booked_times:
            # Bugün için geçmiş saatleri ele
            if target_date == now.date():
                if curr_dt.strftime('%H:%M') > now.strftime('%H:%M'):
                    available_slots.append(curr_dt.strftime('%H:%M'))
            else:
                available_slots.append(curr_dt.strftime('%H:%M'))

        curr_dt += timedelta(minutes=slot_interval_minutes)

    return available_slots


# --- Kimlik Doğrulama & Oturum View'ları ---

@method_decorator(ensure_csrf_cookie, name='dispatch')
class RegisterView(APIView):
    """ Danışanın web sitesinden kayıt olma talebi göndermesi """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ClientRegisterSerializer(data=request.data)
        if serializer.is_valid():
            client_profile = serializer.save()
            return Response({
                'message': 'Kayıt talebiniz başarıyla alındı. Psikoloğumuz hesabınızı onayladıktan sonra randevu alabileceksiniz.',
                'status': client_profile.status,
                'user': UserSerializer(client_profile.user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    """ Danışan veya Psikoloğun sisteme giriş yapması """
    permission_classes = [permissions.AllowAny]

    def _login_user(self, request, user):
        auth_login(request, user)
        role = 'unknown'
        client_data = None
        is_approved = False

        if hasattr(user, 'psychologist_profile') or user.is_staff or user.is_superuser:
            role = 'psychologist'
            is_approved = True
        elif hasattr(user, 'client_profile'):
            role = 'client'
            client_data = ClientProfileSerializer(user.client_profile).data
            is_approved = user.client_profile.is_approved
        else:
            role = 'user'

        return Response({
            'message': 'Giriş başarılı.',
            'user': UserSerializer(user).data,
            'role': role,
            'is_approved': is_approved,
            'client_profile': client_data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        raw_identifier = request.data.get('username') or request.data.get('email') or request.data.get('phone') or ''
        login_identifier = raw_identifier.strip()
        password = str(request.data.get('password') or '').strip()

        if not login_identifier or not password:
            return Response({'error': 'Lütfen kullanıcı adı / e-posta ve şifre giriniz.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. E-posta ile dene (Eğer @ içeriyorsa kullanıcı e-posta ile giriş yapıyordur; eski e-posta kalıntılarını engelle)
        if '@' in login_identifier:
            user_by_email = User.objects.filter(email__iexact=login_identifier).first()
            if user_by_email:
                user = authenticate(request, username=user_by_email.username, password=password)
                if user:
                    return self._login_user(request, user)
            return Response({'error': 'Giriş bilgileri hatalı. Lütfen e-posta ve şifrenizi kontrol ediniz.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Telefon ile dene (Boşluksuz ve standart format)
        phone_cleaned = login_identifier.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        client_by_phone = ClientProfile.objects.filter(phone__in=[login_identifier, phone_cleaned]).first()
        if client_by_phone:
            user = authenticate(request, username=client_by_phone.user.username, password=password)
            if user:
                return self._login_user(request, user)

        # 3. Doğrudan username ile dene (örn. psikolog)
        user = authenticate(request, username=login_identifier, password=password)
        if user:
            return self._login_user(request, user)

        return Response({'error': 'Giriş bilgileri hatalı. Lütfen bilgilerinizi kontrol ediniz.'}, status=status.HTTP_401_UNAUTHORIZED)




class LogoutView(APIView):
    """ Oturumu kapatma """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        auth_logout(request)
        return Response({'message': 'Başarıyla çıkış yapıldı.'}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """ Aktif kullanıcının durumunu ve rolünü getirme """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'authenticated': False}, status=status.HTTP_200_OK)

        user = request.user
        role = 'unknown'
        client_data = None
        is_approved = False

        if hasattr(user, 'psychologist_profile') or user.is_staff or user.is_superuser:
            role = 'psychologist'
            is_approved = True
        elif hasattr(user, 'client_profile'):
            role = 'client'
            client_data = ClientProfileSerializer(user.client_profile).data
            is_approved = user.client_profile.is_approved
        else:
            role = 'user'

        return Response({
            'authenticated': True,
            'user': UserSerializer(user).data,
            'role': role,
            'is_approved': is_approved,
            'client_profile': client_data
        }, status=status.HTTP_200_OK)


# --- Psikolog Yönetim View'ları ---

class WeeklyScheduleViewSet(viewsets.ModelViewSet):
    """
    Psikoloğun haftalık 7 günlük çalışma saatleri şablonunu yönetmesi.
    GET /api/psychologist/weekly-schedule/
    PUT /api/psychologist/weekly-schedule/bulk_update/
    """
    serializer_class = WeeklyScheduleSerializer
    permission_classes = [IsPsychologist]

    def _get_psychologist(self):
        psychologist = getattr(self.request.user, 'psychologist_profile', None)
        if not psychologist:
            psychologist = Psychologist.objects.first()
            if not psychologist:
                psychologist = Psychologist.objects.create(user=self.request.user)
        return psychologist

    def get_queryset(self):
        psychologist = self._get_psychologist()
        # Eğer henüz 7 gün oluşturulmamışsa varsayılan olarak oluştur
        existing_days = set(WeeklySchedule.objects.filter(psychologist=psychologist).values_list('day_of_week', flat=True))
        for day in range(7):
            if day not in existing_days:
                # Pazartesi - Cuma aktif, Cumartesi-Pazar pasif
                is_active = day < 5
                WeeklySchedule.objects.create(
                    psychologist=psychologist,
                    day_of_week=day,
                    start_time=dt_time(9, 0),
                    end_time=dt_time(18, 0),
                    is_active=is_active
                )
        return WeeklySchedule.objects.filter(psychologist=psychologist).order_by('day_of_week')

    @action(detail=False, methods=['put', 'post'])
    def bulk_update(self, request):
        """ Haftanın tüm günlerini tek seferde güncelleme """
        psychologist = self._get_psychologist()
        schedules_data = request.data.get('schedules', [])

        for item in schedules_data:
            day_of_week = item.get('day_of_week')
            if day_of_week is not None:
                start_time_str = item.get('start_time', '09:00')
                end_time_str = item.get('end_time', '18:00')
                is_active = item.get('is_active', True)

                WeeklySchedule.objects.update_or_create(
                    psychologist=psychologist,
                    day_of_week=day_of_week,
                    defaults={
                        'start_time': start_time_str,
                        'end_time': end_time_str,
                        'is_active': is_active
                    }
                )

        updated_schedules = WeeklySchedule.objects.filter(psychologist=psychologist).order_by('day_of_week')
        return Response(WeeklyScheduleSerializer(updated_schedules, many=True).data, status=status.HTTP_200_OK)


class DateOverrideViewSet(viewsets.ModelViewSet):
    """
    Psikoloğun özel gün / izin tanımlamalarını yönetmesi.
    GET, POST, DELETE /api/psychologist/date-overrides/
    """
    serializer_class = DateOverrideSerializer
    permission_classes = [IsPsychologist]

    def _get_psychologist(self):
        psychologist = getattr(self.request.user, 'psychologist_profile', None)
        if not psychologist:
            psychologist = Psychologist.objects.first()
        return psychologist

    def get_queryset(self):
        psychologist = self._get_psychologist()
        return DateOverride.objects.filter(psychologist=psychologist).order_by('date')

    def create(self, request, *args, **kwargs):
        psychologist = self._get_psychologist()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        date_val = serializer.validated_data['date']

        existing_apps = Appointment.objects.filter(
            psychologist=psychologist,
            date=date_val,
            status='BOOKED'
        )
        affected_clients = [
            f"{app.user_name} {app.user_surname} ({app.time.strftime('%H:%M')})"
            for app in existing_apps
        ]

        override = serializer.save(psychologist=psychologist)
        response_data = DateOverrideSerializer(override).data
        response_data['affected_appointments_count'] = len(affected_clients)
        response_data['affected_clients'] = affected_clients

        return Response(response_data, status=status.HTTP_201_CREATED)



class PsychologistClientViewSet(viewsets.ModelViewSet):
    """
    Psikoloğun danışanları listelemesi, manuel danışan eklemesi ve onaylaması/reddetmesi.
    GET /api/psychologist/clients/ (Filtre: ?status=PENDING / APPROVED)
    POST /api/psychologist/clients/ (Manuel ekleme)
    PATCH /api/psychologist/clients/{id}/status/
    """
    permission_classes = [IsPsychologist]
    serializer_class = ClientProfileSerializer

    def get_queryset(self):
        qs = ClientProfile.objects.all().select_related('user').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        """ Psikoloğun manuel olarak onaylı bir danışan eklemesi """
        serializer = ManualClientCreateSerializer(data=request.data)
        if serializer.is_valid():
            client_profile = serializer.save()
            return Response(ClientProfileSerializer(client_profile).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        """ Danışanın üyelik durumunu güncelleme (APPROVED / REJECTED) """
        client = self.get_object()
        new_status = request.data.get('status')

        if new_status == 'APPROVED':
            client.approve()
            return Response({'message': 'Danışan onaylandı.', 'status': client.status}, status=status.HTTP_200_OK)
        elif new_status == 'REJECTED':
            client.reject()
            return Response({'message': 'Danışan başvurusu reddedildi.', 'status': client.status}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Geçersiz durum. (APPROVED veya REJECTED olmalı)'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def notes(self, request, pk=None):
        """ Danışana özel psikolog notu güncelleme """
        client = self.get_object()
        client.notes = request.data.get('notes', '')
        client.save(update_fields=['notes'])
        return Response({'message': 'Danışan notu güncellendi.', 'notes': client.notes}, status=status.HTTP_200_OK)


class PsychologistAppointmentViewSet(viewsets.ModelViewSet):
    """
    Psikoloğun tüm randevuları yönetmesi.
    GET /api/psychologist/appointments/
    POST /api/psychologist/appointments/{id}/cancel/
    PATCH /api/psychologist/appointments/{id}/complete/
    """
    serializer_class = AppointmentSerializer
    permission_classes = [IsPsychologist]

    def _get_psychologist(self):
        psychologist = getattr(self.request.user, 'psychologist_profile', None)
        if not psychologist:
            psychologist = Psychologist.objects.first()
        return psychologist

    def get_queryset(self):
        psychologist = self._get_psychologist()
        qs = Appointment.objects.filter(psychologist=psychologist).select_related('client', 'client__user')

        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(date=date_param)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            qs = qs.filter(date__gte=start_date, date__lte=end_date)

        return qs.order_by('date', 'time')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ Randevuyu iptal etme """
        appointment = self.get_object()
        if appointment.status == 'CANCELLED':
            return Response({'error': 'Randevu zaten iptal edilmiş.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = 'CANCELLED'
        appointment.save(update_fields=['status'])

        reason = request.data.get('reason', '')
        CancelledAppointmentLog.objects.create(
            appointment=appointment,
            cancelled_by='PSYCHOLOGIST',
            reason=reason
        )

        return Response({
            'message': 'Randevu iptal edildi.',
            'cancelled_appointment': AppointmentSerializer(appointment).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        """ Randevuyu tamamlandı olarak işaretleme """
        appointment = self.get_object()
        appointment.status = 'COMPLETED'
        appointment.save(update_fields=['status'])
        return Response({'message': 'Randevu tamamlandı.'}, status=status.HTTP_200_OK)


class PsychologistCalendarOverviewView(APIView):
    """
    Psikoloğun seçtiği tarih aralığındaki (örn. bir haftalık) takvim verisini,
    günlerin açık/kapalı durumunu ve o günlerdeki randevuları tek yanıtta döner.
    GET /api/psychologist/calendar-overview/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    """
    permission_classes = [IsPsychologist]

    def get(self, request):
        psychologist = getattr(request.user, 'psychologist_profile', None) or Psychologist.objects.first()
        if not psychologist:
            return Response({'error': 'Psikolog profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str or not end_date_str:
            # Varsayılan: bugünden itibaren 7 gün
            start_date = timezone.localdate()
            end_date = start_date + timedelta(days=6)
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Geçersiz tarih formatı (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

        appointments = Appointment.objects.filter(
            psychologist=psychologist,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('client', 'client__user').order_by('date', 'time')

        appointments_by_date = {}
        for app in appointments:
            d_str = app.date.strftime('%Y-%m-%d')
            if d_str not in appointments_by_date:
                appointments_by_date[d_str] = []
            appointments_by_date[d_str].append(AppointmentSerializer(app).data)

        days_result = []
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime('%Y-%m-%d')
            avail_slots = get_available_slots_for_date(psychologist, curr)
            override = DateOverride.objects.filter(psychologist=psychologist, date=curr).first()
            day_schedule = WeeklySchedule.objects.filter(psychologist=psychologist, day_of_week=curr.weekday()).first()

            days_result.append({
                'date': d_str,
                'day_of_week': curr.weekday(),
                'day_name': dict(WeeklySchedule.DAYS_OF_WEEK).get(curr.weekday(), ''),
                'is_active': bool(avail_slots) or (override.override_type != 'OFF' if override else (day_schedule.is_active if day_schedule else False)),
                'available_slots': avail_slots,
                'appointments': appointments_by_date.get(d_str, []),
                'override': DateOverrideSerializer(override).data if override else None
            })
            curr += timedelta(days=1)

        return Response({
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'days': days_result
        }, status=status.HTTP_200_OK)


# --- Danışan View'ları ---

class ClientAvailableSlotsView(APIView):
    """
    Onaylı danışanların seçtikleri tarihe ait müsait seans saatlerini görmesi.
    GET /api/client/available-slots/?date=YYYY-MM-DD
    """
    permission_classes = [IsApprovedClient]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'Tarih parametresi (date=YYYY-MM-DD) zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Geçersiz tarih formatı.'}, status=status.HTTP_400_BAD_REQUEST)

        psychologist = Psychologist.objects.first()
        if not psychologist:
            return Response([], status=status.HTTP_200_OK)

        slots = get_available_slots_for_date(psychologist, target_date)
        return Response(slots, status=status.HTTP_200_OK)


class ClientAppointmentViewSet(viewsets.ModelViewSet):
    """
    Onaylı danışanın kendi randevularını listelemesi, randevu alması ve iptal etmesi.
    GET /api/client/my-appointments/
    POST /api/client/appointments/
    POST /api/client/my-appointments/{id}/cancel/
    """
    serializer_class = AppointmentSerializer
    permission_classes = [IsApprovedClient]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'client_profile'):
            return Appointment.objects.filter(client=user.client_profile).order_by('-date', '-time')
        return Appointment.objects.none()

    def create(self, request, *args, **kwargs):
        """ Onaylı danışanın randevu oluşturması """
        serializer = ClientCreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_date = serializer.validated_data['date']
        target_time = serializer.validated_data['time']
        client_notes = serializer.validated_data.get('client_notes', '')

        psychologist = Psychologist.objects.first()
        if not psychologist:
            return Response({'error': 'Psikolog profili bulunamadı.'}, status=status.HTTP_400_BAD_REQUEST)

        # Psikolog veya yetkili hesapların danışan randevusu almasını engelle
        if hasattr(request.user, 'psychologist_profile') or request.user.is_staff or request.user.is_superuser:
            return Response({
                'error': 'Psikolog yetkili hesabı ile danışan randevusu alınamaz. Seansları yönetmek için lütfen Psikolog Paneli\'ni kullanınız.'
            }, status=status.HTTP_403_FORBIDDEN)

        client_profile = getattr(request.user, 'client_profile', None)
        if not client_profile or not client_profile.is_approved:
            return Response({
                'error': 'Yalnızca üyeliği onaylanmış danışanlar randevu alabilir.'
            }, status=status.HTTP_403_FORBIDDEN)

        # 0. Danışanın henüz tamamlanmamış aktif bir randevusu var mı kontrolü
        active_appointment = Appointment.objects.filter(
            client=client_profile,
            status='BOOKED'
        ).first()
        if active_appointment:
            return Response({
                'error': 'Zaten henüz tamamlanmamış aktif bir randevunuz bulunmaktadır. Yeni bir randevu alabilmek için mevcut randevunuzun tamamlanması veya iptal edilmesi gerekmektedir.',
                'active_appointment': AppointmentSerializer(active_appointment).data
            }, status=status.HTTP_400_BAD_REQUEST)


        # 1. Çift rezervasyon kontrolü
        if Appointment.objects.filter(psychologist=psychologist, date=target_date, time=target_time, status='BOOKED').exists():
            return Response({'error': 'Seçtiğiniz saat dilimi doludur. Lütfen başka bir saat seçiniz.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Slotun o gün gerçekten müsait olup olmadığının kontrolü
        avail_slots = get_available_slots_for_date(psychologist, target_date)
        time_str = target_time.strftime('%H:%M')
        if time_str not in avail_slots:
            return Response({'error': 'Seçilen saatte psikoloğun müsaitliği bulunmamaktadır.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment = Appointment.objects.create(
            psychologist=psychologist,
            client=client_profile,
            user_name=request.user.first_name or request.user.username,
            user_surname=request.user.last_name or "",
            phone=client_profile.phone if client_profile else "",
            date=target_date,
            time=target_time,
            status='BOOKED',
            client_notes=client_notes
        )


        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ Danışanın kendi randevusunu iptal etmesi """
        appointment = self.get_object()
        if appointment.status == 'CANCELLED':
            return Response({'error': 'Randevu zaten iptal edilmiş.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = 'CANCELLED'
        appointment.save(update_fields=['status'])

        CancelledAppointmentLog.objects.create(
            appointment=appointment,
            cancelled_by='CLIENT',
            reason=request.data.get('reason', 'Danışan tarafından iptal edildi.')
        )

        return Response({'message': 'Randevunuz başarıyla iptal edildi.'}, status=status.HTTP_200_OK)


# --- Geriye Dönük Uyumluluk (Public Endpoints) ---

class PublicAvailableSlotsView(APIView):
    """ Kamuya açık slot kontrolü (Eski arayüz uyumluluğu için) """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response([], status=status.HTTP_200_OK)
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response([], status=status.HTTP_200_OK)

        psychologist = Psychologist.objects.first()
        if not psychologist:
            return Response([], status=status.HTTP_200_OK)

        slots = get_available_slots_for_date(psychologist, target_date)
        return Response(slots, status=status.HTTP_200_OK)


# --- Danışan Profil & Doğrulama View'ları ---

class ClientProfileDetailView(APIView):
    """
    Giriş yapmış danışanın profil bilgilerini görüntülemesi ve temel bilgilerini (ad/soyad) güncellemesi.
    GET /api/client/profile/
    PUT /api/client/profile/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        client_profile = getattr(user, 'client_profile', None)

        booked_count = Appointment.objects.filter(client=client_profile, status='BOOKED').count() if client_profile else 0
        completed_count = Appointment.objects.filter(client=client_profile, status='COMPLETED').count() if client_profile else 0
        cancelled_count = Appointment.objects.filter(client=client_profile, status='CANCELLED').count() if client_profile else 0

        data = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': client_profile.phone if client_profile else '',
            'status': client_profile.status if client_profile else 'APPROVED',
            'status_display': client_profile.get_status_display() if client_profile else 'Onaylı',
            'created_at': client_profile.created_at if client_profile else user.date_joined,
            'stats': {
                'booked': booked_count,
                'completed': completed_count,
                'cancelled': cancelled_count,
                'total': booked_count + completed_count + cancelled_count
            }
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        serializer = ClientProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.first_name = serializer.validated_data['first_name']
        user.last_name = serializer.validated_data['last_name']
        user.save(update_fields=['first_name', 'last_name'])

        return Response({
            'message': 'Profil bilgileriniz başarıyla güncellendi.',
            'first_name': user.first_name,
            'last_name': user.last_name
        }, status=status.HTTP_200_OK)


class ClientSendVerificationCodeView(APIView):
    """
    Telefon, E-posta veya Şifre değişikliği için kayıtlı e-posta adresine 6 haneli doğrulama kodu gönderir.
    POST /api/client/profile/send-verification-code/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = SendVerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        purpose = serializer.validated_data['purpose']
        new_value = serializer.validated_data.get('new_value', '').strip()

        # Önceki kullanılmamış kodları geçersiz kıl
        EmailVerificationCode.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

        # 6 haneli rastgele OTP kodu üret
        code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        EmailVerificationCode.objects.create(
            user=user,
            code=code,
            purpose=purpose,
            new_value=new_value,
            expires_at=expires_at
        )

        # E-posta Başlığı ve İçeriği
        purpose_names = {
            'CHANGE_PHONE': 'Telefon Numarası Değişikliği',
            'CHANGE_EMAIL': 'E-posta Adresi Değişikliği',
            'CHANGE_PASSWORD': 'Şifre Değişikliği'
        }
        purpose_title = purpose_names.get(purpose, 'Hesap Doğrulama')

        subject = f"AyPsikoloji - {purpose_title} Doğrulama Kodunuz: {code}"
        message = (
            f"Merhaba {user.first_name or user.username},\n\n"
            f"AyPsikoloji hesabınızda '{purpose_title}' talebinde bulundunuz.\n\n"
            f"Doğrulama Kodunuz: {code}\n\n"
            f"Bu kod 10 dakika boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.\n\n"
            f"Sağlıklı günler dileriz,\nAyPsikoloji Ekibi"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aypsikoloji.com'),
                recipient_list=[user.email],
                fail_silently=False
            )
        except Exception as e:
            # Geliştirme/test ortamında hata oluşsa bile konsola bastırılır
            print(f"[Email Send Log]: Code: {code} for {user.email} (Error: {e})")

        return Response({
            'message': f'6 haneli doğrulama kodunuz {user.email} adresine gönderildi.',
            'expires_in_minutes': 10
        }, status=status.HTTP_200_OK)


class ClientVerifyAndUpdateProfileView(APIView):
    """
    E-postaya gelen 6 haneli kodu doğrulayarak telefon, e-posta veya şifre güncellemesini tamamlar.
    POST /api/client/profile/verify-and-update/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = VerifyAndUpdateProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        purpose = serializer.validated_data['purpose']
        code = serializer.validated_data['code']
        new_value = serializer.validated_data.get('new_value', '').strip()
        new_password = serializer.validated_data.get('new_password', '')

        # Kodu doğrula
        verification = EmailVerificationCode.objects.filter(
            user=user,
            purpose=purpose,
            code=code,
            is_used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not verification:
            return Response({
                'error': 'Geçersiz veya süresi dolmuş doğrulama kodu. Lütfen tekrar kod talep ediniz.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Telefon Numarası Güncelleme
        if purpose == 'CHANGE_PHONE':
            phone_to_set = new_value or verification.new_value
            if not phone_to_set:
                return Response({'error': 'Yeni telefon numarası belirtilmedi.'}, status=status.HTTP_400_BAD_REQUEST)

            cleaned_phone = re.sub(r'\D', '', phone_to_set)
            if cleaned_phone.startswith('90') and len(cleaned_phone) == 12:
                cleaned_phone = '0' + cleaned_phone[2:]
            elif len(cleaned_phone) == 10 and cleaned_phone.startswith('5'):
                cleaned_phone = '0' + cleaned_phone

            if len(cleaned_phone) != 11 or not cleaned_phone.startswith('05'):
                return Response({'error': 'Geçerli bir telefon numarası giriniz (Örn: 05XXXXXXXXX, 11 haneli olmalıdır).'}, status=status.HTTP_400_BAD_REQUEST)

            if ClientProfile.objects.filter(phone=cleaned_phone).exclude(user=user).exists():
                return Response({'error': 'Bu telefon numarası başka bir danışan tarafından kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)

            client_profile = getattr(user, 'client_profile', None)
            if client_profile:
                client_profile.phone = cleaned_phone
                client_profile.save(update_fields=['phone'])

            msg = 'Telefon numaranız başarıyla güncellendi.'


        # 2. E-posta Adresi Güncelleme
        elif purpose == 'CHANGE_EMAIL':
            email_to_set = (new_value or verification.new_value).lower()
            if not email_to_set:
                return Response({'error': 'Yeni e-posta adresi belirtilmedi.'}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(email__iexact=email_to_set).exclude(pk=user.pk).exists():
                return Response({'error': 'Bu e-posta adresi ile kayıtlı başka bir hesap bulunmaktadır.'}, status=status.HTTP_400_BAD_REQUEST)

            old_email = user.email.lower() if user.email else ""
            user.email = email_to_set

            # Eğer kullanıcının username'i eski e-posta formatındaysa ve yeni e-posta başka bir username ile çakışmıyorsa, username'i de güncelle
            update_fields = ['email']
            if (user.username.lower() == old_email or '@' in user.username) and not User.objects.filter(username__iexact=email_to_set).exclude(pk=user.pk).exists():
                user.username = email_to_set
                update_fields.append('username')

            user.save(update_fields=update_fields)
            msg = 'E-posta adresiniz başarıyla güncellendi.'


        # 3. Şifre Güncelleme
        elif purpose == 'CHANGE_PASSWORD':
            if not new_password or len(new_password) < 6:
                return Response({'error': 'Yeni şifre en az 6 karakter olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

            if user.check_password(new_password):
                return Response({
                    'error': 'Yeni şifreniz mevcut şifrenizle aynı olamaz. Lütfen farklı bir şifre belirleyiniz.'
                }, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save()
            update_session_auth_hash(request, user) # Oturumun düşmesini engelle
            msg = 'Şifreniz başarıyla değiştirildi.'


        else:
            return Response({'error': 'Bilinmeyen işlem türü.'}, status=status.HTTP_400_BAD_REQUEST)

        # Kodu kullanıldı olarak işaretle
        verification.is_used = True
        verification.save(update_fields=['is_used'])

        client_profile = getattr(user, 'client_profile', None)
        return Response({
            'message': msg,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': client_profile.phone if client_profile else ''
            }
        }, status=status.HTTP_200_OK)


class SiteContentView(APIView):
    """ Hakkımda ve İletişim sayfaları içeriklerini okuma (herkes) ve güncelleme (psikolog) """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        site_content = SiteContent.load()
        serializer = SiteContentSerializer(site_content)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        # Sadece psikolog veya yetkili personel güncelleyebilir
        user = request.user
        if not (hasattr(user, 'psychologist_profile') or user.is_staff or user.is_superuser):
            return Response({'error': 'Bu işlem için yetkiniz bulunmamaktadır.'}, status=status.HTTP_403_FORBIDDEN)

        site_content = SiteContent.load()
        serializer = SiteContentSerializer(site_content, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Sayfa içerikleri başarıyla güncellendi.',
                'site_content': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



