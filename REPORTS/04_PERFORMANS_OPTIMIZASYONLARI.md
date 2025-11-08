# ⚡ WMatch - Frontend Performans Optimizasyonları Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının frontend performansını iyileştirmek için somut, önceliklendirilmiş ve uygulanabilir adımlar sunmaktadır. Öneriler, Faz 2 Frontend Performans Denetimi sırasında tespit edilen kritik darboğazlara odaklanmaktadır.

---

## 2. Yüksek Öncelikli Optimizasyonlar

### A. `LikedScreen`: N+1 Sorgu Problemini Çözme

**Sorun:** Ekran, her bir beğeni için ayrı bir veritabanı sorgusu yaparak çok yavaş yükleniyor.

**Çözüm:** Kullanıcı dökümanlarını toplu (batch) olarak çekin.

**Uygulama Adımları:**

1.  **`fetchUsersByIds` Fonksiyonunu Modifiye Et:** Bu fonksiyonu, ID listesini 10'luk parçalara ayıracak ve her parça için tek bir `where('__name__', 'in', ...)` sorgusu yapacak şekilde güncelleyin.

    **Örnek Kod (`src/screens/LikedScreen.tsx`):**

    ```typescript
    import { collection, query, where, getDocs } from 'firebase/firestore';

    const fetchUsersByIds = async (userIds: string[]) => {
      if (userIds.length === 0) return [];

      const db = firestoreService.getDb(); // Firestore instance'ını alın
      const usersRef = collection(db, 'users');
      const allUsersData = [];

      // Firestore 'in' sorgusu 10 elemanla sınırlıdır.
      for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        const q = query(usersRef, where('__name__', 'in', chunk));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const userDoc = doc.data();
          allUsersData.push({
            id: doc.id,
            firstName: userDoc.firstName || 'Kullanıcı',
            // ... diğer alanlar
          });
        });
      }

      return allUsersData;
    };
    ```

### B. `MatchScreen`: Yeniden Render'ları Azaltmak için `FlatList` Kullanımı

**Sorun:** Her swipe işlemi, tüm ekranın yeniden render olmasına neden olarak takılmalara yol açıyor.

**Çözüm:** Kullanıcı kartlarını `ScrollView` yerine `FlatList` ile render edin. `FlatList`, sadece görünürdeki elemanları render ederek performansı optimize eder.

**Uygulama Adımları:**

1.  **`MatchScreen`'i `FlatList` Kullanacak Şekilde Refactor Edin:**

    **Örnek Kod (`src/screens/MatchScreen.tsx`):**

    ```typescript
    import { FlatList } from 'react-native';

    // ...

    const MatchScreen: React.FC = () => {
      // ... (mevcut state ve fonksiyonlar)

      const renderMatchCard = useCallback(({ item }) => (
        <EnhancedMatchCard
          user={item}
          onPass={() => handlePass(item.id)}
          onLike={() => handleLike(item.id)}
          currentMovie={currentMovie}
        />
      ), [handlePass, handleLike, currentMovie]);

      return (
        <SafeAreaView style={styles.container}>
          {/* ... (Modal ve Header) */}

          <View style={styles.cardSection}>
            <FlatList
              data={users}
              renderItem={renderMatchCard}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={/* ... (isteğe bağlı, index takibi için) */}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              initialNumToRender={1}
              maxToRenderPerBatch={3}
              windowSize={5}
            />
          </View>

          {/* ... (Footer) */}
        </SafeAreaView>
      );
    };
    ```
    *Not: `handlePass` ve `handleLike` fonksiyonlarının artık `currentUserIndex`'e bağlı olmaması, doğrudan kartın ID'sini alması gerekecektir.*

---

## 3. Orta Öncelikli Optimizasyonlar

### C. `EnhancedMatchCard`: Component'i Parçalara Ayırma

**Sorun:** `EnhancedMatchCard`, yönetimi ve optimizasyonu zor olan büyük bir component.

**Çözüm:** Component'i daha küçük, yeniden kullanılabilir ve memoize edilebilir parçalara ayırın.

**Uygulama Adımları:**

1.  **`MovieTabs` Component'i Oluştur:** Sekme ve filtreleme mantığını kendi içine taşıyın.

    **Örnek Kod (`src/components/match/MovieTabs.tsx`):**

    ```typescript
    import React, { useState, useMemo } from 'react';
    // ...

    const MovieTabs = React.memo(({ favorites, watched }) => {
      const [activeTab, setActiveTab] = useState('favorites');
      const [mediaType, setMediaType] = useState('all');

      const filteredMovies = useMemo(() => {
        const list = activeTab === 'favorites' ? favorites : watched;
        // ... (filtreleme mantığı)
        return filteredList;
      }, [activeTab, mediaType, favorites, watched]);

      return (
        <View>
          {/* Sekme ve filtre butonları */}
          <HorizontalMovieList movies={filteredMovies} />
        </View>
      );
    });
    ```

2.  **`EnhancedMatchCard` İçinde Kullan:** Ana component'i basitleştirin.

    ```typescript
    // src/screens/MatchScreen.tsx -> EnhancedMatchCard
    const EnhancedMatchCard = React.memo(({ user, ... }) => {
      // ...
      return (
        <Animated.View>
          <UserProfileHeader user={user} />
          <InterestTags interests={user.interests} />
          <MovieTabs favorites={user.favorites} watched={user.watchedContent} />
        </Animated.View>
      );
    });
    ```

### D. `ScrollView`'ları `FlatList` ile Değiştirme

**Sorun:** Uzun listeler (`user.favorites`, `user.watchedContent`) `ScrollView` ile render ediliyor, bu da hafıza kullanımını artırıyor.

**Çözüm:** `EnhancedMatchCard` içindeki yatay `ScrollView`'ları `FlatList` ile değiştirin.

**Uygulama Adımları:**

-   `MovieTabs` veya `HorizontalMovieList` gibi component'ler içinde, `.map()` ile render edilen listeyi `FlatList` component'i ile değiştirin. `horizontal` prop'unu eklemeyi unutmayın.

---

## 4. Genel Tavsiyeler

-   **`React.memo`:** Yukarıdaki refactor işlemleri yapıldıktan sonra, saf (pure) ve prop'ları sık değişmeyen tüm alt component'leri `React.memo` ile sarmalayın.
-   **`useCallback`:** `FlatList`'in `renderItem` prop'una geçirilen fonksiyon gibi fonksiyonları `useCallback` ile memoize edin.
-   **Görsel Optimizasyonu:** `react-native-fast-image` kütüphanesini kullanarak resimlerin daha hızlı yüklenmesini ve cache'lenmesini sağlayın.
