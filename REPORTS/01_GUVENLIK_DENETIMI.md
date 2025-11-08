# 🔐 WMatch - Güvenlik Denetimi Raporu (Faz 1)

**Tarih:** 2025-11-08
**Öncelik:** 🔴 Kritik

---

##  executive Summary

Bu denetim, WMatch uygulamasının güvenlik durumunu analiz etmektedir. Analiz sonucunda, uygulamanın kritik düzeyde güvenlik açıkları barındırdığı ve kullanıcı verilerinin risk altında olduğu tespit edilmiştir. En acil sorunlar, tamamen açık olan Firestore veritabanı kuralları, zayıf kimlik doğrulama politikaları ve yetersiz girdi temizleme (input sanitization) mekanizmalarıdır.

Bu raporda, tespit edilen her bir zafiyetin detayı, potansiyel etkileri ve acil olarak uygulanması gereken çözüm önerileri sunulmaktadır.

---

## 🔴 P0 - Kritik Zafiyetler

### 1. Firestore Veritabanı Tamamen Korumasız

- **Sorun:** `firestore.rules` dosyası, tüm veritabanına kimlik doğrulaması olmaksızın tam okuma ve yazma izni vermektedir (`allow read, write: if true;`).
- **Kök Neden:** Geliştirme kolaylığı için güvenlik kurallarının devre dışı bırakılması.
- **Etki:** Herhangi bir saldırgan, tüm kullanıcı verilerini (mesajlar, profiller, eşleşmeler dahil) okuyabilir, değiştirebilir veya silebilir. Bu durum, tam bir veri sızıntısına ve sistemin sabote edilmesine yol açabilir.
- **Çözüm Önerisi:** Aşağıdaki adımlarla katı ve role-based güvenlik kuralları derhal uygulanmalıdır:
    1.  Varsayılan olarak tüm erişimi engelle (`allow read, write: if false;`).
    2.  Kullanıcıların sadece kendi verilerini okuyup yazabilmesini sağla.
    3.  Koleksiyonlar arasında (örneğin, eşleşen kullanıcıların birbirinin profilini görmesi gibi) belirli ve kısıtlı erişim kuralları tanımla.
    4.  Sunucu tarafı doğrulamaları (Firebase Functions) için özel kurallar ekle.
- **Test Planı:**
    - Yetkisiz bir kullanıcının veri okuma/yazma girişimlerinin başarısız olduğunu doğrula.
    - Bir kullanıcının başka bir kullanıcının özel verilerini (örn. ayarlar) okuyamadığını doğrula.
    - Eşleşen kullanıcıların mesajlaşma koleksiyonuna yazabildiğini doğrula.

### 2. Zayıf Brute-Force Koruması

- **Sorun:** `SecurityManager.ts` içinde `maxLoginAttempts` değeri `50` gibi çok yüksek bir değere, `lockoutDuration` ise sadece `30` saniyeye ayarlanmıştır.
- **Kök Neden:** Geliştirme sırasında testleri kolaylaştırmak için güvenlik ayarlarının gevşetilmesi.
- **Etki:** Saldırganlar, kullanıcı hesaplarına karşı neredeyse hiçbir engelleme olmadan brute-force (kaba kuvvet) saldırıları düzenleyebilir.
- **Çözüm Önerisi:** Bu değerler daha güvenli seviyelere çekilmelidir:
    - `maxLoginAttempts`: `5`
    - `lockoutDuration`: `15 * 60 * 1000` (15 dakika)
- **Test Planı:**
    - 5 hatalı giriş denemesinden sonra hesabın kilitlendiğini doğrula.
    - Kilitlendikten sonra 15 dakika boyunca giriş yapılamadığını doğrula.

### 3. Yetersiz ve Kolayca Atlatılabilir Girdi Temizleme (Input Sanitization)

- **Sorun:** `SecurityManager.ts` içindeki `sanitizeInput` metodu, basit bir "blacklist" yaklaşımı kullanarak tehlikeli karakterleri (`<`, `>`, `javascript:`) değiştirmektedir.
- **Kök Neden:** Güvenli sanitizasyon için standart ve test edilmiş kütüphaneler yerine özel, basit bir fonksiyonun kullanılması.
- **Etki:** Bu yöntem, XSS (Cross-Site Scripting) saldırılarına karşı yetersizdir. Saldırganlar, kullanıcı profilleri veya mesajlar aracılığıyla zararlı betikler enjekte ederek diğer kullanıcıların oturum bilgilerini çalabilir veya istenmeyen eylemler gerçekleştirebilir.
- **Çözüm Önerisi:** Güçlü ve kanıtlanmış bir sanitizasyon kütüphanesi (örneğin, `DOMPurify` veya benzeri bir React Native alternatifi) kullanılmalıdır. Girdiler, veritabanına kaydedilmeden önce temizlenmeli ve ekranda gösterilirken daima encode edilmelidir.
- **Test Planı:**
    - `<script>alert('xss')</script>` gibi basit XSS payload'larının temizlendiğini doğrula.
    - `img src=x onerror=alert(1)` gibi event-handler tabanlı payload'ların engellendiğini doğrula.

---

## 🟡 P1 - Yüksek Öncelikli Zafiyetler

### 4. Güvensiz API Anahtarı Yönetimi

- **Sorun:** `ApiService.ts` dosyasında TMDB API anahtarı için bir placeholder bulunmaktadır. Bu, anahtarların kaynak kodunda saklanma riskini göstermektedir.
- **Kök Neden:** Hassas bilgilerin ortam değişkenleri (environment variables) yerine doğrudan kod içinde yönetilmesi eğilimi.
- **Etki:** API anahtarının kaynak koduna dahil edilmesi, anahtarın yetkisiz kişilerce ele geçirilmesine ve kötüye kullanılmasına neden olabilir. Bu durum, API limitlerinin hızla tükenmesine veya servis sağlayıcı ile olan sözleşmenin ihlaline yol açabilir.
- **Çözüm Önerisi:** Tüm API anahtarları ve hassas yapılandırma bilgileri, `.env` dosyaları ve `react-native-config` gibi kütüphaneler aracılığıyla yönetilmelidir. Anahtarlar asla Git repositorisine commit edilmemelidir.
- **Test Planı:**
    - Kod içinde `grep` komutuyla "API_KEY" veya benzeri anahtar kelimeler aratıldığında hiçbir hassas bilginin bulunmadığını doğrula.
    - Uygulamanın, ortam değişkenlerinden okunan anahtarla başarıyla çalıştığını doğrula.

### 5. Kriptografik Olarak Güvensiz Rastgele Sayı Üretimi

- **Sorun:** `SecurityManager.ts` içindeki `generateSecureToken` metodu, güvenlik açısından zayıf olan `Math.random()` fonksiyonunu kullanmaktadır.
- **Kök Neden:** Kriptografik işlemler için tasarlanmamış standart bir fonksiyonun kullanılması.
- **Etki:** `Math.random()` ile üretilen token'lar tahmin edilebilirdir. Eğer bu token'lar oturum yönetimi veya parola sıfırlama gibi kritik işlemlerde kullanılırsa, saldırganlar bu token'ları tahmin ederek hesapları ele geçirebilir.
- **Çözüm Önerisi:** `react-native-get-random-values` veya benzeri, `crypto.getRandomValues` kullanan bir kütüphane ile kriptografik olarak güvenli rastgele değerler üretilmelidir.
- **Test Planı:**
    - Üretilen token'ların istatistiksel olarak rastgele olduğunu (eğer mümkünse) test et.
    - Kodun artık `Math.random()` kullanmadığını doğrula.

### 6. Firebase Storage Kurallarında Yetkilendirme Zafiyeti

- **Sorun:** `storage.rules` dosyasında, `/movies/` ve `/system/` yollarına yazma izni, kimliği doğrulanmış *herhangi bir* kullanıcıya verilmektedir (`allow write: if request.auth != null;`).
- **Kök Neden:** Rol tabanlı erişim kontrolü yerine sadece kimlik doğrulama kontrolünün yapılması.
- **Etki:** Kötü niyetli bir kullanıcı, bu yollara büyük boyutlu veya zararlı dosyalar yükleyerek depolama maliyetlerini artırabilir veya diğer kullanıcılara zarar verebilir.
- **Çözüm Önerisi:** Yazma işlemleri, sadece belirli yetkilere (örneğin, "admin" rolü) sahip kullanıcılarla sınırlandırılmalıdır. Bu, Firebase Auth custom claims veya Firestore içindeki bir roller koleksiyonu ile yönetilebilir.
- **Test Planı:**
    - Standart bir kullanıcının `/system/` yoluna dosya yükleme girişiminin başarısız olduğunu doğrula.
    - Admin rolüne sahip bir kullanıcının dosya yükleyebildiğini doğrula.
