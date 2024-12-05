from django.contrib import admin
from .models import Contacts

# Register your models here.

class ContactsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        if Contacts.objects.count() == 0:
            return True
        else:
            return False

admin.site.register(Contacts, ContactsAdmin)