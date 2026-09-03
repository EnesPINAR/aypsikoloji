import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { HeartPulse, Menu, X, LogIn, LogOut, LayoutDashboard, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { to: "/hakkimizda", label: "Hakkımızda" },
    { to: "/iletisim", label: "İletişim" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Sol Taraf: Logo ve Navigasyon Bağlantıları Yan Yana */}
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex items-center gap-2 text-xl font-bold text-foreground shrink-0"
              >
                <HeartPulse className="text-primary" />
                <span>AyPsikoloji</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {role === "psychologist" && (
                  <Link
                    to="/panel/psikolog"
                    className={`text-sm font-medium transition-colors ${
                      location.pathname.startsWith("/panel/psikolog")
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Psikolog Paneli
                  </Link>
                )}


              </nav>
            </div>

            <div className="flex items-center gap-2">
              <ModeToggle />

              {/* Desktop Actions */}
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  {role !== "psychologist" && (
                    <>
                      <Button
                        asChild
                        variant={location.pathname === "/randevu" ? "default" : "outline"}
                        size="sm"
                      >
                        <Link to="/randevu">
                          <Calendar size={15} /> Randevularım
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant={location.pathname === "/profil" ? "default" : "outline"}
                        size="sm"
                      >
                        <Link to="/profil">
                          <User size={15} /> Profilim
                        </Link>
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                    <LogOut size={15} /> Çıkış
                  </Button>
                </div>
              ) : (


                <div className="hidden sm:flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/giris">
                      <LogIn size={15} /> Giriş Yap
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/randevu">Randevu Al</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/60 animate-in fade-in-0"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-background border-l shadow-2xl p-6 animate-in slide-in-from-right-80 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <nav className="flex flex-col gap-2 mt-4">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-base font-medium p-2 rounded-md transition-colors ${
                    location.pathname === "/"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  Ana Sayfa
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-base font-medium p-2 rounded-md transition-colors ${
                      location.pathname === link.to
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}


                {role === "psychologist" && (
                  <Link
                    to="/panel/psikolog"
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-base font-medium p-2 rounded-md flex items-center gap-2 transition-colors ${
                      location.pathname.startsWith("/panel/psikolog")
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <LayoutDashboard size={18} /> Psikolog Paneli
                  </Link>
                )}


                {role !== "psychologist" && (
                  <Link
                    to="/randevu"
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-base font-medium p-2 rounded-md flex items-center gap-2 transition-colors ${
                      location.pathname === "/randevu"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <Calendar size={18} /> Randevu Sistemi
                  </Link>
                )}

                {user && role !== "psychologist" && (
                  <Link
                    to="/profil"
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-base font-medium p-2 rounded-md flex items-center gap-2 transition-colors ${
                      location.pathname === "/profil"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <User size={18} /> Profilim & Hesap Ayarları
                  </Link>
                )}

              </nav>
            </div>

            <div className="border-t pt-4">
              {user ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground truncate">
                    Giriş yapan: <strong>{user.first_name} {user.last_name}</strong>
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut size={16} /> Çıkış Yap
                  </Button>
                </div>
              ) : (
                <Button asChild className="w-full gap-2" onClick={() => setIsMenuOpen(false)}>
                  <Link to="/giris">
                    <LogIn size={16} /> Giriş Yap / Kayıt Ol
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


