# 🚀 WMatch - Backend Performans Denetim Raporu (Faz 2)

**Tarih:** 2025-11-08
**Öncelik:** 🟡 Yüksek

---

## Executive Summary

Bu denetim, WMatch uygulamasının backend performansını, özellikle de Firestore sorgu verimliliğini ve temel iş mantığı olan eşleştirme (match) algoritmasının performansını analiz etmektedir. Analiz, uygulamanın ölçeklenmesini ve kabul edilebilir bir kullanıcı deneyimi sunmasını engelleyen **kritik düzeyde backend performans sorunları** olduğunu ortaya koymuştur.

Ana sorunlar, **tüm kullanıcı veritabanının istemciye çekilmesi**, eşleştirme algoritmasının tamamen **istemci tarafında çalıştırılması** ve bu süreçte ortaya çıkan **N+1 sorgu problemleridir**. Bu durum, hem istemci cihazını aşırı yormakta hem de Firestore kullanım maliyetlerini fahiş seviyelere çıkarma potansiyeli taşımaktadır.

Bu raporda, tespit edilen her bir performans sorununun detayı ve bu sorunları çözmek için sunucu tarafı (server-side) çözümleri içeren bir yol haritası sunulmaktadır.

---

## 🔴 P0 - Kritik Performans Sorunları

### 1. `MatchService`: Tüm Kullanıcı Veritabanının İstemciye Çekilmesi

-   **Sorun:** `MatchService` içindeki `getCurrentlyWatchingMatches` ve `getWatchedContentMatches` gibi ana eşleştirme fonksiyonları, işleme `this.firestoreService.getAllUsers()` çağrısıyla başlamaktadır. Bu fonksiyon, **hiçbir filtreleme veya sayfalama (pagination) olmadan** `users` koleksiyonundaki **tüm dökümanları** istemcinin hafızasına yükler.
-   **Kök Neden:** Eşleştirme algoritmasının, tüm potansiyel adayları değerlendirmek üzere tasarlanması ve bu işlemin istemci tarafında yapılması.
-   **Etki:**
    -   **Ölçeklenemezlik:** Kullanıcı sayısı arttıkça (örneğin, 10,000 kullanıcı), her bir istemci on binlerce dökümanı indirmek zorunda kalır. Bu, hem ağ trafiği hem de hafıza kullanımı açısından sürdürülemezdir.
    -   **Yüksek Firestore Maliyetleri:** Her eşleştirme isteği, `users` koleksiyonundaki döküman sayısı kadar okuma (read) işlemi başlatır. Bu, Firestore maliyetlerini hızla artırır.
    -   **Kötü Performans:** Eşleştirme süreci, tüm veriler indirilene kadar başlayamaz, bu da kullanıcı için uzun bekleme süreleri anlamına gelir.

### 2. Eşleştirme Algoritmasının İstemci Tarafında Çalıştırılması

-   **Sorun:** Tüm eşleştirme mantığı – kullanıcılar arasında döngüye girme, her bir kullanıcının film listelerini çekme, filtreleme ve eşleşme skoru hesaplama – tamamen kullanıcının cihazında (client-side) gerçekleşmektedir.
-   **Kök Neden:** Sunucu tarafı (server-side) bir iş mantığı katmanının bulunmaması.
-   **Etki:**
    -   **Cihaz Kaynaklarının Tükenmesi:** Bu ağır hesaplama, özellikle düşük donanımlı cihazlarda uygulamanın yavaşlamasına, takılmasına ve hatta çökmesine neden olabilir. Pil tüketimini ciddi şekilde artırır.
    -   **Güvenlik Riski:** İş mantığının istemcide olması, tersine mühendislik (reverse engineering) ile kolayca analiz edilebilir ve manipüle edilebilir.
    -   **Tutarsızlık:** Algoritma güncellendiğinde, tüm kullanıcıların uygulamayı güncellemesi gerekir, aksi takdirde farklı kullanıcılar farklı eşleştirme mantıkları çalıştırabilir.

### 3. `MatchService` İçindeki N+1 Sorgu Problemi

-   **Sorun:** `getCurrentlyWatchingMatches` fonksiyonu, tüm kullanıcıları çektikten sonra, bir döngü içinde her bir kullanıcı için `this.userDataManager.getCurrentlyWatching(userId)` fonksiyonunu çağırır. Bu, `getAllUsers` tarafından yapılan ilk sorguya ek olarak, N (kullanıcı sayısı kadar) ek sorgu yapılmasına neden olur.
-   **Kök Neden:** Verilerin toplu olarak çekilmesi yerine, bir döngü içinde her kullanıcı için ayrı ayrı çekilmesi.
-   **Etki:** Bir eşleştirme isteği, `1 (tüm kullanıcılar) + N (her kullanıcının izlediği filmler) + M (her kullanıcının favorileri vb.)` şeklinde yüzlerce veya binlerce Firestore okuma işlemine neden olabilir. Bu, hem maliyet hem de performans açısından kabul edilemezdir.

---

## 2. Çözüm Önerileri: Sunucu Taraflı Eşleştirme

Bu sorunların tek kalıcı ve ölçeklenebilir çözümü, eşleştirme mantığını tamamen sunucu tarafına taşımaktır.

### A. Firebase Callable Function ile Eşleştirme Endpoint'i Oluşturma

-   **Öneri:** `findMatches` adında bir **Firebase Callable Function** oluşturun. Bu fonksiyon, istemciden mevcut kullanıcının ID'sini ve filtre tercihlerini alır, sunucu tarafında tüm eşleştirme mantığını çalıştırır ve istemciye sadece sonuç olan eşleşme profillerini döndürür.

-   **Avantajları:**
    -   **Verimlilik:** Sunucu, verilere doğrudan ve hızlı bir şekilde erişebilir. İstemciye sadece işlenmiş sonuçlar gönderilir, binlerce döküman değil.
    -   **Ölçeklenebilirlik:** Kullanıcı sayısı ne kadar artarsa artsın, istemcinin performansı etkilenmez. Yük, ölçeklenebilir Firebase altyapısı tarafından karşılanır.
    -   **Düşük Maliyet:** Sunucu tarafında yapılan sorgular daha optimize edilebilir. Örneğin, tüm kullanıcıları çekmek yerine, sadece belirli kriterlere uyan (örneğin, coğrafi konum, aktiflik durumu) kullanıcıları sorgulayabilirsiniz.
    -   **Güvenlik ve Tutarlılık:** Algoritma merkezi ve güvenli bir yerde bulunur.

### B. Firestore Sorgularını Optimize Etme ve İndeksleme

-   **Öneri:** Sunucu tarafı eşleştirme mantığında, verimsiz sorgulardan kaçının.
    -   **İndeksleme:** Eşleştirme için kullanılacak alanlarda (örneğin, `profile.gender`, `profile.age`, `lastActivity`) birleşik (composite) indeksler oluşturun. Bu, `firestore.indexes.json` dosyasında tanımlanmalıdır.
    -   **Akıllı Filtreleme:** Tüm kullanıcıları çekmek yerine, öncelikle temel kriterlere göre (örneğin, son 1 hafta içinde aktif olan, coğrafi olarak yakın olan, yaş aralığına uyan) bir ön filtreleme yapın. Bu, işlem yapılacak aday sayısını önemli ölçüde azaltır.
    -   **Veri Denormalizasyonu:** Eşleştirmeyi hızlandırmak için kritik verileri (örneğin, kullanıcının en sevdiği 5 tür) ana kullanıcı dökümanında denormalize edin.

---

## 3. Implementasyon Planı

1.  **`findMatches` Callable Function'ı Oluştur:**
    -   `functions` projesinde, `findMatches` adında yeni bir HTTPS Callable Function oluşturun.
    -   Bu fonksiyon, `context.auth.uid` ile çağıran kullanıcının kimliğini doğrulamalıdır.
    -   İstemciden gelen filtreleri (yaş, cinsiyet vb.) almalıdır.

2.  **Eşleştirme Mantığını Sunucuya Taşı:**
    -   `MatchService.ts` içindeki tüm algoritmayı bu yeni fonksiyona taşıyın.
    -   `firestoreService.getAllUsers()` yerine, `admin.firestore().collection('users').where(...)` gibi hedeflenmiş sorgular kullanın.

3.  **İstemciyi Güncelle:**
    -   `MatchService.ts`'i, karmaşık mantığı çalıştırmak yerine sadece bu yeni `findMatches` fonksiyonunu çağıracak şekilde basitleştirin.
    -   `const findMatches = httpsCallable(functions, 'findMatches'); const result = await findMatches({ filters });`

4.  **Firestore İndekslerini Tanımla:**
    -   `firestore.indexes.json` dosyasını, yeni sorgularınızı destekleyecek şekilde gerekli birleşik indekslerle güncelleyin.
