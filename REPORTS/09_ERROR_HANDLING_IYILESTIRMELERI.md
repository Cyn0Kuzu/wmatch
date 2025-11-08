# 🛡️ WMatch - Error Handling ve Resilience İyileştirme Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının hatalar karşısındaki dayanıklılığını (resilience) artırmak ve kullanıcılara daha iyi geri bildirimler sunmak için somut ve önceliklendirilmiş adımlar sunmaktadır. Öneriler, Faz 3 Error Handling Denetimi sırasında tespit edilen kritik eksikliklere odaklanmaktadır.

---

## 2. Yüksek Öncelikli İyileştirme: Kullanıcı Odaklı Hata Geri Bildirimi

**Sorun:** Hatalar sadece geliştirici konsoluna loglanıyor, kullanıcıya ne olduğu bildirilmiyor.

**Öneri:** Merkezi `ErrorHandler`'ı, kullanıcıya modern ve anlaşılır bildirimler gösterecek şekilde güncelleyin.

### Uygulama Adımları:

1.  **`ErrorHandler`'ı Toast Kütüphanesi ile Entegre Edin:**
    -   `react-native-toast-message` kütüphanesinin projede zaten (`App.tsx`) kurulu olduğunu varsayarak, `ErrorHandler`'ı bu kütüphaneyi kullanacak şekilde güncelleyin.

    **Örnek Kod (`src/utils/ErrorHandler.ts`):**

    ```typescript
    import { Toast } from 'react-native-toast-message/lib/src/Toast';
    import { logger } from './Logger';

    // ... (ErrorType ve AppError interface'leri)

    class ErrorHandler {
      // ...

      public handleError(error: AppError): void {
        // ... (mevcut loglama ve error spam engelleme)

        logger.error(error.message, error.context, { ... });

        // YENİ: Kullanıcıya geri bildirim göster
        // Sadece kullanıcıya gösterilmesi mantıklı olan hataları filtrele
        if (this.isUserFacingError(error.type)) {
          Toast.show({
            type: 'error', // 'success', 'info', 'error'
            text1: this.getUserFacingErrorTitle(error.type),
            text2: error.message,
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }

      private isUserFacingError(type: ErrorType): boolean {
        // Kullanıcıya gösterilmeyecek sistem hatalarını burada filtrele
        return type !== ErrorType.UNKNOWN;
      }

      private getUserFacingErrorTitle(type: ErrorType): string {
        switch (type) {
          case ErrorType.NETWORK:
            return 'Bağlantı Hatası';
          case ErrorType.AUTHENTICATION:
            return 'Kimlik Doğrulama Hatası';
          case ErrorType.VALIDATION:
            return 'Geçersiz Giriş';
          default:
            return 'Bir Hata Oluştu';
        }
      }
      // ...
    }
    ```

---

## 3. Yüksek Öncelikli İyileştirme: Granüler `ErrorBoundary` Kullanımı

**Sorun:** Tek bir üst seviye `ErrorBoundary`, küçük bir hatanın tüm uygulamayı çökertmesine neden oluyor.

**Öneri:** Uygulamanın bağımsız bölümlerini kendi `ErrorBoundary`'leri ile sarmalayarak hataları izole edin.

### Uygulama Adımları:

1.  **Ekran Seviyesinde `ErrorBoundary` Ekleyin:**
    -   Her bir ekran component'inin (`HomeScreen`, `MatchScreen` vb.) ana içeriğini bir `ErrorBoundary` ile sarmalayın. Bu, bir ekranın çökmesinin diğer sekmeleri etkilemesini önler.

    **Örnek Kod (`src/screens/HomeScreen.tsx`):**

    ```typescript
    import { ErrorBoundary } from '../components/ui/ErrorBoundary';

    export const HomeScreen: React.FC = () => {
      return (
        <SafeAreaView style={styles.container}>
          <ErrorBoundary fallback={<ScreenErrorFallback onRetry={...} />}>
            {/* Ekranın asıl içeriği (MatchList, MovieList vb.) */}
          </ErrorBoundary>
        </SafeAreaView>
      );
    };
    ```

2.  **Liste Elemanı Seviyesinde `ErrorBoundary` Ekleyin (İleri Seviye):**
    -   `MatchScreen` veya `LikedScreen` gibi listelerde, `FlatList`'in `renderItem` prop'u içinde her bir kartı kendi `ErrorBoundary`'si ile sarmalayın.

    **Örnek Kod (`src/screens/LikedScreen.tsx`):**

    ```typescript
    const renderUserCard = ({ item }) => (
      <ErrorBoundary fallback={<CardErrorFallback />}>
        <LikedUserCard user={item} onPress={() => ...} />
      </ErrorBoundary>
    );

    return (
      <FlatList
        data={users}
        renderItem={renderUserCard}
        // ...
      />
    );
    ```
    -   `CardErrorFallback` component'i, sadece çöken kartın yerinde görünecek küçük bir hata mesajı olmalıdır.

---

## 4. Orta Öncelikli İyileştirme: `react-query` ile Otomatik Retry

**Sorun:** Ağ hataları kalıcı hatalara dönüşüyor.

**Öneri:** Tüm veri çekme (data fetching) mantığını `useEffect`'ten `@tanstack/react-query`'nin `useQuery` hook'una taşıyın.

### Uygulama Adımları:

1.  **`useEffect`'i `useQuery` ile Değiştirin:**
    -   `LikedScreen`'deki gibi `useEffect` içinde veri çeken component'leri `useQuery` kullanacak şekilde refactor edin.

    **Örnek Kod (`src/screens/LikedScreen.tsx` - Refactored):**

    ```typescript
    import { useQuery } from '@tanstack/react-query';

    export const LikedScreen: React.FC = () => {
      const { authService } = useCoreEngine();

      const { data: likedUsers, isLoading, isError, error, refetch } = useQuery({
        // queryKey, sorguyu benzersiz olarak tanımlar ve caching için kullanılır
        queryKey: ['likedUsers', authService.getCurrentUser()?.uid],
        // queryFn, veriyi çeken asenkron fonksiyondur
        queryFn: async () => {
          const user = await authService.getCurrentUser();
          if (!user) return [];
          // ... (eski loadLikedUsers fonksiyonundaki mantık buraya taşınır)
          return fetchedUsers;
        },
        // Sadece kullanıcı varsa sorguyu çalıştır
        enabled: !!authService.getCurrentUser()?.uid,
      });

      if (isLoading) {
        return <LoadingSpinner />;
      }

      if (isError) {
        return <ErrorRecovery error={error} onRetry={refetch} />;
      }

      // ... (data'yı kullanarak listeyi render et)
    };
    ```
    **Avantajları:**
    -   **Otomatik Retry:** `useQuery`, ağ hatalarında varsayılan olarak 3 kez yeniden deneme yapar.
    -   **Caching:** Kullanıcı ekrandan ayrılıp geri döndüğünde, veri cache'ten anında yüklenir ve arka planda güncellenir.
    -   **Daha Temiz Kod:** `isLoading`, `isError`, `data` gibi state'ler `useQuery` tarafından otomatik olarak yönetilir, bu da component'i basitleştirir.
