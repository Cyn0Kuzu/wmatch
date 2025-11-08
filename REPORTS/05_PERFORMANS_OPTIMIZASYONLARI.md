# 🚀 WMatch - Backend Performans Optimizasyonları Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının backend performansını kökten iyileştirmek için en kritik ve etkili adımları sunmaktadır. Mevcut mimari, eşleştirme (match) algoritmasını istemci (client) tarafında çalıştırarak hem performansı düşürmekte hem de maliyetleri artırmaktadır. Bu rehber, bu mantığı sunucuya (server-side) taşıyarak uygulamayı ölçeklenebilir ve verimli hale getirmeyi amaçlamaktadır.

---

## 2. Kritik Optimizasyon: Eşleştirme Mantığını Sunucuya Taşıma

**Sorun:** Eşleştirme algoritması, tüm kullanıcı veritabanını istemciye çeker ve tüm hesaplamaları cihaz üzerinde yapar. Bu, sürdürülebilir değildir.

**Çözüm:** Eşleştirme mantığını tamamen bir **Firebase Callable Function**'a taşıyın.

### Uygulama Adımları:

1.  **Firebase Function Oluştur (`findMatches`):**
    -   `functions` klasöründe, `findMatches` adında yeni bir HTTPS Callable Function oluşturun. Bu fonksiyon, istemciden gelen istekleri işleyecektir.

    **Örnek Kod (`functions/index.js`):**

    ```javascript
    const functions = require("firebase-functions");
    const admin = require("firebase-admin");

    // ... (admin.initializeApp() ve db tanımı)

    exports.findMatches = functions.region("europe-west1").https.onCall(async (data, context) => {
      // 1. Kullanıcı kimliğini doğrula
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Bu işlemi yapmak için oturum açmalısınız.");
      }
      const userId = context.auth.uid;
      const filters = data.filters || {};

      // 2. Mevcut kullanıcı bilgilerini al
      const currentUserDoc = await db.collection("users").doc(userId).get();
      if (!currentUserDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Kullanıcı profili bulunamadı.");
      }
      const currentUserData = currentUserDoc.data();
      const swipedUserIds = currentUserData.social?.swipedUsers || [];

      // 3. Hedeflenmiş Firestore sorgusu oluştur
      let query = db.collection("users");

      // Yaş ve cinsiyet gibi temel filtreleri uygula
      if (filters.gender && filters.gender !== 'all') {
        query = query.where('profile.gender', '==', filters.gender);
      }
      if (filters.ageRange) {
        query = query.where('profile.age', '>=', filters.ageRange[0]);
        query = query.where('profile.age', '<=', filters.ageRange[1]);
      }
      // Son 30 günde aktif olan kullanıcıları önceliklendir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.where('lastActivity', '>=', thirtyDaysAgo);

      // NOT: Bu sorguların çalışması için Firestore'da birleşik indeksler gereklidir.

      const querySnapshot = await query.limit(200).get(); // Aday sayısını sınırla

      const potentialMatches = [];
      querySnapshot.forEach(doc => {
        // Kendini ve daha önce swipe yapılanları hariç tut
        if (doc.id !== userId && !swipedUserIds.includes(doc.id)) {
          potentialMatches.push({ id: doc.id, ...doc.data() });
        }
      });

      // 4. Skorlama ve sıralama mantığını burada çalıştır
      const scoredMatches = potentialMatches.map(user => {
        const score = calculateMatchScore(currentUserData, user); // Bu fonksiyonu implemente et
        return { ...user, matchScore: score };
      }).filter(user => user.matchScore > 0.3); // Minimum skoru geçenleri al

      // 5. Sonuçları sırala ve sınırla
      const finalMatches = scoredMatches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);

      // 6. İstemciye sadece gerekli verileri döndür
      return finalMatches.map(user => ({
        id: user.id,
        firstName: user.firstName,
        age: user.profile.age,
        profilePhotos: user.profilePhotos,
        matchScore: user.matchScore
      }));
    });
    ```

2.  **`MatchService`'i Güncelle:**
    -   İstemci tarafındaki `MatchService.ts` dosyasını, bu yeni Firebase Function'ı çağıracak şekilde basitleştirin.

    **Örnek Kod (`src/services/MatchService.ts`):**

    ```typescript
    import { getFunctions, httpsCallable } from 'firebase/functions';

    export class MatchService {
      // ...

      public async getCurrentlyWatchingMatches(userId: string, filters: any): Promise<MatchProfile[]> {
        try {
          performanceMonitor.startMetric('find_matches_callable');
          const functions = getFunctions();
          const findMatches = httpsCallable(functions, 'findMatches');

          const result = await findMatches({ filters });

          performanceMonitor.endMetric('find_matches_callable');
          return result.data as MatchProfile[];
        } catch (error) {
          logger.error('Error calling findMatches function', 'MatchService', error);
          throw error;
        }
      }

      // ... (diğer eski eşleştirme fonksiyonlarını kaldır)
    }
    ```

3.  **`FirestoreService.getAllUsers()` Fonksiyonunu Kaldır:**
    -   `FirestoreService.ts` içindeki `getAllUsers` ve `getAllUsersOld` fonksiyonlarını silin. Bu fonksiyonların istemci tarafından çağrılmasına artık gerek yoktur ve tehlikelidir.

---

## 3. Veritabanı Optimizasyonu: İndeksleme ve Veri Yapısı

**Sorun:** Mevcut veri yapısı ve eksik indeksler, verimli sorgulamayı engelliyor.

**Çözüm:** Eşleştirme sorgularını desteklemek için birleşik indeksler oluşturun ve veri yapısını optimize edin.

1.  **Birleşik İndeksler Ekle:**
    -   Yukarıdaki `findMatches` fonksiyonunda oluşturulan `where` sorgularının verimli çalışabilmesi için `firestore.indexes.json` dosyasına gerekli birleşik indeks tanımlamalarını ekleyin. Örnek bir tanım `05_FIRESTORE_INDEXES.json` dosyasında sunulmuştur.

2.  **Veriyi Denormalize Et (İsteğe Bağlı, İleri Seviye):**
    -   Eşleştirmeyi daha da hızlandırmak için, sık kullanılan ve değişmeyen verileri (örneğin, kullanıcının en sevdiği 3 film türü) doğrudan ana kullanıcı dökümanına bir alan olarak ekleyebilirsiniz. Bu, eşleştirme sırasında ek sorgu yapma ihtiyacını azaltır.

Bu adımlar, WMatch uygulamasının backend performansını önemli ölçüde iyileştirecek, maliyetleri düşürecek ve uygulamanın kullanıcı sayısı arttıkça ölçeklenebilmesini sağlayacaktır.
