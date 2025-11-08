# 📊 WMatch - Monitoring Araçları Önerileri

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu belge, WMatch uygulamasının üretim (production) ortamındaki sağlığını, performansını ve stabilitesini proaktif olarak izlemek için kullanılması önerilen temel araçları ve servisleri özetlemektedir. Amaç, hataları kullanıcılardan önce tespit etmek ve performansı sürekli olarak optimize etmektir.

---

## 2. Araç Önerileri

### A. Hata ve Çökme Raporlama (Error & Crash Reporting)

-   **Önerilen Araç:** **Sentry**
-   **Neden?**
    -   **React Native Desteği:** `@sentry/react-native` paketi ile JavaScript ve native (Java/Kotlin/Swift) katmanlarındaki hataları ve çökmeleri yakalar.
    -   **Source Map Desteği:** Üretimdeki minified JavaScript kodundan kaynaklanan hataları, okunabilir kod satırlarına dönüştürür.
    -   **Zengin Bağlam (Context):** Her hata raporuyla birlikte cihaz modelini, işletim sistemi versiyonunu, kullanıcının son eylemlerini (Breadcrumbs) ve uygulama versiyonunu otomatik olarak gönderir.
    -   **Performans İzleme:** Frontend performans metriklerini (ekran yüklenme süreleri, yavaş render'lar) izleme yeteneği sunar.

### B. Kullanıcı Analitikleri (User Analytics)

-   **Önerilen Araç:** **Firebase Analytics**
-   **Neden?**
    -   **Kolay Entegrasyon:** Mevcut Firebase projesiyle sorunsuz ve hızlı bir şekilde entegre olur. `@react-native-firebase/analytics` paketi ile kolayca kullanılabilir.
    -   **Ücretsiz ve Cömert Limitler:** Geniş bir kullanım için ücretsizdir.
    -   **Kitle (Audience) Segmentasyonu:** Kullanıcıları davranışlarına, demografik bilgilerine veya cihaz türlerine göre segmentlere ayırarak hedefli analiz yapma imkanı sunar.
    -   **Funnel (Huni) Analizi:** Kayıt süreci gibi çok adımlı kullanıcı akışlarında, kullanıcıların hangi adımda süreci terk ettiğini görselleştirir.

### C. Log Yönetimi (Log Management)

-   **Öneri:** **Sentry'nin "Breadcrumbs" Özelliği (Başlangıç İçin)**
-   **Neden?**
    -   **Maliyet Etkin:** Ayrı bir loglama servisine başlangıçta yatırım yapmadan, Sentry'nin bir parçası olarak gelir.
    -   **Bağlamsal Değer:** Loglar, hatalarla doğrudan ilişkilendirilir. Bir hata raporunu incelerken, o hataya yol açan adımları (logları) aynı ekranda görmek, hata ayıklamayı (debugging) %90 oranında hızlandırır.
-   **İleri Seviye Alternatif:** **Datadog** veya **Logtail**
    -   Uygulama büyüdükçe ve sunucu tarafı (Firebase Functions) loglarının da merkezi olarak toplanması gerektiğinde, bu servisler daha gelişmiş arama, filtreleme ve uyarı (alerting) mekanizmaları sunar. Ancak başlangıç için Sentry yeterlidir.

### D. Performans İzleme (Performance Monitoring)

-   **Önerilen Araçlar:** **Sentry Performance** ve **Firebase Performance Monitoring**
-   **Neden (Her İkisi Birden)?**
    -   **Sentry Performance:** Frontend odaklıdır. React Native component'lerinin render sürelerini, ekranlar arası geçişlerin ne kadar sürdüğünü ve yavaş işlemleri (slow transactions) tespit etmede güçlüdür.
    -   **Firebase Performance Monitoring:** Hem frontend hem de backend (ağ istekleri) performansını izler. Özellikle API isteklerinin yanıt sürelerini, başarı oranlarını ve farklı ağ koşullarındaki (4G, Wi-Fi) performansını analiz etmek için kullanışlıdır.
    -   Bu iki araç birbirini tamamlar.

---

## 3. Özet Tablo

| Kategori | Önerilen Araç | Entegrasyon Önceliği | Temel Faydası |
| :--- | :--- | :--- | :--- |
| **Hata/Çökme Raporlama** | Sentry | 🔴 **Acil** | Production'daki hatalardan anında haberdar olmak. |
| **Kullanıcı Analitikleri** | Firebase Analytics | 🟡 **Yüksek** | Kullanıcı davranışını anlamak, veriye dayalı kararlar almak. |
| **Log Yönetimi** | Sentry (Breadcrumbs) | 🟡 **Yüksek** | Hataları ayıklamak için zengin bağlam elde etmek. |
| **Performans İzleme** | Sentry + Firebase | 🟡 **Orta** | Yavaş ekranları ve ağ isteklerini proaktif olarak tespit etmek. |
