import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  LogIn,
  UserPlus,
  CalendarCheck,
  History,
  Phone,
  CalendarDays,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatDateToYMD } from "@/lib/utils";

export function AppointmentPage() {
  const { user, isApproved, clientProfile, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"book" | "my-appointments">("book");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientNotes, setClientNotes] = useState("");

  // Danışanın kendi randevuları
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // CSRF Token alma
  const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  };

  const fetchMyAppointments = async () => {
    if (!user || !isApproved) return;
    setLoadingAppointments(true);
    try {
      const res = await fetch("/api/client/my-appointments/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMyAppointments(data);
      }
    } catch (e) {
      console.error("Fetch my appointments error:", e);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (user && isApproved) {
      fetchMyAppointments();
    }
  }, [user, isApproved]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setIsLoading(true);

    const formattedDate = formatDateToYMD(date);
    const requestUrl = `/api/client/available-slots/?date=${formattedDate}`;

    fetch(requestUrl, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: string[]) => {
        setAvailableSlots(data);
        if (data.length === 0) {
          toast.info("Müsait Zaman Yok", {
            description: `${date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })} için psikoloğun müsait seans saati bulunmamaktadır.`,
          });
        }
      })

      .catch(() =>
        toast.error("İstek Başarısız!", {
          description: "Müsait saatler getirilirken bir sorun oluştu.",
        })
      )
      .finally(() => setIsLoading(false));
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setIsLoading(true);
    const bookingData = {
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
      time: selectedSlot,
      client_notes: clientNotes,
    };

    fetch("/api/client/appointments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      credentials: "include",
      body: JSON.stringify(bookingData),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Randevu oluşturulamadı.");
        }
        return data;
      })
      .then(() => {
        toast.success("Randevunuz Oluşturuldu!", {
          description: `${selectedDate.toLocaleDateString("tr-TR")} - Saat ${selectedSlot} için randevunuz kaydedildi.`,
        });
        setSelectedDate(undefined);
        setSelectedSlot(null);
        setAvailableSlots([]);
        setClientNotes("");
        fetchMyAppointments();
        setActiveTab("my-appointments");
      })
      .catch((err) =>
        toast.error("Randevu Hatası", {
          description: err.message || "Lütfen tekrar deneyiniz.",
        })
      )
      .finally(() => setIsLoading(false));
  };

  const handleCancelMyAppointment = async (appointmentId: number) => {
    if (!confirm("Bu randevunuzu iptal etmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/client/my-appointments/${appointmentId}/cancel/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Randevunuz iptal edildi.");
        fetchMyAppointments();
      } else {
        toast.error("İptal işlemi başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    }
  };

  if (authLoading) {
    return (
      <main className="flex-grow container mx-auto px-4 py-16 text-center text-muted-foreground animate-pulse">
        Oturum durumu kontrol ediliyor...
      </main>
    );
  }

  // 1. Durum: Kullanıcı giriş yapmamışsa
  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-lg w-full text-center p-6 border shadow-lg">
          <CardHeader className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
              <CalendarCheck size={36} />
            </div>
            <CardTitle className="text-2xl font-bold">Randevu Sistemi</CardTitle>
            <CardDescription className="text-base mt-2">
              AyPsikoloji randevu takvimi ve seans seçim ekranı kayıtlı ve onaylı danışanlarımıza özeldir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-sm text-left text-muted-foreground flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <span>
                Psikoloğumuzun haftalık çalışma programına göre müsait saatleri görebilmek ve randevu oluşturabilmek için lütfen giriş yapınız veya danışan kayıt talebinde bulununuz.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button asChild className="w-full gap-2">
                <Link to="/giris">
                  <LogIn size={16} /> Giriş Yap
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2">
                <Link to="/giris">
                  <UserPlus size={16} /> Kayıt Talebi Oluştur
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 2. Durum: Kullanıcı kayıt olmuş ama henüz onaylanmamışsa (PENDING)
  if (!isApproved && role !== "psychologist") {
    return (
      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-lg w-full text-center p-6 border-amber-500/30 shadow-lg">
          <CardHeader className="flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 animate-pulse">
              <AlertCircle size={36} />
            </div>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              Üyelik Başvurunuz Onay Aşamasında
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Merhaba {user.first_name || user.username}, danışan kaydınız sistemimize ulaşmıştır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seans güvenliği ve takvim planlaması için yeni danışan üyelikleri psikoloğumuz tarafından manuel olarak incelenmekte ve onaylanmaktadır.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-800 dark:text-amber-300 font-medium">
              Hesabınız onaylandığında bu sayfadan psikoloğun haftalık müsait saatlerini görerek randevu alabileceksiniz.
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Durumu Yeniden Kontrol Et
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 3. Durum: Onaylı Danışan Randevu & Takvim Ekranı
  return (
    <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="text-primary" size={32} /> Danışan Randevu Portalı
          </h1>
          <p className="text-muted-foreground mt-1">
            Hoş geldiniz, <strong className="text-foreground">{user.first_name} {user.last_name}</strong>. Müsait seans saatlerini seçerek randevu alabilirsiniz.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted p-1 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab("book")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "book"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarIcon size={16} /> Yeni Randevu Al
          </button>
          <button
            onClick={() => {
              setActiveTab("my-appointments");
              fetchMyAppointments();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "my-appointments"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History size={16} /> Randevularım ({myAppointments.length})
          </button>
        </div>
      </div>

      {/* ================= TAB 1: YENİ RANDEVU AL ================= */}
      {activeTab === "book" && (
        <div className="space-y-10">
          {/* 1. Adım: Tarih Seçimi */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
              <CalendarIcon className="text-primary" size={22} /> 1. Adım: Tarih Seçin
            </h2>
            <div className="bg-card border rounded-xl p-4 inline-block shadow-xs">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date < new Date(new Date().setDate(new Date().getDate() - 1))
                }
                className="rounded-md mx-auto"
              />
            </div>
          </section>

          {/* Yükleniyor Uyarısı */}
          {isLoading && (
            <div className="text-center text-muted-foreground animate-pulse py-4 font-medium">
              Psikoloğun müsait saatleri yükleniyor...
            </div>
          )}

          {/* 2. Adım: Müsait Saatler */}
          {availableSlots.length > 0 && !isLoading && selectedDate && (
            <section className="space-y-4 animate-in fade-in-50">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                <Clock className="text-primary" size={22} /> 2. Adım:{" "}
                <span className="text-primary font-bold">
                  {selectedDate.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    weekday: "long",
                  })}
                </span>{" "}
                için Seans Saati Seçin
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">

                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-12 text-base font-semibold transition-all ${
                      selectedSlot === slot ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* 3. Adım: Onay ve Seans Notu */}
          {selectedSlot && (
            <section className="space-y-4 animate-in fade-in-50">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                <CheckCircle className="text-primary" size={22} /> 3. Adım: Randevuyu Onaylayın
              </h2>
              <Card className="shadow-lg border">
                <CardHeader>
                  <CardTitle>Randevu Özeti</CardTitle>
                  <CardDescription className="text-base font-medium text-foreground">
                    📅 Seçilen Tarih:{" "}
                    <strong>
                      {selectedDate?.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        weekday: "long",
                      })}
                    </strong>{" "}
                    - Saat: <strong className="text-primary">{selectedSlot}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                      <div>
                        <span className="text-xs text-muted-foreground">Danışan Adı Soyadı:</span>
                        <p className="font-semibold text-foreground">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">İletişim Telefonu:</span>
                        <p className="font-semibold text-foreground">
                          {clientProfile?.phone || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="client_notes">Psikoloğa İletmek İstediğiniz Not (Opsiyonel)</Label>
                      <Input
                        id="client_notes"
                        placeholder="Örn: İlk görüşme konusu, online/yüz yüze tercihi vb."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                      {isLoading ? "İşleniyor..." : "Randevuyu Onayla ve Tamamla"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}

      {/* ================= TAB 2: RANDEVULARIM ================= */}
      {activeTab === "my-appointments" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Randevu Geçmişiniz</CardTitle>
              <CardDescription>
                Aktif, tamamlanmış ve iptal edilen tüm seanslarınız.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAppointments ? (
                <p className="text-center py-6 text-muted-foreground animate-pulse">
                  Randevularınız yükleniyor...
                </p>
              ) : myAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-3">
                  <CalendarDays size={36} className="mx-auto text-muted-foreground/60" />
                  <p>Henüz alınmış bir randevunuz bulunmamaktadır.</p>
                  <Button onClick={() => setActiveTab("book")} variant="outline">
                    Yeni Randevu Al
                  </Button>
                </div>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {myAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-foreground text-base">
                            {new Date(app.date).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              weekday: "short",
                            })}
                          </p>
                          <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded">
                            {app.time.slice(0, 5)}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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

                        {app.client_notes && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText size={12} /> Notunuz: {app.client_notes}
                          </p>
                        )}
                      </div>

                      {app.status === "BOOKED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelMyAppointment(app.id)}
                          className="shrink-0"
                        >
                          Randevuyu İptal Et
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

