from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Psychologist,
    ClientProfile,
    WeeklySchedule,
    DateOverride,
    Appointment,
    CancelledAppointmentLog
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ClientProfile
        fields = ['id', 'user', 'phone', 'status', 'status_display', 'created_by_psychologist', 'notes', 'created_at', 'approved_at']


class ClientRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=20, required=True)
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=True)
    password = serializers.CharField(write_only=True, min_length=6, required=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu e-posta adresi ile kayıtlı bir hesap zaten var.")
        return value

    def validate_phone(self, value):
        if ClientProfile.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon numarası ile kayıtlı bir hesap zaten var.")
        return value

    def create(self, validated_data):
        email = validated_data['email'].lower()
        username = validated_data.get('username') or email
        if User.objects.filter(username=username).exists():
            username = f"{email}_{User.objects.count()}"

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        client_profile = ClientProfile.objects.create(
            user=user,
            phone=validated_data['phone'],
            status='PENDING', # Onay bekliyor
            created_by_psychologist=False
        )
        return client_profile


class ManualClientCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=True)
    phone = serializers.CharField(max_length=20, required=True)
    email = serializers.EmailField(required=True)
    notes = serializers.CharField(allow_blank=True, required=False, default="")
    password = serializers.CharField(write_only=True, min_length=6, required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu e-posta adresi zaten kullanımda.")
        return value

    def validate_phone(self, value):
        if ClientProfile.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon numarası zaten kullanımda.")
        return value

    def create(self, validated_data):
        email = validated_data['email'].lower()
        password = validated_data.get('password') or validated_data['phone'] # varsayılan şifre telefon numarası
        username = email

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        client_profile = ClientProfile.objects.create(
            user=user,
            phone=validated_data['phone'],
            status='APPROVED', # Psikolog manuel eklediği için doğrudan onaylı
            created_by_psychologist=True,
            notes=validated_data.get('notes', '')
        )
        client_profile.approve()
        return client_profile


class PsychologistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Psychologist
        fields = ['id', 'user', 'title', 'bio', 'phone', 'slot_duration_minutes', 'break_duration_minutes']


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ['id', 'day_of_week', 'day_name', 'start_time', 'end_time', 'is_active']


class DateOverrideSerializer(serializers.ModelSerializer):
    override_type_display = serializers.CharField(source='get_override_type_display', read_only=True)

    class Meta:
        model = DateOverride
        fields = ['id', 'date', 'override_type', 'override_type_display', 'start_time', 'end_time', 'reason']


class AppointmentSerializer(serializers.ModelSerializer):
    client = ClientProfileSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'psychologist', 'client',
            'user_name', 'user_surname', 'phone',
            'date', 'time', 'end_time',
            'status', 'status_display',
            'client_notes', 'psychologist_notes',
            'created_at'
        ]
        read_only_fields = ['id', 'psychologist', 'client', 'created_at']


class ClientCreateAppointmentSerializer(serializers.Serializer):
    date = serializers.DateField(required=True)
    time = serializers.TimeField(required=True)
    client_notes = serializers.CharField(required=False, allow_blank=True, default="")