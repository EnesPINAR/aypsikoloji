from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from appointments.models import Psychologist, WeeklySchedule, ClientProfile
from datetime import time

class Command(BaseCommand):
    help = 'Sistem için varsayılan psikolog hesabını ve 7 günlük çalışma takvimini oluşturur.'

    def handle(self, *args, **options):
        # 1. Psikolog Hesabı
        psych_user, created = User.objects.get_or_create(
            username='psikolog',
            defaults={
                'email': 'psikolog@aypsikoloji.com',
                'first_name': 'Aybike Yaren',
                'last_name': 'Topcuoğlu',
                'is_staff': True,
                'is_superuser': True,
            }
        )

        if created:
            psych_user.set_password('psikolog123')
            psych_user.save()
            self.stdout.write(self.style.SUCCESS(f'Psikolog kullanıcısı oluşturuldu (Kullanıcı adı: psikolog, Şifre: psikolog123)'))

        psychologist, p_created = Psychologist.objects.get_or_create(
            user=psych_user,
            defaults={
                'title': 'Uzman Klinik Psikolog',
                'phone': '05551234567',
                'slot_duration_minutes': 50,
                'break_duration_minutes': 10
            }
        )

        # 2. 7 Günlük Haftalık Çalışma Şablonu (Pzt - Cuma 09:00 - 18:00, Cumartesi 10:00 - 15:00, Pazar kapalı)
        days_config = [
            (0, time(9, 0), time(18, 0), True),
            (1, time(9, 0), time(18, 0), True),
            (2, time(9, 0), time(18, 0), True),
            (3, time(9, 0), time(18, 0), True),
            (4, time(9, 0), time(18, 0), True),
            (5, time(10, 0), time(15, 0), True),
            (6, time(9, 0), time(18, 0), False),
        ]

        for day_id, start_t, end_t, is_act in days_config:
            WeeklySchedule.objects.update_or_create(
                psychologist=psychologist,
                day_of_week=day_id,
                defaults={
                    'start_time': start_t,
                    'end_time': end_t,
                    'is_active': is_act
                }
            )

        self.stdout.write(self.style.SUCCESS('Haftalık 7 günlük çalışma şablonu başarıyla tanımlandı.'))
