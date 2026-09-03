import { useState, useEffect } from "react";
import profilePic from "@/assets/pp.webp";

interface SiteContentData {
  full_name: string;
  title: string;
  profile_image: string;
  about_text: string;
}

export function HakkimizdaPage() {
  const [content, setContent] = useState<SiteContentData>({
    full_name: "Aybike Yaren Topcuoğlu",
    title: "Psikolog ve Aile Danışmanı",
    profile_image: "",
    about_text: "",
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
        console.error("Hakkımda içeriği alınamadı:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const imageSrc = content.profile_image || profilePic;
  const paragraphs = content.about_text
    ? content.about_text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <main className="flex-grow container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Hakkımda
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Uzmanımızla tanışın.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12 relative">
          <div className="flex-shrink-0 sm:sticky sm:top-24 sm:self-start transition-all">
            <img
              src={imageSrc}
              alt={content.full_name || "Psikolog"}
              className="rounded-full w-32 h-32 sm:w-40 sm:h-40 object-cover border-4 border-muted shadow-md"
            />
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              {content.full_name}
            </h2>
            <p className="text-primary font-medium mt-1">
              {content.title}
            </p>

            <div className="mt-6 text-muted-foreground leading-relaxed space-y-4">
              {loading ? (
                <p className="animate-pulse">İçerik yükleniyor...</p>
              ) : paragraphs.length > 0 ? (
                paragraphs.map((p, index) => (
                  <p key={index} className="text-justify sm:text-left">
                    {p}
                  </p>
                ))
              ) : (
                <p>Henüz biyografi bilgisi eklenmedi.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

