from rest_framework import serializers
from .models import Psychologist, WorkingSlot, Appointment

class WorkingSlotSerializer(serializers.ModelSerializer):
    """ Psikoloğun çalışma slotlarını oluşturması ve listelemesi için. """
    class Meta:
        model = WorkingSlot
        fields = ['id', 'date', 'start_time', 'end_time']
        # psychologist alanı, isteği yapan kullanıcıdan otomatik alınacak.

class AppointmentSerializer(serializers.ModelSerializer):
    """ Müşterinin randevu oluşturması için. """
    class Meta:
        model = Appointment
        # `psychologist` ve `working_slot` URL'den veya view'dan gelecek.
        fields = ['id', 'user_name', 'user_surname', 'phone', 'date', 'time', 'status']
        read_only_fields = ['status'] # Status sadece backend'de değiştirilmeli.

class PsychologistAppointmentSerializer(serializers.ModelSerializer):
    """ Psikoloğun kendi randevularını görmesi için detaylı serializer. """
    class Meta:
        model = Appointment
        fields = ['id', 'user_name', 'user_surname', 'phone', 'date', 'time', 'status']