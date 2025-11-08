# 🔌 WMatch - API Entegrasyonu İyileştirme Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının dış API'lerle (özellikle TMDB) olan entegrasyonunu daha **güvenli**, **dayanıklı (resilient)** ve **verimli** hale getirmek için somut ve önceliklendirilmiş adımlar sunmaktadır. Öneriler, Faz 3 API Entegrasyonu Denetimi sırasında tespit edilen kritik güvenlik ve performans sorunlarına odaklanmaktadır.

---

## 2. Acil Öncelikli İyileştirme: Hardcoded API Anahtarını Güvenli Hale Getirme

**Sorun:** TMDB API anahtarı, kaynak kodunun içinde herkesin görebileceği şekilde saklanmaktadır. Bu, acil müdahale gerektiren kritik bir güvenlik açığıdır.

**Öneri:** API anahtarını derhal iptal edin, yenisini oluşturun ve ortam değişkenleri (environment variables) kullanarak güvenli bir şekilde yönetin.

### Uygulama Adımları:

1.  **Mevcut Anahtarı İptal Edin (ACİL):**
    -   [TMDB API Ayarları](https://www.themoviedb.org/settings/api) sayfasına gidin ve mevcut API anahtarınızı iptal edin (revoke).
    -   Yeni bir API anahtarı oluşturun.

2.  **`react-native-dotenv` Kütüphanesini Kurun:**
    ```bash
    npm install react-native-dotenv
    ```

3.  **`.env` Dosyası Oluşturun:**
    -   Projenin kök dizininde `.env` adında yeni bir dosya oluşturun ve yeni API anahtarınızı bu dosyaya ekleyin:
        ```
        TMDB_API_KEY="YENI_API_ANAHTARINIZI_BURAYA_YAZIN"
        ```

4.  **`.gitignore` Dosyasını Güncelleyin:**
    -   `.env` dosyasının asla Git repositorisine gönderilmediğinden emin olmak için, `.gitignore` dosyanıza `*.env` satırını ekleyin.

5.  **`babel.config.js`'i Yapılandırın:**
    ```javascript
    module.exports = {
      presets: ['module:metro-react-native-babel-preset'],
      plugins: [
        ['module:react-native-dotenv', {
          moduleName: '@env',
          path: '.env',
        }],
      ],
    };
    ```

6.  **`TMDBService.ts`'i Güncelleyin:**
    -   Hardcoded anahtarı kaldırın ve `@env` modülünden içe aktarın.

    **Örnek Kod (`src/services/TMDBService.ts`):**
    ```typescript
    import { TMDB_API_KEY } from '@env';
    // ...

    export class TMDBService {
      // ...
      private apiKey: string = TMDB_API_KEY; // <-- GÜVENLİ DEĞİŞKENİ KULLAN
      // ...
    }
    ```

---

## 3. Yüksek Öncelikli İyileştirme: Dayanıklılığı Artırmak için Otomatik Retry

**Sorun:** Anlık ağ hataları, API isteklerinin kalıcı olarak başarısız olmasına neden oluyor.

**Öneri:** `axios-retry` kütüphanesini kullanarak `axios` istemcisine otomatik yeniden deneme özelliği kazandırın.

### Uygulama Adımları:

1.  **Kütüphaneyi Kurun:**
    ```bash
    npm install axios-retry
    ```

2.  **`TMDBService.ts`'i Güncelleyin:**
    -   `axios` istemcisini oluşturduğunuz constructor içinde `axios-retry`'ı yapılandırın.

    **Örnek Kod (`src/services/TMDBService.ts`):**
    ```typescript
    import axios, { AxiosInstance } from 'axios';
    import axiosRetry from 'axios-retry';
    // ...

    export class TMDBService {
      // ...
      private constructor() {
        this.apiClient = axios.create({ /* ... */ });

        // YENİ: Otomatik Retry Yapılandırması
        axiosRetry(this.apiClient, {
          retries: 3, // Toplam 3 deneme yap
          retryDelay: (retryCount) => {
            // Her denemede gecikmeyi artır (exponential backoff)
            return retryCount * 1000;
          },
          retryCondition: (error) => {
            // Sadece ağ hataları veya sunucu hatalarında (5xx) yeniden dene
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
          },
        });

        // ... (axios interceptor)
      }
      // ...
    }
    ```

---

## 4. Orta Öncelikli İyileştirme: Standart Hata Yönetimi ve Caching

**Sorun:** Hata yönetimi tutarsız ve caching verimsiz.

**Öneri:** Tüm API veri çekme işlemlerini, bu özellikleri otomatik olarak sağlayan `@tanstack/react-query`'nin `useQuery` hook'una taşıyın.

### Uygulama Adımları:

1.  **Bir `useQuery` Örneği (`DiscoverScreen.tsx`):**
    -   `useEffect` ile manuel veri çekmek yerine, `useQuery` kullanarak hem kodu basitleştirin hem de otomatik caching, retry ve state yönetiminden faydalanın.

    **Örnek Kod (`src/screens/DiscoverScreen.tsx` - Refactored):**
    ```typescript
    import { useQuery } from '@tanstack/react-query';
    import { tmdbService } from '../services/TMDBService';

    const DiscoverScreen = () => {
      const {
        data: popularMovies,
        isLoading,
        isError,
        error
      } = useQuery({
        queryKey: ['popularMovies'], // Bu sorguyu benzersiz olarak tanımlayan anahtar
        queryFn: () => tmdbService.getPopularMovies(), // Veriyi çeken fonksiyon
        staleTime: 5 * 60 * 1000, // 5 dakika boyunca veriyi "taze" kabul et, tekrar fetch etme
      });

      if (isLoading) {
        return <LoadingSpinner />;
      }

      if (isError) {
        // useQuery hatayı otomatik olarak yakalar
        // ErrorHandler'ı bilgilendir ve bir hata ekranı göster
        errorHandler.handleError({ type: ErrorType.API, message: error.message, ... });
        return <ErrorRecovery onRetry={() => queryClient.refetchQueries(['popularMovies'])} />;
      }

      return <MovieList movies={popularMovies} />;
    };
    ```
Bu adımlar, dış servislerle olan entegrasyonunuzu daha profesyonel, güvenli ve dayanıklı bir standarda taşıyacaktır.
