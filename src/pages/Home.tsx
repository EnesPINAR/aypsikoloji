import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main className="flex-grow flex flex-col">
      {/* DÜZELTME: Yüksekliği `calc()` ile hesaplamak yerine `flex-grow` ile esnek bir şekilde dolduruyoruz */}
      <section className="flex-grow relative flex items-center justify-center text-center">
        <div className="absolute inset-0 w-full h-full bg-cover bg-center bg-[url(./assets/bg.svg)]"></div>
        <div className="absolute inset-0 bg-background/80"></div>
        <div className="relative z-10 p-4 animate-in fade-in slide-in-from-bottom-12 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance text-foreground">
            Daha İyi Bir Sen İçin İlk Adımı At
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground text-balance">
            Profesyonel ve güvenilir psikolog desteğiyle zihinsel sağlığınızı
            güçlendirin.
          </p>
          <Button asChild size="lg" className="mt-8 text-lg">
            <Link to="/randevu">Hemen Randevu Al</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
