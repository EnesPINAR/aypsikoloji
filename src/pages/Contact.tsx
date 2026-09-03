import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import profilePic from "@/assets/pp.webp";

interface SiteContentData {
  full_name: string;
  title: string;
  profile_image: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  instagram_url: string;
  linkedin_url: string;
}

export function IletisimPage() {
  const [content, setContent] = useState<SiteContentData>({
    full_name: "Aybike Yaren Topcuoğlu",
    title: "Psikolog ve Aile Danışmanı",
    profile_image: "",
    contact_email: "psikologaybikeyaren@gmail.com",
    contact_phone: "",
    address: "",
    instagram_url: "https://www.instagram.com/psikologaybiketopcuoglu",
    linkedin_url: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/site-content/");
        if (res.ok) {
          const data = await res.json();
          setContent(data);
        }
      } catch (err) {
        console.error("İletişim içeriği alınamadı:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const imageSrc = content.profile_image || profilePic;

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
              src={imageSrc}
              alt={content.full_name || "Psikolog"}
              className="rounded-full w-32 h-32 sm:w-40 sm:h-40 object-cover border-4 border-muted shadow-md"
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {content.full_name}
            </h2>
            <p className="text-primary font-medium mt-1">
              {content.title}
            </p>

            <div className="mt-6 flex flex-col items-center sm:items-start gap-4">
              {/* E-posta */}
              {content.contact_email && (
                <a
                  href={`mailto:${content.contact_email}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <span>{content.contact_email}</span>
                </a>
              )}

              {/* Telefon */}
              {content.contact_phone && (
                <a
                  href={`tel:${content.contact_phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-5 h-5 text-primary shrink-0" />
                  <span>{content.contact_phone}</span>
                </a>
              )}

              {/* Adres */}
              {content.address && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <span>{content.address}</span>
                </div>
              )}

              {/* Sosyal Medya İkonları */}
              <div className="flex items-center gap-3 pt-2">
                {content.instagram_url && (
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={content.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  </Button>
                )}

                {content.linkedin_url && (
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={content.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

