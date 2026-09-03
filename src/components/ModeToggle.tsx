import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) {
        return stored === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      className="cursor-pointer text-foreground hover:bg-accent relative"
      title={isDark ? "Açık Moda Geç" : "Koyu Moda Geç"}
      aria-label="Temayı Değiştir"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 transition-all duration-200 rotate-0 scale-100 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700 transition-all duration-200 rotate-0 scale-100 hover:-rotate-12" />
      )}
    </Button>
  );
}
