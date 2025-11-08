# GitHub Issue Şablonları: Kritik Güvenlik Açıkları

---

### Issue #1: Kritik - Firestore Veritabanı Tamamen Korumasız

**Başlık:** Kritik Güvenlik Açığı: Firestore Veritabanı Korumasız

**Açıklama:**
`firestore.rules` dosyası, veritabanına herkese açık ve kimlik doğrulamasız tam okuma/yazma erişimi sağlıyor (`allow read, write: if true;`). Bu, herhangi bir saldırganın tüm kullanıcı verilerini okumasına, değiştirmesine veya silmesine olanak tanır.

**Görevler:**
- [ ] Varsayılan olarak tüm erişimi engelle.
- [ ] Kullanıcıların yalnızca kendi verilerini düzenleyebilmesi için kimlik doğrulama tabanlı kurallar ekle.
- [ ] Koleksiyonlar arasında (örneğin, profiller, maçlar, mesajlar) belirli ve kısıtlı erişim kuralları tanımla.
- [ ] Yeni kuralların mevcut uygulama işlevselliğini bozmadığından emin olmak için tam bir regresyon testi yap.

**Etiketler:** `security`, `critical`, `p0`, `database`
**Atanacak Kişi:** @developer

---

### Issue #2: Kritik - Zayıf Brute-Force Koruması

**Başlık:** Kritik Güvenlik Açığı: Etkisiz Brute-Force Koruması

**Açıklama:**
`SecurityManager.ts` içindeki hesap kilitleme mekanizması, `maxLoginAttempts` değerinin `50` ve `lockoutDuration` değerinin `30` saniye olması nedeniyle etkisizdir. Bu, kullanıcı hesaplarını kaba kuvvet saldırılarına karşı savunmasız bırakır.

**Görevler:**
- [ ] `maxLoginAttempts` değerini `5` olarak güncelle.
- [ ] `lockoutDuration` değerini `900000` (15 dakika) olarak güncelle.
- [ ] Bu ayarları, ortam (development/production) bazında yapılandırılabilir hale getir.

**Etiketler:** `security`, `critical`, `p0`, `auth`
**Atanacak Kişi:** @developer

---

### Issue #3: Kritik - Yetersiz Girdi Temizleme (XSS Riski)

**Başlık:** Kritik Güvenlik Açığı: XSS Zafiyetine Yol Açan Yetersiz Girdi Temizleme

**Açıklama:**
`SecurityManager.ts` içindeki `sanitizeInput` fonksiyonu, XSS saldırılarını önlemek için yetersiz olan basit bir blacklist yöntemi kullanmaktadır. Bu, saldırganların kullanıcı profilleri veya mesajlar aracılığıyla zararlı betikler enjekte etmesine olanak tanıyabilir.

**Görevler:**
- [ ] Projeye `DOMPurify` gibi kanıtlanmış bir sanitizasyon kütüphanesi ekle.
- [ ] Veritabanına kaydedilen tüm kullanıcı girdilerinin bu kütüphane kullanılarak temizlendiğinden emin ol.
- [ ] Girdilerin ekranda gösterilirken encode edildiğini doğrula.

**Etiketler:** `security`, `critical`, `p0`, `xss`
**Atanacak Kişi:** @developer

---

### Issue #4: Yüksek - Güvensiz API Anahtarı Yönetimi

**Başlık:** Yüksek Öncelikli Güvenlik Açığı: Hardcoded API Anahtarı Riski

**Açıklama:**
`ApiService.ts` dosyasında bulunan bir API anahtarı placeholder'ı, hassas bilgilerin kaynak kodunda saklanması riskini göstermektedir. Bu, anahtarın sızdırılmasına ve kötüye kullanılmasına yol açabilir.

**Görevler:**
- [ ] Projeye `react-native-config` veya benzeri bir sır yönetim aracı ekle.
- [ ] Tüm API anahtarlarını ve sırları bir `.env` dosyasına taşı.
- [ ] `.env` dosyasının `.gitignore` içinde olduğundan emin ol.
- [ ] Kodun anahtarları ortam değişkenlerinden okuduğundan emin ol.

**Etiketler:** `security`, `high`, `p1`, `config`
**Atanacak Kişi:** @developer
