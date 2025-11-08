# 🔌 WMatch - API Entegrasyonu ve Dış Servisler Raporu (Faz 3)

**Tarih:** 2025-11-08
**Öncelik:** 🟡 Orta

---

## Executive Summary

Bu denetim, WMatch uygulamasının dış servislerle, özellikle de uygulamanın temel veri kaynağı olan The Movie Database (TMDB) API'si ile olan entegrasyonunu analiz etmektedir. Analiz, servisin işlevsel olmasına rağmen **kritik bir güvenlik açığı**, **tutarsız hata yönetimi** ve **dayanıksız (non-resilient) bir ağ iletişim stratejisi** barındırdığını ortaya koymuştur.

Ana sorunlar, **TMDB API anahtarının kaynak koduna gömülü (hardcoded) olması**, **hataların tutarlı bir şekilde ele alınmaması** ve **ağ hatalarına karşı yeniden deneme (retry) mekanizmasının bulunmamasıdır**. Bu durum, hem uygulamanın güvenliğini tehlikeye atmakta hem de dış serviste yaşanabilecek anlık sorunların kullanıcı için kalıcı hatalara dönüşmesine neden olmaktadır.

Bu raporda, tespit edilen her bir sorun ve API entegrasyonunu daha güvenli, dayanıklı ve verimli hale getirmek için önerilen iyileştirmeler sunulmaktadır.

---

## 🔴 P0 - Kritik Güvenlik Sorunu

### 1. Hardcoded TMDB API Anahtarı

-   **Sorun:** `TMDBService.ts` dosyasında, TMDB API anahtarı doğrudan kaynak kodunun içine `private apiKey: string = 'ddcfa0968883c7e0486957cd244e0350';` şeklinde yazılmıştır.
-   **Kök Neden:** Hassas bilgilerin güvenli bir şekilde yönetilmesi için bir altyapının (ortam değişkenleri - environment variables) kurulmamış olması.
-   **Etki:**
    -   **Güvenlik Zafiyeti:** Uygulamanın kaynak kodu (örneğin, bir APK'nın tersine mühendislikle incelenmesi) ifşa olursa, bu API anahtarı çalınabilir.
    -   **Servis Kesintisi:** Çalınan bir anahtar, kötü niyetli kişiler tarafından TMDB API'sinin rate limit'lerini aşacak şekilde kullanılabilir. Bu, uygulamanın API'ye erişiminin engellenmesine ve tüm uygulamanın işlevsiz kalmasına neden olabilir.
    -   **Zorlu Yönetim:** API anahtarını değiştirmek için kodun değiştirilmesi ve uygulamanın yeniden yayınlanması gerekir.
-   **Çözüm Önerisi (Acil):**
    1.  Mevcut API anahtarını **derhal** TMDB panelinden iptal edin (revoke) ve yenisini oluşturun.
    2.  Yeni API anahtarını, proje kök dizininde oluşturulacak bir `.env` dosyasına `TMDB_API_KEY=yenianahtarınız` şeklinde kaydedin.
    3.  `react-native-dotenv` veya `@env` gibi bir kütüphane kullanarak bu ortam değişkenini `TMDBService.ts` içinde güvenli bir şekilde okuyun.
    4.  `.env` dosyasını `.gitignore`'a ekleyerek asla versiyon kontrolüne dahil edilmediğinden emin olun.

---

## 🟡 P1 - Yüksek Öncelikli İyileştirmeler

### 2. Tutarsız ve Eksik Hata Yönetimi

-   **Sorun:** `TMDBService.ts` içindeki hata yönetimi tutarsızdır. `getPopularMovies` gibi bazı fonksiyonlar, hata durumunda merkezi `errorHandler`'ı çağırıp boş bir dizi dönerken, `searchMovies` ve `getMovieDetails` gibi birçok diğer fonksiyon hatayı sadece `console.error` ile loglayıp `null` veya boş nesne döner.
-   **Kök Neden:** Hata yönetimi için standart bir paternin uygulanmaması.
-   **Etki:**
    -   **Sessiz Hatalar (Silent Failures):** Hataların bir kısmı merkezi olarak izlenmez, bu da sorunların tespit edilmesini ve hata ayıklamayı zorlaştırır.
    -   **Tutarsız Kullanıcı Deneyimi:** Bazı hatalar kullanıcıya bir geri bildirimle sonuçlanırken (eğer `errorHandler` düzgün yapılandırılırsa), bazıları sadece boş bir ekran veya eksik veri ile sonuçlanır.
-   **Çözüm Önerisi:**
    -   **Standart Hata Yönetimi Paterni:** `TMDBService` içindeki **tüm** `catch` bloklarını, merkezi `errorHandler.handleError` fonksiyonunu çağıracak şekilde standartlaştırın. Başarısız bir API isteğinden sonra her zaman tutarlı bir varsayılan değer (örneğin, listeler için `[]`, nesneler için `null`) döndürüldüğünden emin olun.

### 3. Ağ Hatalarına Karşı Yeniden Deneme (Retry) Mekanizmasının Eksikliği

-   **Sorun:** `axios` istemcisi, ağ istekleri başarısız olduğunda otomatik olarak yeniden deneme yapacak şekilde yapılandırılmamıştır.
-   **Kök Neden:** API entegrasyonunda dayanıklılık (resilience) prensibinin göz ardı edilmesi.
-   **Etki:** Anlık bir ağ sorunu veya TMDB sunucularındaki geçici bir yavaşlık, veri yükleme işleminin kalıcı olarak başarısız olmasına neden olur.
-   **Çözüm Önerisi:**
    -   **`axios-retry` Kütüphanesini Kullanın:** `axios-retry` paketini projeye ekleyerek, `axios` istemcisini ağ hatalarında veya sunucu hatalarında (5xx) istekleri otomatik olarak yeniden deneyecek şekilde kolayca yapılandırın. Genellikle, artan bir gecikme ile (exponential backoff) 3 kez denemek iyi bir başlangıç noktasıdır.

---

## 🟡 P2 - Orta Öncelikli İyileştirmeler

### 4. Verimsiz Caching Stratejisi

-   **Sorun:** Caching (önbellekleme), sadece `getPopularMovies` gibi birkaç fonksiyonda manuel olarak uygulanmaktadır. `getMovieDetails`, `getMovieGenres` gibi sık istenen ancak nadiren değişen veriler için caching kullanılmamaktadır.
-   **Kök Neden:** Caching stratejisinin merkezi ve otomatik olmaması.
-   **Etki:** Aynı veriler için TMDB API'sine tekrar tekrar gereksiz istekler yapılır. Bu, hem rate limit'leri daha hızlı tüketir hem de uygulamanın yavaşlamasına neden olur.
-   **Çözüm Önerisi:**
    -   **`@tanstack/react-query` ile Otomatik Caching:** Error Handling raporunda da önerildiği gibi, tüm TMDB veri çekme işlemlerini `react-query`'nin `useQuery` hook'una taşıyın. `react-query`, varsayılan olarak tüm isteklerin sonuçlarını hafızada (in-memory) cache'ler ve `staleTime` gibi seçeneklerle verinin ne kadar süreyle "taze" kabul edileceğini yapılandırmanıza olanak tanır. Bu, manuel `cacheManager` kullanımını ortadan kaldırır ve çok daha güçlü bir caching stratejisi sunar.
