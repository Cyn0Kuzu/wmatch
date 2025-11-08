# ⚡ WMatch - Frontend Performans Denetim Raporu (Faz 2)

**Tarih:** 2025-11-08
**Öncelik:** 🟡 Yüksek

---

## Executive Summary

Bu denetim, WMatch uygulamasının frontend performansını, özellikle de kullanıcı etkileşiminin yoğun olduğu kritik ekranlardaki potansiyel darboğazları analiz etmektedir. Analiz, `MatchScreen` ve `LikedScreen` başta olmak üzere, uygulamanın genelinde performansı ve kullanıcı deneyimini olumsuz etkileyen ciddi verimsizlikler olduğunu ortaya koymuştur.

Ana sorunlar, **N+1 sorgu problemi** nedeniyle yavaş veri çekme, **gereksiz yeniden render'lar (re-renders)**, **büyük ve memoize edilmemiş component'ler** ve **verimsiz state yönetimi** olarak özetlenebilir. Bu sorunlar, uygulamanın yavaş yüklenmesine, takılmasına ve pil tüketiminin artmasına neden olmaktadır.

Bu raporda, tespit edilen her bir performans sorununun detayı ve bu sorunları gidermek için uygulanabilecek optimizasyon stratejileri sunulmaktadır.

---

## 🔴 P0 - Kritik Performans Sorunları

### 1. `LikedScreen`: N+1 Sorgu Problemi ve Yavaş Yüklenme

-   **Sorun:** `LikedScreen`, hem kullanıcının beğendiği kişilerin hem de kendisini beğenenlerin listesini yüklerken, her bir kullanıcı profili için ayrı bir Firestore sorgusu (`firestoreService.getUserDocument`) yapmaktadır. Eğer bir kullanıcının 100 beğenisi varsa, bu ekranın yüklenmesi için **200+ ayrı Firestore okuma işlemi** (100 kendi beğendiği + 100 onu beğenen) yapılmaktadır. Bu, en kritik performans darboğazıdır.
-   **Kök Neden:** Verilerin toplu olarak (batch) çekilmesi yerine bir döngü içinde tek tek çekilmesi.
-   **Etki:**
    -   Ekranın yüklenme süresi, beğeni sayısıyla doğru orantılı olarak katlanarak artar.
    -   Firestore okuma maliyetleri gereksiz yere yükselir.
    -   Kullanıcı, uzun süre bir yükleme ekranı (loading spinner) görür.
-   **Çözüm Önerisi:**
    -   **Toplu Veri Çekme (Batch Fetching):** `Promise.all` ile birleştirilmiş tek bir `where('__name__', 'in', [...userIds])` sorgusu kullanarak, 10'a kadar kullanıcı dökümanını tek bir Firestore isteğiyle getirin. Firestore'un `in` operatörü 10 ID ile sınırlıdır, bu nedenle 100 ID'lik bir liste için 10 ayrı toplu istek yapmak, 100 ayrı istek yapmaktan çok daha verimlidir.
    -   **Sunucu Taraflı Toplama (Backend Aggregation):** Daha ölçeklenebilir bir çözüm olarak, kullanıcıların beğeni listelerini getiren tek bir Firebase Function (Callable Function) oluşturun. Bu fonksiyon, sunucu tarafında tüm verileri toplayıp tek bir yanıtla istemciye döner.

---

## 🟡 P1 - Yüksek Öncelikli Performans Sorunları

### 2. `MatchScreen`: Gereksiz Yeniden Render'lar ve Verimsiz State Yönetimi

-   **Sorun:** `MatchScreen`'de her "like" veya "pass" işleminden sonra `setCurrentUserIndex` çağrılır. Bu, tüm `MatchScreen` component'inin ve dolayısıyla `EnhancedMatchCard` dahil tüm alt component'lerinin yeniden render olmasına neden olur.
-   **Kök Neden:** State'in en üst seviyede tutulması ve güncellenmesi, tüm component ağacını etkilemektedir. `EnhancedMatchCard`'a `React.memo` eklenmiş olsa da, `user` prop'u her render'da yeni bir nesne olarak geldiği için memoization çalışmaz.
-   **Etki:**
    -   Uygulamada takılmalara (jank) ve akıcı olmayan animasyonlara neden olur.
    -   Pil tüketimini artırır.
-   **Çözüm Önerisi:**
    -   **State'i Aşağı Taşıma (Lifting State Down):** `users` listesini ve `currentUserIndex`'i `MatchScreen`'de tutmak yerine, bu mantığı `EnhancedMatchCard`'ı render eden bir "Swiper" component'ine taşıyın. `MatchScreen` sadece `Swiper`'ı render etmeli, swipe mantığı ise `Swiper` içinde yönetilmelidir.
    -   **`FlatList` Kullanımı:** `users` dizisini, `FlatList` component'i kullanarak render edin. `FlatList`, sadece görünürdeki kartları render ederek performansı optimize eder. `renderItem` prop'una geçirilen component'in (`EnhancedMatchCard`) `React.memo` ile sarmalanması, bu durumda etkili olacaktır.

### 3. `EnhancedMatchCard`: Büyük ve Karmaşık Component

-   **Sorun:** `EnhancedMatchCard`, içinde sekmeler, filtreler, yatay kaydırılabilir listeler ve modal gibi birçok state'li mantık barındıran devasa bir component'tir. Bu, hem okunabilirliği düşürür hem de performans optimizasyonunu zorlaştırır.
-   **Kök Neden:** Sorumlulukların tek bir component'te birleştirilmesi.
-   **Etki:**
    -   Component'in herhangi bir küçük state değişikliği (örneğin, sekme değişimi), tüm kartın yeniden render olmasına neden olabilir.
    -   Kodun bakımı ve hata ayıklaması zordur.
-   **Çözüm Önerisi:**
    -   **Component'i Parçalara Ayırma:** `EnhancedMatchCard`'ı daha küçük, odaklanmış component'lere bölün. Örneğin:
        -   `UserProfileHeader`
        -   `InterestTags`
        -   `MovieTabs` (kendi state'ini yöneten: `activeTab`, `mediaType`)
        -   `HorizontalMovieList`
    -   Her alt component'i `React.memo` ile sarmalayarak, sadece prop'ları değiştiğinde yeniden render olmalarını sağlayın.

### 4. `FlatList` ve `ScrollView` Optimizasyon Eksiklikleri

-   **Sorun:** Uygulama genelinde, özellikle `EnhancedMatchCard` içindeki yatay listelerde, `ScrollView` kullanılarak uzun listeler render edilmektedir. `ScrollView`, tüm elemanları aynı anda render ettiği için performans sorunlarına yol açar.
-   **Kök Neden:** Uzun listeler için `FlatList` veya `FlashList` yerine `ScrollView`'un tercih edilmesi.
-   **Etki:**
    -   Başlangıç render süresi uzar.
    -   Hafıza kullanımı artar.
-   **Çözüm Önerisi:**
    -   **`FlatList` Kullanımı:** `ScrollView`'da `.map()` ile render edilen tüm listeleri, `FlatList` component'i ile değiştirin.
    -   **`getItemLayout` Optimizasyonu:** Eğer liste elemanlarının yüksekliği sabitse, `getItemLayout` prop'unu kullanarak render performansını daha da artırın.
    -   **`FlashList` Değerlendirmesi:** En yüksek performans için, Shopify tarafından geliştirilen `@shopify/flash-list` kütüphanesini değerlendirin.

---

## 4. Genel Optimizasyon Önerileri

-   **Görsel Optimizasyonu:** `Image` component'lerinde, resimlerin boyutlarının (width, height) sabit olarak belirtilmesi ve uygun `resizeMode` kullanılması, render performansını iyileştirir. Ayrıca, `react-native-fast-image` gibi kütüphanelerle agresif caching stratejileri uygulanabilir.
-   **`useCallback` ve `useMemo` Kullanımı:** Fonksiyonları (`handleLike`, `handlePass` gibi) ve hesaplanmış değerleri, gereksiz yeniden oluşturmaları önlemek için `useCallback` ve `useMemo` hook'ları ile sarmalayın. Bağımlılık dizilerini (`dependency array`) doğru şekilde yönettiğinizden emin olun.
-   **Bundle Boyutu Analizi:** `react-native-bundle-visualizer` gibi araçlar kullanarak uygulamanın bundle boyutunu analiz edin ve gereksiz veya büyük kütüphaneleri tespit edip optimize edin.
