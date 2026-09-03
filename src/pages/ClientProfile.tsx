import { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Lock,
  CheckCircle,
  ShieldCheck,
  Send,
  Save,
  KeyRound,
  Calendar,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { validators } from "@/lib/validation";

export function ClientProfilePage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // --- Temel Bilgiler Formu ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingBasic, setSavingBasic] = useState(false);

  // --- Telefon Değiştirme Formu ---
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSendingCode, setPhoneSendingCode] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  // --- E-posta Değiştirme Formu ---
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSendingCode, setEmailSendingCode] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // --- Şifre Değiştirme Formu ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordSendingCode, setPasswordSendingCode] = useState(false);
  const [passwordVerifying, setPasswordVerifying] = useState(false);

  // CSRF Token alma
  const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/client/profile/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      } else if (res.status === 401) {
        navigate("/giris");
      }
    } catch (e) {
      console.error("Fetch profile error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/giris");
      } else {
        fetchProfile();
      }
    }
  }, [user, authLoading]);

  // --- 1. Temel Bilgileri Güncelle (Ad / Soyad) ---
  const handleUpdateBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstErr = validators.name(firstName, "Ad");
    if (firstErr) {
      toast.error(firstErr);
      return;
    }
    const lastErr = validators.name(lastName, "Soyad");
    if (lastErr) {
      toast.error(lastErr);
      return;
    }

    setSavingBasic(true);
    try {
      const res = await fetch("/api/client/profile/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Profil başarıyla güncellendi.");
        await refreshUser();
        fetchProfile();
      } else {
        toast.error(data.error || "Güncelleme başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setSavingBasic(false);
    }
  };

  // --- 2. Telefon Değiştirme (E-posta Onaylı) ---
  const handleSendPhoneCode = async () => {
    const phoneErr = validators.phone(newPhone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }

    setPhoneSendingCode(true);
    try {
      const res = await fetch("/api/client/profile/send-verification-code/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_PHONE",
          new_value: newPhone.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Doğrulama Kodu Gönderildi", {
          description: data.message,
        });
        setPhoneCodeSent(true);
      } else {
        const errorMsg = data.new_value?.[0] || data.error || "Kod gönderilemedi.";
        toast.error(errorMsg);
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setPhoneSendingCode(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeErr = validators.otpCode(phoneCode);
    if (codeErr) {
      toast.error(codeErr);
      return;
    }

    setPhoneVerifying(true);
    try {
      const res = await fetch("/api/client/profile/verify-and-update/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_PHONE",
          code: phoneCode,
          new_value: newPhone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setPhoneCodeSent(false);
        setPhoneCode("");
        setNewPhone("");
        await refreshUser();
        fetchProfile();
      } else {
        toast.error(data.error || "Doğrulama başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setPhoneVerifying(false);
    }
  };

  // --- 3. E-posta Değiştirme (E-posta Onaylı) ---
  const handleSendEmailCode = async () => {
    const emailErr = validators.email(newEmail);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }

    setEmailSendingCode(true);
    try {
      const res = await fetch("/api/client/profile/send-verification-code/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_EMAIL",
          new_value: newEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Doğrulama Kodu Gönderildi", {
          description: data.message,
        });
        setEmailCodeSent(true);
      } else {
        const errorMsg = data.new_value?.[0] || data.error || "Kod gönderilemedi.";
        toast.error(errorMsg);
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setEmailSendingCode(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeErr = validators.otpCode(emailCode);
    if (codeErr) {
      toast.error(codeErr);
      return;
    }

    setEmailVerifying(true);
    try {
      const res = await fetch("/api/client/profile/verify-and-update/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_EMAIL",
          code: emailCode.trim(),
          new_value: newEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setEmailCodeSent(false);
        setEmailCode("");
        setNewEmail("");
        await refreshUser();
        fetchProfile();
      } else {
        toast.error(data.error || "Doğrulama başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setEmailVerifying(false);
    }
  };

  // --- 4. Şifre Değiştirme (E-posta Onaylı) ---
  const handleSendPasswordCode = async () => {
    setPasswordSendingCode(true);
    try {
      const res = await fetch("/api/client/profile/send-verification-code/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_PASSWORD",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Doğrulama Kodu Gönderildi", {
          description: data.message,
        });
        setPasswordCodeSent(true);
      } else {
        toast.error(data.error || "Kod gönderilemedi.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setPasswordSendingCode(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validators.password(newPassword, 6);
    if (passErr) {
      toast.error(passErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }
    const codeErr = validators.otpCode(passwordCode);
    if (codeErr) {
      toast.error(codeErr);
      return;
    }


    setPasswordVerifying(true);
    try {
      const res = await fetch("/api/client/profile/verify-and-update/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          purpose: "CHANGE_PASSWORD",
          code: passwordCode,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Şifreniz Başarıyla Değiştirildi!");
        setPasswordCodeSent(false);
        setPasswordCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Şifre değiştirme başarısız.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setPasswordVerifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="flex-grow container mx-auto px-4 py-16 text-center text-muted-foreground animate-pulse">
        Profil bilgileri yükleniyor...
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
      {/* Header & Overview Card */}
      <div className="bg-card border rounded-2xl p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              {profileData?.first_name?.[0] || profileData?.username?.[0] || "D"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profileData?.first_name} {profileData?.last_name}
                </h1>
                <span className="text-xs bg-emerald-500/10 text-emerald-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={12} /> {profileData?.status_display || "Onaylı Danışan"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{profileData?.email}</p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/randevu">
              <Calendar size={15} /> Randevularıma Git
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        {profileData?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t">
            <div className="bg-muted/40 p-3 rounded-xl text-center">
              <span className="text-xs text-muted-foreground block">Aktif Randevu</span>
              <strong className="text-lg font-bold text-primary">{profileData.stats.booked}</strong>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl text-center">
              <span className="text-xs text-muted-foreground block">Tamamlanan</span>
              <strong className="text-lg font-bold text-emerald-600">{profileData.stats.completed}</strong>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl text-center">
              <span className="text-xs text-muted-foreground block">İptal Edilen</span>
              <strong className="text-lg font-bold text-muted-foreground">{profileData.stats.cancelled}</strong>
            </div>
            <div className="bg-muted/40 p-3 rounded-xl text-center">
              <span className="text-xs text-muted-foreground block">Toplam Seans</span>
              <strong className="text-lg font-bold text-foreground">{profileData.stats.total}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================= 1. TEMEL BİLGİLER ================= */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User size={18} className="text-primary" /> Kişisel Bilgiler
            </CardTitle>
            <CardDescription>Ad ve soyad bilgilerinizi doğrudan güncelleyebilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBasicProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof_first_name">Ad</Label>
                <Input
                  id="prof_first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_last_name">Soyad</Label>
                <Input
                  id="prof_last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={savingBasic} className="w-full gap-2">
                <Save size={16} /> {savingBasic ? "Kaydediliyor..." : "Ad ve Soyadı Kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ================= 2. TELEFON DEĞİŞTİRME ================= */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Phone size={18} className="text-primary" /> Telefon Numarası
            </CardTitle>
            <CardDescription>
              Güvenliğiniz için telefon değişikliği kayıtlı e-posta onayınızla yapılır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-lg text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Kayıtlı Telefon:</span>
              <strong className="text-foreground font-mono">{profileData?.phone || "Kayıtlı değil"}</strong>
            </div>

            {!phoneCodeSent ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new_phone">Yeni Telefon Numarası</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">{newPhone.length}/11</span>
                  </div>
                  <Input
                    id="new_phone"
                    type="tel"
                    maxLength={11}
                    placeholder="05XXXXXXXXX"
                    value={newPhone}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setNewPhone(onlyNums);
                    }}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendPhoneCode}
                  disabled={phoneSendingCode || !newPhone.trim()}
                  className="w-full gap-2"
                >
                  <Send size={15} /> {phoneSendingCode ? "Kod Gönderiliyor..." : "E-postama Onay Kodu Gönder"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPhone} className="space-y-3 animate-in fade-in-50">
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{profileData?.email}</strong> adresinize 6 haneli onay kodu gönderildi.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone_code">6 Haneli Onay Kodu</Label>
                  <Input
                    id="phone_code"
                    placeholder="123456"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-widest"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhoneCodeSent(false);
                      setPhoneCode("");
                    }}
                    className="text-xs"
                  >
                    Vazgeç
                  </Button>
                  <Button type="submit" disabled={phoneVerifying} className="flex-1">
                    {phoneVerifying ? "Doğrulanıyor..." : "Doğrula ve Telefonu Güncelle"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ================= 3. E-POSTA DEĞİŞTİRME ================= */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Mail size={18} className="text-primary" /> E-posta Adresi
            </CardTitle>
            <CardDescription>
              E-posta değişikliği mevcut adresinize gönderilen kod ile onaylanır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-lg text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Mevcut E-posta:</span>
              <strong className="text-foreground font-mono text-xs">{profileData?.email}</strong>
            </div>

            {!emailCodeSent ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new_email">Yeni E-posta Adresi</Label>
                  <Input
                    id="new_email"
                    type="email"
                    placeholder="yeni@mail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendEmailCode}
                  disabled={emailSendingCode || !newEmail.trim()}
                  className="w-full gap-2"
                >
                  <Send size={15} /> {emailSendingCode ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyEmail} className="space-y-3 animate-in fade-in-50">
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Mevcut <strong>{profileData?.email}</strong> adresinize 6 haneli kod gönderildi.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email_code">6 Haneli Onay Kodu</Label>
                  <Input
                    id="email_code"
                    placeholder="123456"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-widest"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEmailCodeSent(false);
                      setEmailCode("");
                    }}
                    className="text-xs"
                  >
                    Vazgeç
                  </Button>
                  <Button type="submit" disabled={emailVerifying} className="flex-1">
                    {emailVerifying ? "Doğrulanıyor..." : "Doğrula ve E-postayı Güncelle"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ================= 4. ŞİFRE DEĞİŞTİRME ================= */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lock size={18} className="text-primary" /> Şifre Değiştirme
            </CardTitle>
            <CardDescription>
              Hesap güvenliğiniz için şifre değişikliği e-posta onayı gerektirir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!passwordCodeSent ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Şifrenizi yenilemek için <strong>{profileData?.email}</strong> adresinize tek kullanımlık güvenlik kodu talep ediniz.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendPasswordCode}
                  disabled={passwordSendingCode}
                  className="w-full gap-2"
                >
                  <KeyRound size={15} /> {passwordSendingCode ? "Kod Gönderiliyor..." : "E-postama Şifre Kodu Gönder"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPassword} className="space-y-3 animate-in fade-in-50">
                <div className="space-y-1.5">
                  <Label htmlFor="new_pass">Yeni Şifre (En az 6 karakter)</Label>
                  <Input
                    id="new_pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf_pass">Yeni Şifre (Tekrar)</Label>
                  <Input
                    id="conf_pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pass_code">E-postaya Gelen 6 Haneli Kod</Label>
                  <Input
                    id="pass_code"
                    placeholder="123456"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-widest"
                    value={passwordCode}
                    onChange={(e) => setPasswordCode(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPasswordCodeSent(false);
                      setPasswordCode("");
                    }}
                    className="text-xs"
                  >
                    Vazgeç
                  </Button>
                  <Button type="submit" disabled={passwordVerifying} className="flex-1">
                    {passwordVerifying ? "Değiştiriliyor..." : "Şifreyi Güncelle"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
