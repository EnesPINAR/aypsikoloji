from django.contrib import admin
from appointments.models import Psychologist, WorkingSlot, Appointment
# Register your models here.


admin.site.register(Psychologist)
admin.site.register(WorkingSlot)
admin.site.register(Appointment)