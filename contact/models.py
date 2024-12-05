from django.db import models

# Create your models here.
class Contacts(models.Model):
    phone_number = models.CharField(max_length=11, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    x_link = models.URLField(blank=True, null=True)
    instagram_link = models.URLField(blank=True, null=True)
    youtube_link = models.URLField(blank=True, null=True)
    linkedin_link = models.URLField(blank=True, null=True)

    def __str__(self):
        return "İletişim Bilgileri"

    class Meta:
        verbose_name = "İletişim Bilgileri"
        verbose_name_plural = "İletişim Bilgileri"


