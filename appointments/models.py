from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Psychologist(models.Model):
    """ Psikolog profil modeli """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='psychologist_profile')
    title = models.CharField(max_length=100, default="Uzman Klinik Psikolog")
    bio = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    slot_duration_minutes = models.PositiveIntegerField(default=50, help_text="Seans süresi (dakika)")
    break_duration_minutes = models.PositiveIntegerField(default=10, help_text="Mola süresi (dakika)")

    def __str__(self):
        full_name = self.user.get_full_name()
        return full_name if full_name else self.user.username

    class Meta:
        verbose_name = "Psikolog"
        verbose_name_plural = "Psikologlar"


class ClientProfile(models.Model):
    """ Danışan profil ve onay takip modeli """
    STATUS_CHOICES = [
        ('PENDING', 'Onay Bekliyor'),
        ('APPROVED', 'Onaylandı'),
        ('REJECTED', 'Reddedildi'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    phone = models.CharField(max_length=20, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    created_by_psychologist = models.BooleanField(default=False, help_text="Psikolog tarafından manuel mi oluşturuldu")
    notes = models.TextField(blank=True, default="", help_text="Psikoloğun danışan ile ilgili özel notları")
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_approved(self):
        return self.status == 'APPROVED'

    def approve(self):
        self.status = 'APPROVED'
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_at'])

    def reject(self):
        self.status = 'REJECTED'
        self.save(update_fields=['status'])

    def __str__(self):
        full_name = self.user.get_full_name() or self.user.username
        return f"{full_name} ({self.get_status_display()}) - {self.phone}"

    class Meta:
        verbose_name = "Danışan Profili"
        verbose_name_plural = "Danışan Profilleri"


class WeeklySchedule(models.Model):
    """ Psikoloğun haftanın 7 günü için varsayılan çalışma saatleri şablonu """
    DAYS_OF_WEEK = [
        (0, 'Pazartesi'),
        (1, 'Salı'),
        (2, 'Çarşamba'),
        (3, 'Perşembe'),
        (4, 'Cuma'),
        (5, 'Cumartesi'),
        (6, 'Pazar'),
    ]

    psychologist = models.ForeignKey(Psychologist, on_delete=models.CASCADE, related_name='weekly_schedules')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField(default="09:00")
    end_time = models.TimeField(default="18:00")
    is_active = models.BooleanField(default=True, help_text="Bu gün seans kabul ediliyor mu?")

    class Meta:
        unique_together = ('psychologist', 'day_of_week')
        ordering = ['day_of_week']
        verbose_name = "Haftalık Çalışma Şablonu"
        verbose_name_plural = "Haftalık Çalışma Şablonları"

    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK).get(self.day_of_week, str(self.day_of_week))
        durum = f"{self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}" if self.is_active else "Kapalı"
        return f"{self.psychologist} - {day_name}: {durum}"


class DateOverride(models.Model):
    """ Belirli bir tarihe özel istisnalar (izinli / tatil veya özel saatler) """
    OVERRIDE_TYPE_CHOICES = [
        ('OFF', 'İzinli / Kapalı'),
        ('CUSTOM', 'Özel Çalışma Saatleri'),
    ]

    psychologist = models.ForeignKey(Psychologist, on_delete=models.CASCADE, related_name='date_overrides')
    date = models.DateField(db_index=True)
    override_type = models.CharField(max_length=10, choices=OVERRIDE_TYPE_CHOICES, default='OFF')
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        unique_together = ('psychologist', 'date')
        verbose_name = "Özel Gün / İstisna"
        verbose_name_plural = "Özel Günler / İstisnalar"

    def __str__(self):
        return f"{self.psychologist} - {self.date} ({self.get_override_type_display()})"


class Appointment(models.Model):
    """ Danışan randevuları """
    STATUS_CHOICES = [
        ('BOOKED', 'Rezerve Edildi'),
        ('COMPLETED', 'Tamamlandı'),
        ('CANCELLED', 'İptal Edildi'),
    ]

    psychologist = models.ForeignKey(Psychologist, on_delete=models.CASCADE, related_name='appointments')
    client = models.ForeignKey(ClientProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')

    # Danışan bilgileri
    user_name = models.CharField(max_length=100)
    user_surname = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)

    date = models.DateField(db_index=True)
    time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BOOKED', db_index=True)
    client_notes = models.TextField(blank=True, default="")
    psychologist_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} {self.time} - {self.user_name} {self.user_surname} ({self.get_status_display()})"

    class Meta:
        ordering = ['-date', '-time']
        verbose_name = "Randevu"
        verbose_name_plural = "Randevular"


class CancelledAppointmentLog(models.Model):
    """ İptal edilen randevu kayıtları """
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='cancellation_log')
    cancelled_by = models.CharField(max_length=20, default="PSYCHOLOGIST") # PSYCHOLOGIST, CLIENT, SYSTEM
    cancelled_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, null=True)
    client_notified = models.BooleanField(default=False)

    def __str__(self):
        return f"İptal: {self.appointment}"

    class Meta:
        verbose_name = "İptal Edilen Randevu Kaydı"
        verbose_name_plural = "İptal Edilen Randevu Kayıtları"


class EmailVerificationCode(models.Model):
    """ E-posta ile doğrulama kodları (Şifre, Telefon, E-posta değişiklikleri için) """
    PURPOSE_CHOICES = [
        ('CHANGE_PHONE', 'Telefon Değiştirme'),
        ('CHANGE_EMAIL', 'E-posta Değiştirme'),
        ('CHANGE_PASSWORD', 'Şifre Değiştirme'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_codes')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES)
    new_value = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at

    class Meta:
        ordering = ['-created_at']
        verbose_name = "E-posta Doğrulama Kodu"
        verbose_name_plural = "E-posta Doğrulama Kodları"

    def __str__(self):
        return f"{self.user.username} - {self.get_purpose_display()} ({self.code})"


class SiteContent(models.Model):
    """ Hakkımda ve İletişim sayfaları dinamik içerik modeli (Singleton) """
    DEFAULT_ABOUT_TEXT = (
        "Ben Aybike Yaren Topcuoğlu, Psikolog ve Aile Danışmanıyım. Lisans eğitimimi Sakarya Üniversitesi Psikoloji "
        "Bölümü’nde yüksek onur derecesi ile tamamladım. Şu anda Haliç Üniversitesi Tezli Psikoloji Yüksek Lisans "
        "Programı’nda uzmanlık eğitimime devam etmekteyim. Akademik hayatım boyunca araştırma projeleri, makale ve "
        "kitap çalışmaları içerisinde yer aldım; aynı zamanda birçok eğitim ve seminer vererek mesleki deneyimimi zenginleştirdim.\n\n"
        "Mesleki pratiğimde hem yetişkinlerle hem de çocuklarla çalışıyorum. Yetişkin danışanlarla özellikle duygudurum "
        "bozuklukları, kaygı (anksiyete) bozuklukları, obsesif kompulsif bozukluk, öfke kontrol güçlükleri, somatik "
        "bozukluklar, yeme bozuklukları üzerine yoğunlaşıyorum. Ayrıca aile ve ebeveyn danışmanlığı alanında da aktif olarak çalışmaktayım.\n\n"
        "Terapötik yaklaşımımda tek bir yönteme bağlı kalmaktan ziyade danışanın ihtiyacına göre farklı ekolleri bir "
        "araya getirmeyi önemsiyorum. Dinamik ve derinlemesine bakış açısını şefkatli bir şekilde harmanlarken, "
        "yapılandırılmış teknikleri de sürecin içine katıyorum. Böylece hem iç dünyadaki kök nedenlere dokunabilmeyi "
        "hem de gündelik yaşamda işlevselliği artırmayı hedefliyorum.\n\n"
        "Bugüne kadar iki anaokulunda kurum psikoloğu olarak görev aldım, atölye çalışmaları düzenledim ve çocuk, ergen, "
        "yetişkin danışanlarla klinik deneyim kazandım. Aynı zamanda topluluk çalışmalarım, deprem sonrası psikososyal "
        "destek faaliyetlerim ve hastane okulu projelerim bana çok yönlü bir saha deneyimi kattı.\n\n"
        "Mesleğe bakışımda en çok önem verdiğim şey; insanın içsel yolculuğunda yanında güvenle eşlik edebilmek. "
        "Her bireyin kendi hikâyesiyle değerli olduğuna inanıyor ve bu yolculukta bilimsel, etik ve insancıl bir yaklaşımı rehber ediniyorum."
    )

    full_name = models.CharField(max_length=150, default="Aybike Yaren Topcuoğlu", verbose_name="Ad Soyad")
    title = models.CharField(max_length=150, default="Psikolog ve Aile Danışmanı", verbose_name="Unvan")
    profile_image = models.TextField(blank=True, default="", verbose_name="Profil Fotoğrafı (Base64 veya URL)")
    
    # Hakkımda
    about_text = models.TextField(default=DEFAULT_ABOUT_TEXT, verbose_name="Hakkımda Metni")
    
    # İletişim
    contact_email = models.EmailField(default="psikologaybikeyaren@gmail.com", verbose_name="İletişim E-postası")
    contact_phone = models.CharField(max_length=50, blank=True, default="", verbose_name="İletişim Telefonu")
    address = models.CharField(max_length=255, blank=True, default="", verbose_name="Adres")
    instagram_url = models.URLField(blank=True, default="https://www.instagram.com/psikologaybiketopcuoglu", verbose_name="Instagram Linki")
    linkedin_url = models.URLField(blank=True, default="", verbose_name="LinkedIn Linki")
    
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Son Güncelleme")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    class Meta:
        verbose_name = "Sayfa İçerikleri (Hakkımda & İletişim)"
        verbose_name_plural = "Sayfa İçerikleri"

    def __str__(self):
        return f"Sayfa İçerikleri ({self.full_name})"


