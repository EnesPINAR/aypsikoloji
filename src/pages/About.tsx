import profilePic from "@/assets/pp.webp";

export function HakkimizdaPage() {
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
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Hakkımda Ben Aybike Yaren Topcuoğlu, Psikolog ve Aile
              Danışmanıyım. Lisans eğitimimi Sakarya Üniversitesi Psikoloji
              Bölümü’nde yüksek onur derecesi ile tamamladım. Şu anda Haliç
              Üniversitesi Tezli Psikoloji Yüksek Lisans Programı’nda uzmanlık
              eğitimime devam etmekteyim. Akademik hayatım boyunca araştırma
              projeleri, makale ve kitap çalışmaları içerisinde yer aldım; aynı
              zamanda birçok eğitim ve seminer vererek mesleki deneyimimi
              zenginleştirdim. <br /> <br />
              Mesleki pratiğimde hem yetişkinlerle hem de çocuklarla
              çalışıyorum. Yetişkin danışanlarla özellikle duygudurum
              bozuklukları, kaygı (anksiyete) bozuklukları, obsesif kompulsif
              bozukluk, öfke kontrol güçlükleri, somatik bozukluklar, yeme
              bozuklukları üzerine yoğunlaşıyorum. Ayrıca aile ve ebeveyn
              danışmanlığı alanında da aktif olarak çalışmaktayım. <br /> <br />
              Terapötik yaklaşımımda tek bir yönteme bağlı kalmaktan ziyade
              danışanın ihtiyacına göre farklı ekolleri bir araya getirmeyi
              önemsiyorum. Dinamik ve derinlemesine bakış açısını şefkatli bir
              şekilde harmanlarken, yapılandırılmış teknikleri de sürecin içine
              katıyorum. Böylece hem iç dünyadaki kök nedenlere dokunabilmeyi
              hem de gündelik yaşamda işlevselliği artırmayı hedefliyorum.{" "}
              <br /> <br />
              Bugüne kadar iki anaokulunda kurum psikoloğu olarak görev aldım,
              atölye çalışmaları düzenledim ve çocuk, ergen, yetişkin
              danışanlarla klinik deneyim kazandım. Aynı zamanda topluluk
              çalışmalarım, deprem sonrası psikososyal destek faaliyetlerim ve
              hastane okulu projelerim bana çok yönlü bir saha deneyimi kattı.{" "}
              <br /> <br />
              Mesleğe bakışımda en çok önem verdiğim şey; insanın içsel
              yolculuğunda yanında güvenle eşlik edebilmek. Her bireyin kendi
              hikâyesiyle değerli olduğuna inanıyor ve bu yolculukta bilimsel,
              etik ve insancıl bir yaklaşımı rehber ediniyorum.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
