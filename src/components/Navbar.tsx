import { useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinks = [
    { to: "/hakkimizda", label: "Hakkımızda" },
    { to: "/iletisim", label: "İletişim" },
  ];

  return (
    <>
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold text-foreground"
            >
              <HeartPulse className="text-primary" />
              <span>AyPsikoloji</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/randevu">Randevu Al</Link>
              </Button>
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
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/60 animate-in fade-in-0"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-background border-l shadow-2xl p-6 animate-in slide-in-from-right-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(false)}
              >
                <X />
              </Button>
            </div>
            <nav className="flex flex-col gap-4 mt-4">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-medium text-foreground p-2 rounded-md hover:bg-accent"
              >
                Ana Sayfa
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-medium text-foreground p-2 rounded-md hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="w-full mt-4">
                <Link to="/randevu" onClick={() => setIsMenuOpen(false)}>
                  Randevu Al
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
