/**
 * Form Girdi Doğrulama Modülü (Client-side Validation)
 * Kullanıcı girdilerini sunucuya göndermeden önce biçimsel olarak denetler.
 */

// Geçerli e-posta deseni
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Türkiye mobil telefon numarası (05XXXXXXXXX, tam 11 hane)
const PHONE_REGEX = /^05\d{9}$/;

// Sadece Türkçe/İngilizce harfler ve boşluk
const NAME_REGEX = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]{2,50}$/;

export const validators = {
  /**
   * E-posta adresi doğrulaması
   */
  email: (value: string): string | null => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return "E-posta adresi zorunludur.";
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return "Lütfen geçerli bir e-posta adresi giriniz (Örn: adiniz@ornek.com).";
    }
    return null;
  },

  /**
   * Türkiye telefon numarası doğrulaması
   */
  phone: (value: string): string | null => {
    const digitsOnly = (value || "").replace(/\D/g, "");
    if (!digitsOnly) {
      return "Telefon numarası zorunludur.";
    }
    if (digitsOnly.length !== 11 || !digitsOnly.startsWith("05")) {
      return "Telefon numarası 05 ile başlamalı ve tam 11 haneli olmalıdır (Örn: 05XXXXXXXXX).";
    }
    return null;
  },

  /**
   * Ad veya Soyad doğrulaması
   */
  name: (value: string, fieldTitle: string = "Ad / Soyad"): string | null => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return `${fieldTitle} alanı zorunludur.`;
    }
    if (trimmed.length < 2) {
      return `${fieldTitle} en az 2 karakter olmalıdır.`;
    }
    if (!NAME_REGEX.test(trimmed)) {
      return `${fieldTitle} sadece harflerden oluşmalıdır.`;
    }
    return null;
  },

  /**
   * Şifre doğrulaması
   */
  password: (value: string, minLength: number = 6): string | null => {
    if (!value) {
      return "Şifre zorunludur.";
    }
    if (value.length < minLength) {
      return `Şifre en az ${minLength} karakter olmalıdır.`;
    }
    return null;
  },

  /**
   * 6 haneli OTP doğrulama kodu kontrolü
   */
  otpCode: (value: string): string | null => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return "Doğrulama kodu zorunludur.";
    }
    if (!/^\d{6}$/.test(trimmed)) {
      return "Doğrulama kodu 6 haneli rakamlardan oluşmalıdır.";
    }
    return null;
  },
};

/**
 * Sunucu (Django REST Framework) hata nesnelerini anlaşılır Türkçe hata mesajlarına dönüştürür.
 * Alan isimlerini Türkçeleştirir ve "Bu alan boş bırakılamaz" yerine hangi alanın boş olduğunu belirtir.
 */
export const formatApiErrorMessage = (
  data: any,
  defaultMsg: string = "İşlem gerçekleştirilemedi."
): string => {
  if (!data) return defaultMsg;
  if (typeof data === "string") return data;
  if (data.error && typeof data.error === "string") return data.error;
  if (data.detail && typeof data.detail === "string") return data.detail;
  if (data.message && typeof data.message === "string") return data.message;

  if (typeof data === "object") {
    const fieldLabels: Record<string, string> = {
      first_name: "Danışan Adı",
      last_name: "Danışan Soyadı",
      phone: "Telefon Numarası",
      email: "E-posta Adresi",
      password: "Giriş Şifresi",
      notes: "Not",
      date: "Tarih",
      time: "Saat",
      code: "Doğrulama Kodu",
      new_value: "Yeni Değer",
      non_field_errors: "Hata",
    };

    const messages: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      const label = fieldLabels[key] || key;
      const rawVal = Array.isArray(val) ? val.join(" ") : String(val);
      if (rawVal.toLowerCase().includes("bu alan") || rawVal.toLowerCase().includes("zorunlu")) {
        messages.push(`${label} boş bırakılamaz.`);
      } else {
        messages.push(`${label}: ${rawVal}`);
      }
    }
    if (messages.length > 0) return messages.join(" | ");
  }

  return defaultMsg;
};

