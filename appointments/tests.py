from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, time, timedelta
from rest_framework.test import APIClient
from rest_framework import status

from appointments.models import (
    Psychologist,
    ClientProfile,
    WeeklySchedule,
    DateOverride,
    Appointment,
    CancelledAppointmentLog,
    EmailVerificationCode
)

from appointments.views import get_available_slots_for_date


class AppointmentSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Psikolog kullanıcısı oluştur
        self.psych_user = User.objects.create_superuser(
            username='psikolog',
            email='psikolog@aypsikoloji.com',
            password='Password123!',
            first_name='Ayşe',
            last_name='Yılmaz'
        )
        self.psychologist = Psychologist.objects.create(
            user=self.psych_user,
            title='Uzman Klinik Psikolog',
            phone='05551112233'
        )

        # 7 Günlük çalışma şablonu oluştur (Pazartesi-Cuma 09:00 - 17:00, Cumartesi-Pazar kapalı)
        for day in range(7):
            WeeklySchedule.objects.create(
                psychologist=self.psychologist,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(17, 0),
                is_active=(day < 5)
            )

        # 2. Danışan 1: Onaylı Danışan
        self.approved_client_user = User.objects.create_user(
            username='onayli@gmail.com',
            email='onayli@gmail.com',
            password='ClientPassword123!',
            first_name='Mehmet',
            last_name='Kaya'
        )
        self.approved_client_profile = ClientProfile.objects.create(
            user=self.approved_client_user,
            phone='05321112233',
            status='APPROVED'
        )

        # 3. Danışan 2: Onay Bekleyen Danışan (PENDING)
        self.pending_client_user = User.objects.create_user(
            username='bekleyen@gmail.com',
            email='bekleyen@gmail.com',
            password='ClientPassword123!',
            first_name='Ali',
            last_name='Demir'
        )
        self.pending_client_profile = ClientProfile.objects.create(
            user=self.pending_client_user,
            phone='05332223344',
            status='PENDING'
        )

    def test_client_registration_creates_pending_status(self):
        """ Web sitesinden yeni kayıt olan danışan PENDING statüsünde olmalıdır """
        data = {
            'first_name': 'Zeynep',
            'last_name': 'Aydın',
            'email': 'zeynep@example.com',
            'phone': '05443332211',
            'password': 'Password123!'
        }
        response = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING')

        # Veritabanında kontrol
        profile = ClientProfile.objects.get(user__email='zeynep@example.com')
        self.assertEqual(profile.status, 'PENDING')
        self.assertFalse(profile.is_approved)

    def test_pending_client_cannot_access_client_slots_or_book(self):
        """ Onaylanmamış (PENDING) danışan randevu saatlerini görememeli ve randevu alamamalıdır """
        self.client.force_authenticate(user=self.pending_client_user)

        future_date = timezone.localdate() + timedelta(days=2)
        # Eğer haftasonuna denk gelirse pazartesiye ötele
        while future_date.weekday() >= 5:
            future_date += timedelta(days=1)

        # Slotları çekmeyi dene -> 403 Forbidden olmalı
        response = self.client.get(f'/api/client/available-slots/?date={future_date.strftime("%Y-%m-%d")}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Randevu oluşturmayı dene -> 403 Forbidden olmalı
        booking_data = {
            'date': future_date.strftime('%Y-%m-%d'),
            'time': '10:00',
            'client_notes': 'Deneme seansı'
        }
        book_res = self.client.post('/api/client/appointments/', booking_data, format='json')
        self.assertEqual(book_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_psychologist_can_approve_pending_client(self):
        """ Psikolog bekleyen danışanı onaylayabilmelidir """
        self.client.force_authenticate(user=self.psych_user)

        response = self.client.patch(
            f'/api/psychologist/clients/{self.pending_client_profile.id}/status/',
            {'status': 'APPROVED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.pending_client_profile.refresh_from_db()
        self.assertEqual(self.pending_client_profile.status, 'APPROVED')
        self.assertTrue(self.pending_client_profile.is_approved)

    def test_psychologist_can_manually_create_client(self):
        """ Psikoloğun manuel eklediği danışan doğrudan APPROVED olmalıdır """
        self.client.force_authenticate(user=self.psych_user)

        data = {
            'first_name': 'Fatma',
            'last_name': 'Öz',
            'email': 'fatma@example.com',
            'phone': '05559998877',
            'notes': 'Eski danışan referansı'
        }
        response = self.client.post('/api/psychologist/clients/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'APPROVED')

        profile = ClientProfile.objects.get(user__email='fatma@example.com')
        self.assertTrue(profile.created_by_psychologist)
        self.assertEqual(profile.status, 'APPROVED')

    def test_approved_client_can_view_slots_and_book_appointment(self):
        """ Onaylı danışan müsait saatleri görüp randevu alabilmelidir """
        self.client.force_authenticate(user=self.approved_client_user)

        # Gelecekteki bir iş günü bul
        future_date = timezone.localdate() + timedelta(days=3)
        while future_date.weekday() >= 5:
            future_date += timedelta(days=1)

        d_str = future_date.strftime('%Y-%m-%d')

        # 1. Slotları getir
        res_slots = self.client.get(f'/api/client/available-slots/?date={d_str}')
        self.assertEqual(res_slots.status_code, status.HTTP_200_OK)
        self.assertIn('10:00', res_slots.data)

        # 2. Randevu al
        book_res = self.client.post('/api/client/appointments/', {
            'date': d_str,
            'time': '10:00',
            'client_notes': 'Online görüşme talebi'
        }, format='json')
        self.assertEqual(book_res.status_code, status.HTTP_201_CREATED)

        # 3. Randevunun oluştuğunu ve o saatin artık müsait olmadığını kontrol et
        res_slots_after = self.client.get(f'/api/client/available-slots/?date={d_str}')
        self.assertNotIn('10:00', res_slots_after.data)

        # 4. Danışanın henüz tamamlanmamış randevusu varken farklı bir saate/güne de randevu alamaması kontrolü
        book_another_slot = self.client.post('/api/client/appointments/', {
            'date': d_str,
            'time': '11:00'
        }, format='json')
        self.assertEqual(book_another_slot.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('aktif bir randevunuz bulunmaktadır', book_another_slot.data.get('error', ''))

        # 5. Mevcut randevu tamamlandığında (veya iptal edildiğinde) yeni randevu alabilmesi kontrolü
        booked_app = Appointment.objects.get(client=self.approved_client_user.client_profile, status='BOOKED')
        booked_app.status = 'COMPLETED'
        booked_app.save()


        book_new_res = self.client.post('/api/client/appointments/', {
            'date': d_str,
            'time': '11:00'
        }, format='json')
        self.assertEqual(book_new_res.status_code, status.HTTP_201_CREATED)


    def test_psychologist_date_override_blocks_day(self):
        """ Psikoloğun kapattığı/tatil ilan ettiği günde danışana slot çıkmamalıdır """
        future_date = timezone.localdate() + timedelta(days=4)
        while future_date.weekday() >= 5:
            future_date += timedelta(days=1)

        # Psikolog bu günü OFF (kapalı) yapıyor
        DateOverride.objects.create(
            psychologist=self.psychologist,
            date=future_date,
            override_type='OFF',
            reason='Kongre Katılımı'
        )

        slots = get_available_slots_for_date(self.psychologist, future_date)
        self.assertEqual(slots, [])

    def test_weekly_schedule_bulk_update(self):
        """ Psikolog haftalık planını tek seferde güncelleyebilmelidir """
        self.client.force_authenticate(user=self.psych_user)

        new_schedule = [
            {'day_of_week': 0, 'start_time': '10:00', 'end_time': '16:00', 'is_active': True},
            {'day_of_week': 1, 'start_time': '11:00', 'end_time': '19:00', 'is_active': True},
            {'day_of_week': 2, 'start_time': '09:00', 'end_time': '18:00', 'is_active': False}, # Çarşamba kapalı
            {'day_of_week': 3, 'start_time': '10:00', 'end_time': '18:00', 'is_active': True},
            {'day_of_week': 4, 'start_time': '10:00', 'end_time': '18:00', 'is_active': True},
            {'day_of_week': 5, 'start_time': '10:00', 'end_time': '15:00', 'is_active': True}, # Cumartesi açık
            {'day_of_week': 6, 'start_time': '09:00', 'end_time': '18:00', 'is_active': False},
        ]

        response = self.client.put('/api/psychologist/weekly-schedule/bulk_update/', {'schedules': new_schedule}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Çarşambanın kapalı olduğunu kontrol et
        wednesday = WeeklySchedule.objects.get(psychologist=self.psychologist, day_of_week=2)
        self.assertFalse(wednesday.is_active)

        # Cumartesinin açık olduğunu kontrol et
        saturday = WeeklySchedule.objects.get(psychologist=self.psychologist, day_of_week=5)
        self.assertTrue(saturday.is_active)
        self.assertEqual(saturday.start_time.strftime('%H:%M'), '10:00')

    def test_client_can_update_basic_profile_names(self):
        """ Danışan ad ve soyadını profilinden güncelleyebilmelidir """
        self.client.force_authenticate(user=self.approved_client_user)

        res = self.client.put('/api/client/profile/', {
            'first_name': 'Ahmet Can',
            'last_name': 'Demir'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.approved_client_user.refresh_from_db()
        self.assertEqual(self.approved_client_user.first_name, 'Ahmet Can')
        self.assertEqual(self.approved_client_user.last_name, 'Demir')

    def test_client_can_change_phone_with_email_verification_code(self):
        """ Danışan telefon numarasını e-posta doğrulama kodu ile değiştirebilmelidir """
        self.client.force_authenticate(user=self.approved_client_user)

        # 1. Kod gönder
        send_res = self.client.post('/api/client/profile/send-verification-code/', {
            'purpose': 'CHANGE_PHONE',
            'new_value': '05441112233'
        }, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_200_OK)

        # Veritabanında oluşan kodu al
        code_obj = EmailVerificationCode.objects.filter(
            user=self.approved_client_user,
            purpose='CHANGE_PHONE',
            is_used=False
        ).first()
        self.assertIsNotNone(code_obj)
        self.assertEqual(len(code_obj.code), 6)

        # 2. Kodu doğrula ve telefonu güncelle
        verify_res = self.client.post('/api/client/profile/verify-and-update/', {
            'purpose': 'CHANGE_PHONE',
            'code': code_obj.code,
            'new_value': '05441112233'
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        # Telefonun güncellendiğini ve kodun kullanıldığını doğrula
        self.approved_client_user.client_profile.refresh_from_db()
        self.assertEqual(self.approved_client_user.client_profile.phone, '05441112233')
        code_obj.refresh_from_db()
        self.assertTrue(code_obj.is_used)


    def test_client_can_change_password_with_email_verification_code(self):
        """ Danışan şifresini e-posta doğrulama kodu ile değiştirebilmelidir """
        self.client.force_authenticate(user=self.approved_client_user)

        # 1. Kod gönder
        send_res = self.client.post('/api/client/profile/send-verification-code/', {
            'purpose': 'CHANGE_PASSWORD'
        }, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_200_OK)

        code_obj = EmailVerificationCode.objects.filter(
            user=self.approved_client_user,
            purpose='CHANGE_PASSWORD',
            is_used=False
        ).first()

        # 2. Kodu doğrula ve şifreyi güncelle
        verify_res = self.client.post('/api/client/profile/verify-and-update/', {
            'purpose': 'CHANGE_PASSWORD',
            'code': code_obj.code,
            'new_password': 'yeniGuvenliSifre123!'
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        # Yeni şifre ile giriş kontrolü
        self.client.logout()
        login_res = self.client.post('/api/auth/login/', {
            'username': self.approved_client_user.email,
            'password': 'yeniGuvenliSifre123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_client_cannot_set_same_password(self):
        """ Danışan mevcut şifresini yeni şifresi olarak belirleyememelidir """
        self.client.force_authenticate(user=self.approved_client_user)

        # 1. Kod gönder
        self.client.post('/api/client/profile/send-verification-code/', {
            'purpose': 'CHANGE_PASSWORD'
        }, format='json')

        code_obj = EmailVerificationCode.objects.filter(
            user=self.approved_client_user,
            purpose='CHANGE_PASSWORD',
            is_used=False
        ).first()

        # 2. Mevcut şifreyi (ClientPassword123!) tekrar yeni şifre olarak girmeye çalış
        verify_res = self.client.post('/api/client/profile/verify-and-update/', {
            'purpose': 'CHANGE_PASSWORD',
            'code': code_obj.code,
            'new_password': 'ClientPassword123!'  # Setup'taki mevcut şifre
        }, format='json')

        self.assertEqual(verify_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('aynı olamaz', verify_res.data.get('error', ''))

    def test_manual_client_login_with_email_and_phone(self):
        """ Psikoloğun manuel eklediği danışan hem e-postası hem de telefonu ile giriş yapabilmelidir """
        self.client.force_authenticate(user=self.psych_user)

        # 1. Psikolog manuel danışan ekler (şifre belirtmeden -> varsayılan telefon numarası)
        create_res = self.client.post('/api/psychologist/clients/', {
            'first_name': 'Zeynep',
            'last_name': 'Kaya',
            'phone': '05559876543',
            'email': 'zeynep@test.com',
            'notes': 'Manuel eklendi'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)

        self.client.logout()

        # 2. E-posta + Telefon şifresi ile giriş
        email_login = self.client.post('/api/auth/login/', {
            'username': ' zeynep@test.com ',  # Boşluklu e-posta
            'password': '05559876543'
        }, format='json')
        self.assertEqual(email_login.status_code, status.HTTP_200_OK)
        self.assertEqual(email_login.data['role'], 'client')
        self.assertTrue(email_login.data['is_approved'])

        self.client.logout()

        # 3. Telefon + Telefon şifresi ile giriş
        phone_login = self.client.post('/api/auth/login/', {
            'username': '0555 987 65 43',  # Formatlı telefon
            'password': '05559876543'
        }, format='json')
        self.assertEqual(phone_login.status_code, status.HTTP_200_OK)
        self.assertEqual(phone_login.data['role'], 'client')

    def test_site_content_get_public(self):
        """ Herkes (giriş yapmamış kullanıcı dahil) site içeriklerini görebilmelidir """
        self.client.logout()
        res = self.client.get('/api/site-content/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('full_name', res.data)
        self.assertIn('title', res.data)
        self.assertIn('about_text', res.data)
        self.assertIn('contact_email', res.data)

    def test_site_content_update_by_psychologist(self):
        """ Psikolog site içeriklerini güncelleyebilmelidir """
        self.client.force_authenticate(user=self.psych_user)
        update_data = {
            'full_name': 'Uzm. Psk. Aybike Yaren Topcuoğlu',
            'title': 'Klinik Psikolog & Aile Danışmanı',
            'contact_email': 'yeni.iletisim@gmail.com',
            'contact_phone': '05321112233',
            'address': 'Kadıköy, İstanbul',
            'instagram_url': 'https://instagram.com/yarenpsk',
            'linkedin_url': 'https://linkedin.com/in/yarentopcuoglu',
            'about_text': 'Yeni güncellenmiş biyografi metni.'
        }
        res = self.client.put('/api/site-content/', update_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['site_content']['full_name'], 'Uzm. Psk. Aybike Yaren Topcuoğlu')
        self.assertEqual(res.data['site_content']['contact_email'], 'yeni.iletisim@gmail.com')

    def test_site_content_update_by_client_forbidden(self):
        """ Normal bir danışan site içeriklerini güncelleyememelidir (403) """
        self.client.force_authenticate(user=self.approved_client_user)
        res = self.client.put('/api/site-content/', {'full_name': 'Hacker'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_psychologist_cannot_create_client_appointment(self):
        """ Psikolog hesabı /api/client/appointments/ üzerinden danışan randevusu alamaz (403) """
        self.client.force_authenticate(user=self.psych_user)
        target_date = (timezone.now().date() + timedelta(days=1)).strftime('%Y-%m-%d')
        res = self.client.post('/api/client/appointments/', {
            'date': target_date,
            'time': '10:00',
            'client_notes': 'Kendi kendime randevu'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_change_email_disables_login_with_old_email(self):
        """ E-posta değiştirildiğinde eski e-posta ile giriş yapılamamalı, sadece yeni e-posta çalışmalıdır """
        # 1. approved_client_user e-postası: testclient@test.com
        user = self.approved_client_user
        old_email = user.email

        # 2. Doğrulama kodu oluştur
        from appointments.models import EmailVerificationCode
        code_obj = EmailVerificationCode.objects.create(
            user=user,
            code='123456',
            purpose='CHANGE_EMAIL',
            new_value='yenidanisan@test.com',
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        # 3. Kodu doğrula ve e-postayı güncelle
        self.client.force_authenticate(user=user)
        update_res = self.client.post('/api/client/profile/verify-and-update/', {
            'purpose': 'CHANGE_EMAIL',
            'code': '123456',
            'new_value': 'yenidanisan@test.com'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        self.client.logout()

        # 4. Eski e-posta ile giriş dene -> 401 HATA dönmeli
        old_login = self.client.post('/api/auth/login/', {
            'username': old_email,
            'password': 'ClientPassword123!'
        }, format='json')
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5. Yeni e-posta ile giriş dene -> 200 BAŞARILI dönmeli
        new_login = self.client.post('/api/auth/login/', {
            'username': 'yenidanisan@test.com',
            'password': 'ClientPassword123!'
        }, format='json')
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_phone_number_length_validation(self):
        """ Telefon numarası çok uzun veya geçersiz olduğunda reddedilmelidir """
        self.client.force_authenticate(user=self.psych_user)

        # 1. Aşırı uzun telefon numarası (sonsuz numara)
        res_too_long = self.client.post('/api/psychologist/clients/', {
            'first_name': 'Ali',
            'last_name': 'Veli',
            'phone': '055512345678901234567890',
            'email': 'ali@test.com'
        }, format='json')
        self.assertEqual(res_too_long.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Çok kısa telefon numarası
        res_too_short = self.client.post('/api/psychologist/clients/', {
            'first_name': 'Ali',
            'last_name': 'Veli',
            'phone': '0555',
            'email': 'ali2@test.com'
        }, format='json')
        self.assertEqual(res_too_short.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Geçerli 11 haneli telefon numarası kabul edilmeli
        res_valid = self.client.post('/api/psychologist/clients/', {
            'first_name': 'Ali',
            'last_name': 'Veli',
            'phone': '05551234599',
            'email': 'ali3@test.com'
        }, format='json')
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)









