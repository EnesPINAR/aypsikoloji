import { Mail, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import profilePic from "@/assets/pp.webp";

export function IletisimPage() {
  return (
    <main className="flex-grow container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            İletişim
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Bize ulaşın.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
          <div className="flex-shrink-0">
            <img
              src={profilePic}
              alt="Aybike Yaren Topcuoğlu"
              className="rounded-full w-32 h-32 sm:w-40 sm:h-40 object-cover border-4 border-muted"
            />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              Aybike Yaren Topcuoğlu
            </h2>
            <p className="text-primary font-medium mt-1">
              Psikolog ve Aile Danışmanı
            </p>
            <div className="mt-6 flex flex-col items-center sm:items-start gap-4">
              <a
                href="mailto:psikologaybikeyaren@gmail.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>psikologaybikeyaren@gmail.com</span>
              </a>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="icon">
                  <a
                    href="https://www.instagram.com/psikologaybiketopcuoglu"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
