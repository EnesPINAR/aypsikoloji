import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, Phone, User as UserIcon, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerData, setRegisterData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirm: "",
  });

  const { login, register, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to appropriate page
  if (user) {
    if (role === "psychologist") {
      navigate("/panel/psikolog", { replace: true });
    } else {
      navigate("/randevu", { replace: true });
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      toast.error("Lütfen tüm alanları doldurunuz.");
      return;
    }

    setLoading(true);
    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);

    if (res.success) {
      toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
      const from = (location.state as any)?.from?.pathname || (res.role === "psychologist" ? "/panel/psikolog" : "/randevu");
      navigate(from, { replace: true });
    } else {
      toast.error("Giriş Başarısız", {
        description: res.message || "Giriş bilgilerinizi kontrol edip tekrar deneyiniz.",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.password_confirm) {
      toast.error("Şifreler uyuşmuyor!", {
        description: "Lütfen iki alanda da aynı şifreyi girdiğinizden emin olun.",
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast.error("Şifre çok kısa!", {
        description: "Şifreniz en az 6 karakter olmalıdır.",
      });
      return;
    }

    setLoading(true);
    const res = await register({
      first_name: registerData.first_name,
      last_name: registerData.last_name,
      email: registerData.email,
      phone: registerData.phone,
      password: registerData.password,
    });
    setLoading(false);

    if (res.success) {
      setRegisteredSuccess(true);
      toast.success("Kayıt Talebiniz Alındı!");
    } else {
      toast.error("Kayıt Başarısız", {
        description: res.message,
      });
    }
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        {registeredSuccess ? (
          <Card className="border-primary/20 shadow-lg text-center p-6">
            <CardHeader className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <CheckCircle2 size={36} />
              </div>
              <CardTitle className="text-2xl text-primary font-bold">Kayıt Talebiniz Alındı</CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                AyPsikoloji danışan üyelik başvurunuz sisteme başarıyla iletilmiştir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-left flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <span>
                  Danışan güvenliği ve seans planlaması için üyelikler psikoloğumuz tarafından onaylandıktan sonra aktifleşmektedir. Hesabınız onaylandığında giriş yaparak randevu oluşturabilirsiniz.
                </span>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setRegisteredSuccess(false);
                  setTab("login");
                }}
              >
                Giriş Ekranına Dön
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="inline-flex items-center justify-center gap-1 mx-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                <Sparkles size={14} /> Danışan & Psikolog Giriş Portalı
              </div>
              <CardTitle className="text-2xl font-bold">
                {tab === "login" ? "Giriş Yap" : "Danışan Kayıt Başvurusu"}
              </CardTitle>
              <CardDescription>
                {tab === "login"
                  ? "Randevularınızı yönetmek için giriş yapın."
                  : "Sistemden randevu alabilmek için lütfen bilgilerinizi eksiksiz doldurunuz."}
              </CardDescription>
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg mt-4">
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    tab === "login"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    tab === "register"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Kayıt Ol (Danışan)
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login_identifier">E-posta veya Telefon / Kullanıcı Adı</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="login_identifier"
                        type="text"
                        placeholder="ornek@mail.com veya 05..."
                        className="pl-9"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login_password">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="login_password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Henüz hesabınız yok mu?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("register")}
                      className="text-primary font-medium hover:underline"
                    >
                      Kayıt talebi oluşturun
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Adınız</Label>
                      <Input
                        id="first_name"
                        placeholder="Adınız"
                        required
                        value={registerData.first_name}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, first_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Soyadınız</Label>
                      <Input
                        id="last_name"
                        placeholder="Soyadınız"
                        required
                        value={registerData.last_name}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_email">E-posta Adresi</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="reg_email"
                        type="email"
                        placeholder="danisan@mail.com"
                        className="pl-9"
                        required
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_phone">Telefon Numarası</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="reg_phone"
                        type="tel"
                        placeholder="05XXXXXXXXX"
                        className="pl-9"
                        required
                        value={registerData.phone}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_password">Şifre Belirleyin</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="reg_password"
                        type="password"
                        placeholder="En az 6 karakter"
                        className="pl-9"
                        required
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg_password_confirm">Şifre Tekrar</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-muted-foreground size-4" />
                      <Input
                        id="reg_password_confirm"
                        type="password"
                        placeholder="Şifrenizi tekrar girin"
                        className="pl-9"
                        required
                        value={registerData.password_confirm}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password_confirm: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Kayıt talebiniz iletildikten sonra psikolog onayı verilecek, ardından sisteme giriş yapabileceksiniz.
                    </span>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Talep Gönderiliyor..." : "Kayıt Talebini Gönder"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
