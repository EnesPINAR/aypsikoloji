import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  CalendarDays,
  RotateCcw,
  ListFilter,
  Upload,
  Trash2,
  Instagram,
  Linkedin,
  MapPin,
} from "lucide-react";
import profilePic from "@/assets/pp.webp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDateToYMD, parseYMDToDate } from "@/lib/utils";
import { validators, formatApiErrorMessage } from "@/lib/validation";



const DAYS_OF_WEEK = [
  { id: 0, label: "Pazartesi" },
  { id: 1, label: "Salı" },
  { id: 2, label: "Çarşamba" },
  { id: 3, label: "Perşembe" },
  { id: 4, label: "Cuma" },
  { id: 5, label: "Cumartesi" },
  { id: 6, label: "Pazar" },
];

export function PsychologistDashboard() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"schedule" | "calendar" | "clients" | "content">("schedule");
  const [loading, setLoading] = useState(false);

  // --- 1. Haftalık Planlama State ---
  const [weeklySchedules, setWeeklySchedules] = useState<any[]>([]);
  const [dateOverrides, setDateOverrides] = useState<any[]>([]);
  const [newOverride, setNewOverride] = useState({
    date: "",
    override_type: "OFF",
    start_time: "09:00",
    end_time: "18:00",
    reason: "",
  });

  // --- 2. Takvim & Randevular State ---
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);

  // --- 3. Danışan Yönetimi State ---
  const [clients, setClients] = useState<any[]>([]);
  const [pendingClients, setPendingClients] = useState<any[]>([]);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    notes: "",
  });

  // --- 4. Sayfa İçerikleri (Hakkımda & İletişim) State ---
  const [siteContent, setSiteContent] = useState({
    full_name: "",
    title: "",
    profile_image: "",
    about_text: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    instagram_url: "",
    linkedin_url: "",
  });
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);



  // Auth protection check
  useEffect(() => {
    if (!authLoading && (!user || role !== "psychologist")) {
      toast.error("Bu sayfaya erişim yetkiniz yok.");
      navigate("/giris", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  // CSRF Token alma
  const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  };

  // Verileri yükle
  const fetchWeeklySchedule = async () => {
    try {
      const res = await fetch("/api/psychologist/weekly-schedule/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // 7 günü sıralı dizi yap
        const sorted = DAYS_OF_WEEK.map((day) => {
          const found = data.find((d: any) => d.day_of_week === day.id);
          return (
            found || {
              day_of_week: day.id,
              start_time: "09:00",
              end_time: "18:00",
              is_active: day.id < 5,
            }
          );
        });
        setWeeklySchedules(sorted);
      }
    } catch (e) {
      console.error("Fetch schedule error:", e);
    }
  };

  const fetchDateOverrides = async () => {
    try {
      const res = await fetch("/api/psychologist/date-overrides/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDateOverrides(data);
      }
    } catch (e) {
      console.error("Fetch overrides error:", e);
    }
  };

  const fetchCalendarOverview = async (offset = 0) => {
    setLoading(true);
    try {
      const today = new Date();
      const dayOfWeek = (today.getDay() + 6) % 7; // 0: Pazartesi, 6: Pazar
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + offset * 7);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

      const startStr = formatDateToYMD(monday);
      const endStr = formatDateToYMD(sunday);

      const res = await fetch(
        `/api/psychologist/calendar-overview/?start_date=${startStr}&end_date=${endStr}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data);
      }
    } catch (e) {
      console.error("Fetch calendar error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const res = await fetch("/api/psychologist/appointments/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAllAppointments(data);
      }
    } catch (e) {
      console.error("Fetch all appointments error:", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/psychologist/clients/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClients(data.filter((c: any) => c.status === "APPROVED"));
        setPendingClients(data.filter((c: any) => c.status === "PENDING"));
      }
    } catch (e) {
      console.error("Fetch clients error:", e);
    }
  };

  useEffect(() => {
    if (user && role === "psychologist") {
      fetchWeeklySchedule();
      fetchDateOverrides();
      fetchCalendarOverview(currentWeekOffset);
      fetchAllAppointments();
      fetchClients();
    }
  }, [user, role]);

  // --- 1. HAFTALIK PLANLAMA EYLEMLERİ ---
  const handleScheduleDayChange = (dayIndex: number, field: string, value: any) => {
    const updated = [...weeklySchedules];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    setWeeklySchedules(updated);
  };

  const handleSaveWeeklySchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/psychologist/weekly-schedule/bulk_update/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ schedules: weeklySchedules }),
      });

      if (res.ok) {
        toast.success("Haftalık çalışma planınız başarıyla kaydedildi!");
        fetchWeeklySchedule();
        fetchCalendarOverview(currentWeekOffset);
      } else {
        toast.error("Haftalık plan kaydedilemedi.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOverride.date) {
      toast.error("Lütfen tarih seçiniz.");
      return;
    }

    try {
      const res = await fetch("/api/psychologist/date-overrides/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(newOverride),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.affected_appointments_count > 0) {
          toast.warning("Özel İzin Eklendi (Mevcut Randevular Var!)", {
            description: `Bu tarihte önceden alınmış ${data.affected_appointments_count} randevu bulunmaktadır: ${data.affected_clients.join(", ")}. Lütfen bu danışanlarla iletişime geçiniz.`,
            duration: 8000,
          });
        } else {
          toast.success("Özel gün / tatil tanımı eklendi.");
        }
        setNewOverride({
          date: "",
          override_type: "OFF",
          start_time: "09:00",
          end_time: "18:00",
          reason: "",
        });
        fetchDateOverrides();
        fetchCalendarOverview(currentWeekOffset);
        fetchAllAppointments();
      } else {
        toast.error("Eklenirken bir hata oluştu.");
      }

    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleDeleteOverride = async (id: number) => {
    try {
      const res = await fetch(`/api/psychologist/date-overrides/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCsrfToken() },
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Özel gün silindi.");
        fetchDateOverrides();
        fetchCalendarOverview(currentWeekOffset);
      }
    } catch (e) {
      toast.error("Silinemedi.");
    }
  };

  // --- 2. DANIŞAN EYLEMLERİ ---
  const handleApproveClient = async (clientId: number) => {
    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}/status/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        toast.success("Danışan başarıyla onaylandı!");
        fetchClients();
      } else {
        toast.error("Onaylama işlemi başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleRejectClient = async (clientId: number) => {
    if (!confirm("Danışan başvurusunu reddetmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}/status/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ status: "REJECTED" }),
      });

      if (res.ok) {
        toast.info("Danışan başvurusu reddedildi.");
        fetchClients();
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleCreateManualClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Biçimsel girdi doğrulaması (Client-side validation)
    const firstNameErr = validators.name(newClientData.first_name, "Danışan Adı");
    if (firstNameErr) {
      toast.error(firstNameErr);
      return;
    }
    const lastNameErr = validators.name(newClientData.last_name, "Danışan Soyadı");
    if (lastNameErr) {
      toast.error(lastNameErr);
      return;
    }

    const phoneErr = validators.phone(newClientData.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    const emailErr = validators.email(newClientData.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    const trimmedPassword = newClientData.password.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      toast.error("Şifre belirlenecekse en az 6 karakter olmalıdır.");
      return;
    }

    const payload = {
      first_name: newClientData.first_name.trim(),
      last_name: newClientData.last_name.trim(),
      phone: newClientData.phone.trim(),
      email: newClientData.email.trim().toLowerCase(),
      notes: newClientData.notes.trim(),
      ...(trimmedPassword ? { password: trimmedPassword } : {}),
    };

    try {
      const res = await fetch("/api/psychologist/clients/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Yeni danışan başarıyla oluşturuldu ve onaylandı!", {
          description: `Giriş E-postası: ${payload.email} | Şifre: ${trimmedPassword || payload.phone}`,
          duration: 6000,
        });
        setShowAddClientModal(false);
        setNewClientData({
          first_name: "",
          last_name: "",
          phone: "",
          email: "",
          password: "",
          notes: "",
        });
        fetchClients();
      } else {

        const errorMsg = formatApiErrorMessage(data, "Danışan eklenemedi.");
        toast.error(errorMsg);
      }

    } catch (e) {
      toast.error("Bağlantı hatası.");

    }
  };

  // --- 3. RANDEVU EYLEMLERİ ---
  const handleCancelAppointment = async (appointmentId: number) => {
    const reason = prompt("İptal nedeni (opsiyonel):", "Psikolog tarafından iptal edildi.");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/psychologist/appointments/${appointmentId}/cancel/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        toast.success("Randevu iptal edildi.");
        fetchCalendarOverview(currentWeekOffset);
        fetchAllAppointments();
      } else {
        toast.error("Randevu iptal edilemedi.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleCompleteAppointment = async (appointmentId: number) => {
    try {
      const res = await fetch(`/api/psychologist/appointments/${appointmentId}/complete/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Seans tamamlandı olarak kaydedildi.");
        fetchCalendarOverview(currentWeekOffset);
        fetchAllAppointments();
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  // --- 4. SAYFA İÇERİKLERİ (HAKKIMDA & İLETİŞİM) İŞLEMLERİ ---
  const fetchSiteContent = async () => {
    setContentLoading(true);
    try {
      const res = await fetch("/api/site-content/");
      if (res.ok) {
        const data = await res.json();
        setSiteContent({
          full_name: data.full_name || "",
          title: data.title || "",
          profile_image: data.profile_image || "",
          about_text: data.about_text || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          address: data.address || "",
          instagram_url: data.instagram_url || "",
          linkedin_url: data.linkedin_url || "",
        });
      }
    } catch (e) {
      console.error("fetchSiteContent error:", e);
    } finally {
      setContentLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Görsel boyutu en fazla 2 MB olmalıdır.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSiteContent((prev) => ({ ...prev, profile_image: reader.result as string }));
      toast.success("Profil görseli yüklendi. Değişiklikleri kaydetmeyi unutmayınız.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setContentSaving(true);
    try {
      const res = await fetch("/api/site-content/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(siteContent),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Hakkımda ve İletişim sayfası içerikleri başarıyla güncellendi!");
      } else {
        const errorMsg = Object.values(data).flat().join(" ") || "Kaydedilirken bir hata oluştu.";
        toast.error(errorMsg);
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setContentSaving(false);
    }
  };


  const todayStr = formatDateToYMD(new Date());

  return (
    <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="text-primary" size={32} /> Psikolog Yönetim Portalı
          </h1>
          <p className="text-muted-foreground mt-1">
            Haftalık çalışma saatlerinizi belirleyin, danışan başvurularını onaylayın ve randevuları yönetin.
          </p>
        </div>

        {/* Quick Badges */}
        <div className="flex items-center gap-3">
          {pendingClients.length > 0 && (
            <div
              onClick={() => setActiveTab("clients")}
              className="cursor-pointer bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-semibold animate-pulse"
            >
              <AlertCircle size={16} />
              <span>{pendingClients.length} Onay Bekleyen Danışan</span>
            </div>
          )}
          <Button onClick={() => setShowAddClientModal(true)} className="gap-2">
            <UserPlus size={16} /> Danışan Ekle
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b mb-6 gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === "schedule"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={16} className="shrink-0" />
          <span>Hafta Programı<span className="hidden sm:inline"> & İzinler</span></span>
        </button>
        <button
          onClick={() => {
            setActiveTab("calendar");
            fetchCalendarOverview(currentWeekOffset);
            fetchAllAppointments();
          }}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === "calendar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarIcon size={16} className="shrink-0" />
          <span>
            <span className="sm:hidden">Takvim & Seanslar</span>
            <span className="hidden sm:inline">Randevu Takvimi & Seanslar</span>{" "}
            ({allAppointments.filter(a => a.status === 'BOOKED').length} Aktif)
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("clients");
            fetchClients();
          }}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 relative shrink-0 whitespace-nowrap ${
            activeTab === "clients"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users size={16} className="shrink-0" />
          <span>Danışanlar<span className="hidden sm:inline"> & Onaylar</span></span>
          {pendingClients.length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {pendingClients.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("content");
            fetchSiteContent();
          }}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === "content"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} className="shrink-0" />
          <span>Sayfa İçerikleri<span className="hidden sm:inline"> (Hakkımda & İletişim)</span></span>
        </button>
      </div>



      {/* ================= TAB 1: HAFTA PROGRAMLAMA ================= */}
      {activeTab === "schedule" && (
        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Haftalık Sabit Çalışma Şablonu</CardTitle>
                <CardDescription>
                  Haftanın her günü için seans kabul edip etmediğinizi ve çalışma saatlerinizi belirleyin. Değişiklik yaptıktan sonra <strong>"Planı Kaydet"</strong> butonuna basınız.
                </CardDescription>
              </div>
              <Button onClick={handleSaveWeeklySchedule} disabled={loading} className="gap-2 shrink-0 w-full sm:w-auto">
                <Save size={16} /> {loading ? "Kaydediliyor..." : "Planı Kaydet"}
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="divide-y border rounded-lg">
                {weeklySchedules.map((schedule, idx) => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.id === schedule.day_of_week)?.label;
                  return (
                    <div
                      key={schedule.day_of_week}
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                        schedule.is_active ? "bg-card" : "bg-muted/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-36">
                        <input
                          type="checkbox"
                          id={`day_active_${schedule.day_of_week}`}
                          checked={schedule.is_active}
                          onChange={(e) =>
                            handleScheduleDayChange(idx, "is_active", e.target.checked)
                          }
                          className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
                        />
                        <Label
                          htmlFor={`day_active_${schedule.day_of_week}`}
                          className="font-bold text-base cursor-pointer"
                        >
                          {dayName}
                        </Label>
                      </div>

                      {schedule.is_active ? (
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full sm:w-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Başlangıç:</span>
                            <Input
                              type="time"
                              value={schedule.start_time?.slice(0, 5) || "09:00"}
                              onChange={(e) =>
                                handleScheduleDayChange(idx, "start_time", e.target.value)
                              }
                              className="w-full sm:w-28 font-mono text-center"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Bitiş:</span>
                            <Input
                              type="time"
                              value={schedule.end_time?.slice(0, 5) || "18:00"}
                              onChange={(e) =>
                                handleScheduleDayChange(idx, "end_time", e.target.value)
                              }
                              className="w-full sm:w-28 font-mono text-center"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground italic pl-8 sm:pl-0">
                          Bu gün kapalı (Seans kabul edilmiyor)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>


          {/* Özel Günler & İzinler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Özel Gün & İzin Tanımları</CardTitle>
              <CardDescription>
                Haftalık şablon haricinde belirli tarihlerde izinli veya farklı saatlerde çalışacaksanız buradan ekleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form */}
              <form
                onSubmit={handleAddOverride}
                className="p-4 border rounded-lg bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="override_date">Tarih Seçin</Label>
                  <Input
                    id="override_date"
                    type="date"
                    required
                    value={newOverride.date}
                    onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="override_type">Durum</Label>
                  <select
                    id="override_type"
                    value={newOverride.override_type}
                    onChange={(e) =>
                      setNewOverride({ ...newOverride, override_type: e.target.value })
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="OFF">İzinli / Kapalı</option>
                    <option value="CUSTOM">Özel Saatler</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="override_reason">Açıklama / Neden</Label>
                  <Input
                    id="override_reason"
                    placeholder="Örn: Kongre, İzin, Tatil"
                    value={newOverride.reason}
                    onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                  />
                </div>

                <Button type="submit" variant="secondary" className="w-full">
                  İstisna / İzin Ekle
                </Button>
              </form>

              {/* Tanımlı İzinler Listesi */}
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-3">Tanımlı İstisnalar:</h4>
                {dateOverrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Henüz tanımlanmış bir izin veya özel gün yok.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dateOverrides.map((ov) => {
                      const dateObj = parseYMDToDate(ov.date);
                      return (
                        <div
                          key={ov.id}
                          className="p-3 border rounded-lg bg-card flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <p className="font-bold text-sm text-foreground">
                              {dateObj.toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                weekday: "short",
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ov.override_type === "OFF" ? "🔴 İzinli / Kapalı" : `🟢 Özel Saatler: ${ov.start_time} - ${ov.end_time}`}
                              {ov.reason && ` (${ov.reason})`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOverride(ov.id)}
                            className="text-destructive hover:bg-destructive/10 h-8 px-2"
                          >
                            Sil
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= TAB 2: RANDEVU TAKVİMİ ================= */}
      {activeTab === "calendar" && (
        <div className="space-y-8">
          {/* Hafta Gezinme */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-card p-4 rounded-xl border shadow-xs gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextOffset = currentWeekOffset - 1;
                  setCurrentWeekOffset(nextOffset);
                  fetchCalendarOverview(nextOffset);
                }}
                className="gap-1"
              >
                <ChevronLeft size={16} /> Önceki Hafta
              </Button>

              {currentWeekOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentWeekOffset(0);
                    fetchCalendarOverview(0);
                  }}
                  className="gap-1 text-primary text-xs"
                >
                  <RotateCcw size={14} /> Bu Hafta
                </Button>
              )}
            </div>

            <div className="text-center">
              <span className="text-xs font-semibold text-muted-foreground">
                {currentWeekOffset === 0
                  ? "🗓️ Bu Hafta"
                  : currentWeekOffset > 0
                  ? `🗓️ ${currentWeekOffset} Hafta Sonra`
                  : `🗓️ ${Math.abs(currentWeekOffset)} Hafta Önce`}
              </span>
              <p className="text-base font-bold text-foreground">
                {calendarData
                  ? `${parseYMDToDate(calendarData.start_date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                    })} - ${parseYMDToDate(calendarData.end_date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : "Yükleniyor..."}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextOffset = currentWeekOffset + 1;
                setCurrentWeekOffset(nextOffset);
                fetchCalendarOverview(nextOffset);
              }}
              className="gap-1"
            >
              Sonraki Hafta <ChevronRight size={16} />
            </Button>
          </div>

          {/* Haftalık Gün Kartları Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {calendarData?.days?.map((day: any) => {
              const isToday = day.date === todayStr;
              const dateObj = parseYMDToDate(day.date);
              return (
                <div
                  key={day.date}
                  className={`rounded-xl border p-3 flex flex-col justify-between min-h-64 shadow-xs transition-all ${
                    isToday ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "bg-card"
                  }`}
                >
                  {/* Gün Başlığı */}
                  <div className="border-b pb-2 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{day.day_name}</span>
                      {isToday && (
                        <span className="text-[10px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded">
                          Bugün
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dateObj.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="mt-1">
                      {day.override?.override_type === "OFF" ? (
                        <span className="text-[10px] text-destructive font-semibold">🔴 İzinli</span>
                      ) : day.is_active ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          🟢 Açık ({day.available_slots?.length || 0} boş slot)
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold">⚪ Kapalı</span>
                      )}
                    </div>
                  </div>

                  {/* Randevular */}
                  <div className="space-y-2 flex-grow overflow-y-auto max-h-72">
                    {day.appointments?.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Randevu yok</p>
                    ) : (
                      day.appointments.map((app: any) => (
                        <div
                          key={app.id}
                          className={`p-2 rounded-lg border text-xs space-y-1 ${
                            app.status === "COMPLETED"
                              ? "bg-muted/50 border-muted opacity-80"
                              : app.status === "CANCELLED"
                              ? "bg-destructive/10 border-destructive/30 line-through opacity-60"
                              : "bg-background border-primary/30 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-primary">{app.time.slice(0, 5)}</span>
                            <span
                              className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                                app.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : app.status === "CANCELLED"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {app.status_display}
                            </span>
                          </div>
                          <p className="font-semibold text-foreground truncate">
                            {app.user_name} {app.user_surname}
                          </p>
                          <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                            <Phone size={10} /> {app.phone}
                          </p>

                          {app.status === "BOOKED" && (
                            <div className="flex items-center gap-1 pt-1 border-t mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteAppointment(app.id)}
                                className="h-6 text-[10px] px-1.5 text-emerald-600 hover:bg-emerald-500/10 flex-1"
                              >
                                Tamamla
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelAppointment(app.id)}
                                className="h-6 text-[10px] px-1.5 text-destructive hover:bg-destructive/10 flex-1"
                              >
                                İptal
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tüm Randevular Listesi Tablosu */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ListFilter size={18} /> Tüm Randevular Listesi ({allAppointments.length})
                </CardTitle>
                <CardDescription>
                  Tüm tarihlerdeki rezerve, tamamlanmış ve iptal edilen seanslarınız.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {allAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz randevu kaydı yok.</p>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden text-sm">
                  {allAppointments.map((app) => {
                    const appDate = parseYMDToDate(app.date);
                    return (
                      <div
                        key={app.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">
                              {appDate.toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                weekday: "long",
                              })}
                            </span>
                            <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded text-xs">
                              {app.time.slice(0, 5)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                app.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : app.status === "CANCELLED"
                                  ? "bg-destructive/10 text-destructive line-through"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {app.status_display}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Danışan: <strong>{app.user_name} {app.user_surname}</strong> - Tel: {app.phone}
                          </p>
                          {app.client_notes && (
                            <p className="text-xs italic text-muted-foreground">
                              Not: {app.client_notes}
                            </p>
                          )}
                        </div>

                        {app.status === "BOOKED" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteAppointment(app.id)}
                              className="h-7 text-xs text-emerald-600 hover:bg-emerald-500/10"
                            >
                              Tamamlandı
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(app.id)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              İptal Et
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= TAB 3: DANIŞANLAR & ONAYLAR ================= */}
      {activeTab === "clients" && (
        <div className="space-y-8">
          {/* Onay Bekleyen Danışanlar */}
          <Card className="border-amber-500/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={20} /> Onay Bekleyen Danışan Başvuruları ({pendingClients.length})
                </CardTitle>
                <CardDescription>
                  Web sitesinden kayıt olan danışanlar burada listelenir. Onay vermeden randevu alamazlar.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pendingClients.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <CheckCircle size={32} className="text-emerald-500" />
                  Şu an onay bekleyen danışan başvurusu bulunmamaktadır.
                </div>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {pendingClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-base">
                          {client.user.first_name} {client.user.last_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {client.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {client.user.email}
                          </span>
                          <span>
                            Kayıt: {new Date(client.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveClient(client.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          <UserCheck size={16} /> Danışanı Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClient(client.id)}
                          className="gap-1.5"
                        >
                          <UserX size={16} /> Reddet
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kayıtlı ve Onaylı Danışanlar */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Kayıtlı Danışan Listesi ({clients.length})</CardTitle>
                <CardDescription>
                  Sistemde kayıtlı ve onaylı tüm danışanlarınızın listesi.
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddClientModal(true)} variant="outline" className="gap-2">
                <UserPlus size={16} /> Yeni Danışan Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  Henüz onaylı bir danışan bulunmuyor.
                </p>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">
                            {client.user.first_name} {client.user.last_name}
                          </p>
                          {client.created_by_psychologist && (
                            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                              Manuel Eklendi
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {client.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {client.user.email}
                          </span>
                          {client.notes && (
                            <span className="italic text-foreground/80 flex items-center gap-1">
                              <FileText size={12} /> Not: {client.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                        <CheckCircle size={14} /> Onaylı Danışan
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= TAB 4: SAYFA İÇERİKLERİ (HAKKIMDA & İLETİŞİM) ================= */}
      {activeTab === "content" && (
        <form onSubmit={handleSaveSiteContent} className="space-y-8 animate-in fade-in-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. HAKKIMDA BÖLÜMÜ */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  Hakkımda Sayfası Bilgileri
                </CardTitle>
                <CardDescription>
                  Hakkımda sayfasında görünen isim, unvan, profil fotoğrafı ve biyografi metnini düzenleyin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sc_full_name">Ad Soyad</Label>
                    <Input
                      id="sc_full_name"
                      required
                      placeholder="Örn: Aybike Yaren Topcuoğlu"
                      value={siteContent.full_name}
                      onChange={(e) => setSiteContent({ ...siteContent, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc_title">Mesleki Unvan</Label>
                    <Input
                      id="sc_title"
                      required
                      placeholder="Örn: Psikolog ve Aile Danışmanı"
                      value={siteContent.title}
                      onChange={(e) => setSiteContent({ ...siteContent, title: e.target.value })}
                    />
                  </div>
                </div>

                {/* Profil Fotoğrafı Yükleme & Önizleme */}
                <div className="space-y-2 pt-2 border-t">
                  <Label>Profil Fotoğrafı</Label>
                  <div className="flex items-center gap-4">
                    <img
                      src={siteContent.profile_image || profilePic}
                      alt="Profil Önizleme"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border shadow-xs shrink-0"
                    />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="sc_profile_image_input"
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Upload size={14} /> Yeni Fotoğraf Yükle
                        </label>
                        <input
                          id="sc_profile_image_input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />

                        {siteContent.profile_image && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSiteContent({ ...siteContent, profile_image: "" })}
                            className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2 cursor-pointer"
                          >
                            <Trash2 size={14} className="mr-1" /> Varsayılana Dön
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        PNG, JPG veya WEBP formatında en fazla 2 MB boyutunda görsel yükleyebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Biyografi / Tanıtım Metni */}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sc_about_text">Biyografi & Tanıtım Metni</Label>
                    <span className="text-[11px] text-muted-foreground">Paragraflar için Enter ile satır atlayınız</span>
                  </div>
                  <textarea
                    id="sc_about_text"
                    rows={12}
                    placeholder="Kendinizi, çalışma alanlarınızı ve yaklaşımınızı anlatan tanıtım metni..."
                    value={siteContent.about_text}
                    onChange={(e) => setSiteContent({ ...siteContent, about_text: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed resize-y font-sans"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. İLETİŞİM BÖLÜMÜ */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Phone className="text-primary" size={20} />
                  İletişim Sayfası Bilgileri
                </CardTitle>
                <CardDescription>
                  İletişim sayfasında ziyaretçilerin göreceği iletişim kanallarını ve sosyal medya linklerini belirleyin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sc_email" className="flex items-center gap-1.5">
                    <Mail size={14} className="text-primary" /> İletişim E-posta Adresi
                  </Label>
                  <Input
                    id="sc_email"
                    type="email"
                    required
                    placeholder="danisan@aypsikoloji.com"
                    value={siteContent.contact_email}
                    onChange={(e) => setSiteContent({ ...siteContent, contact_email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sc_phone" className="flex items-center gap-1.5">
                    <Phone size={14} className="text-primary" /> İletişim Telefon Numarası
                  </Label>
                  <Input
                    id="sc_phone"
                    type="tel"
                    maxLength={15}
                    placeholder="05XXXXXXXXX"
                    value={siteContent.contact_phone}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^\d\s+()\-]/g, "").slice(0, 15);
                      setSiteContent({ ...siteContent, contact_phone: sanitized });
                    }}
                  />
                </div>


                <div className="space-y-1.5">
                  <Label htmlFor="sc_address" className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" /> Ofis / Klinik Adresi (Opsiyonel)
                  </Label>
                  <Input
                    id="sc_address"
                    placeholder="Örn: Bağdat Caddesi No:123 Kadıköy / İstanbul"
                    value={siteContent.address}
                    onChange={(e) => setSiteContent({ ...siteContent, address: e.target.value })}
                  />
                </div>

                <div className="pt-2 border-t space-y-3">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Sosyal Medya Bağlantıları
                  </Label>

                  <div className="space-y-1.5">
                    <Label htmlFor="sc_instagram" className="flex items-center gap-1.5">
                      <Instagram size={14} className="text-pink-500" /> Instagram Profil Linki
                    </Label>
                    <Input
                      id="sc_instagram"
                      type="url"
                      placeholder="https://www.instagram.com/kullaniciadi"
                      value={siteContent.instagram_url}
                      onChange={(e) => setSiteContent({ ...siteContent, instagram_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sc_linkedin" className="flex items-center gap-1.5">
                      <Linkedin size={14} className="text-blue-500" /> LinkedIn Profil Linki (Opsiyonel)
                    </Label>
                    <Input
                      id="sc_linkedin"
                      type="url"
                      placeholder="https://www.linkedin.com/in/kullaniciadi"
                      value={siteContent.linkedin_url}
                      onChange={(e) => setSiteContent({ ...siteContent, linkedin_url: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kaydetme Butonu */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="submit"
              size="lg"
              disabled={contentSaving}
              className="gap-2 px-6 font-semibold cursor-pointer"
            >
              <Save size={18} />
              {contentSaving ? "Kaydediliyor..." : "Tüm Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>
      )}

      {/* Manuel Danışan Ekle Modal */}

      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="text-primary" size={20} /> Manuel Danışan Kaydet
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddClientModal(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateManualClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="man_first_name">Ad</Label>
                  <Input
                    id="man_first_name"
                    required
                    value={newClientData.first_name}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="man_last_name">Soyad</Label>
                  <Input
                    id="man_last_name"
                    required
                    value={newClientData.last_name}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="man_phone">Telefon Numarası</Label>
                  <span className="text-[11px] text-muted-foreground font-mono">{newClientData.phone.length}/11</span>
                </div>
                <Input
                  id="man_phone"
                  type="tel"
                  required
                  maxLength={11}
                  placeholder="05XXXXXXXXX"
                  value={newClientData.phone}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setNewClientData({ ...newClientData, phone: onlyNums });
                  }}
                />
              </div>


              <div className="space-y-1.5">
                <Label htmlFor="man_email">E-posta</Label>
                <Input
                  id="man_email"
                  type="email"
                  required
                  placeholder="danisan@mail.com"
                  value={newClientData.email}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="man_password">Giriş Şifresi (Opsiyonel)</Label>
                <Input
                  id="man_password"
                  type="text"
                  placeholder="Boş bırakılırsa telefon numarası atanır"
                  value={newClientData.password}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, password: e.target.value })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  * Danışan bu şifre veya varsayılan telefon numarası ile sisteme e-posta/telefon üzerinden giriş yapabilir.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="man_notes">Danışan Hakkında Özel Notlar (Opsiyonel)</Label>
                <Input
                  id="man_notes"
                  placeholder="Örn: Önceki tanı, seans sıklığı vb."
                  value={newClientData.notes}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, notes: e.target.value })
                  }
                />
              </div>

              <p className="text-xs text-muted-foreground">
                * Manuel eklenen danışan doğrudan <strong>Onaylı</strong> olarak kaydedilir.
              </p>


              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddClientModal(false)}
                >
                  İptal
                </Button>
                <Button type="submit">Danışanı Kaydet</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
