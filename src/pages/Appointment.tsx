import { useState } from "react";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";
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

const API_URL = "/api";
const PSYCHOLOGIST_ID = 1;

export function AppointmentPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_name: "",
    user_surname: "",
    phone: "",
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setIsLoading(true);

    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const requestUrl = `${API_URL}/public/available-slots/?date=${formattedDate}&psychologist_id=${PSYCHOLOGIST_ID}`;

    fetch(requestUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: string[]) => {
        setAvailableSlots(data);
        if (data.length === 0) {
          toast.info("Müsait Zaman Yok", {
            description:
              "Seçtiğiniz tarih için müsait randevu bulunmamaktadır.",
          });
        }
      })
      .catch(() =>
        toast.error("İstek Başarısız!", {
          description: "Müsait saatler getirilirken bir sorun oluştu.",
        }),
      )
      .finally(() => setIsLoading(false));
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setIsLoading(true);
    const bookingData = {
      ...formData,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
      time: selectedSlot,
    };

    fetch(`${API_URL}/public/appointments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        toast.success("Başarılı!", {
          description: "Randevunuz başarıyla oluşturulmuştur.",
        });
        setSelectedDate(undefined);
        setSelectedSlot(null);
        setAvailableSlots([]);
        setFormData({ user_name: "", user_surname: "", phone: "" });
      })
      .catch(() =>
        toast.error("Hata!", {
          description: "Randevu oluşturulamadı. Lütfen tekrar deneyin.",
        }),
      )
      .finally(() => setIsLoading(false));
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-4">
            <CalendarIcon size={24} /> 1. Adım: Tarih Seçin
          </h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) =>
              date < new Date(new Date().setDate(new Date().getDate() - 1))
            }
            className="rounded-md border mx-auto sm:mx-0"
          />
        </section>

        {isLoading && (
          <div className="text-center text-muted-foreground animate-pulse">
            Müsait saatler yükleniyor...
          </div>
        )}

        {availableSlots.length > 0 && !isLoading && (
          <section>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-4">
              <Clock size={24} /> 2. Adım: Saat Seçin
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={selectedSlot === slot ? "default" : "outline"}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </section>
        )}

        {selectedSlot && (
          <section>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-4">
              <User size={24} /> 3. Adım: Bilgilerinizi Girin
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Randevu Detayları</CardTitle>
                <CardDescription>{`Seçilen tarih: ${selectedDate?.toLocaleDateString("tr-TR")} - ${selectedSlot}`}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_name">Adınız</Label>
                    <Input
                      id="user_name"
                      type="text"
                      required
                      value={formData.user_name}
                      onChange={(e) =>
                        setFormData({ ...formData, user_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_surname">Soyadınız</Label>
                    <Input
                      id="user_surname"
                      type="text"
                      required
                      value={formData.user_surname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          user_surname: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "İşleniyor..." : "Randevuyu Onayla"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
