#  Sentry Entegrasyon Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasına **Sentry**'nin (hata ve çökme raporlama servisi) nasıl entegre edileceğini adım adım açıklamaktadır. Bu entegrasyon, üretim (production) ortamında meydana gelen JavaScript ve native hatalarını anında yakalamak, analiz etmek ve müdahale etmek için kritiktir.

---

## 2. Kurulum ve Yapılandırma

### Adım 1: Sentry Projesi Oluşturma

1.  [Sentry.io](https://sentry.io/) adresine gidin ve bir hesap oluşturun.
2.  Yeni bir proje oluşturun ve platform olarak **"React Native"** seçeneğini seçin.
3.  Sentry, size `dsn` (Data Source Name) adında bir anahtar verecektir. Bu anahtarı bir sonraki adımda kullanmak üzere saklayın. Bu anahtar, uygulamanızın logları doğru Sentry projesine göndermesini sağlar.

### Adım 2: Gerekli Paketleri Yükleme

-   Projenizin kök dizininde aşağıdaki komutu çalıştırarak Sentry React Native SDK'sını yükleyin:

    ```bash
    npm install @sentry/react-native
    ```

### Adım 3: Sentry'yi Uygulama Kökünde Başlatma (`init`)

-   Uygulamanızın giriş noktası olan `App.tsx` (veya `index.js`) dosyasının en başına Sentry'yi import edin ve `init` fonksiyonunu çağırın. Bu, Sentry'nin uygulama başlar başlamaz hataları yakalamaya başlamasını sağlar.

    **Örnek Kod (`App.tsx`):**
    ```typescript
    import * as Sentry from '@sentry/react-native';
    import React from 'react';
    // ...diğer import'lar

    // Sentry'yi uygulamanın en başında başlat!
    Sentry.init({
      dsn: 'SENTRY_PROJENIZDEN_ALDIGINIZ_DSN_ANAHTARINI_BURAYA_YAPISTIRIN',

      // Üretim ortamında daha fazla hata yakalamak için
      tracesSampleRate: 1.0,

      // Geliştirme ortamında Sentry'ye event göndermeyi engelle
      enabled: !__DEV__,

      // Sürüm ve dağıtım takibi için (CI/CD'de ayarlanması önerilir)
      // release: 'wmatch@1.0.0',
      // dist: '1',
    });

    // ... (App component'inin geri kalanı)

    const App: React.FC = () => {
      // ...
    };

    // Uygulamanızı Sentry.wrap ile sarmalayın
    export default Sentry.wrap(App);
    ```

### Adım 4: Native Projeleri Yapılandırma (iOS ve Android)

-   Sentry'nin native (Java/Kotlin ve Swift/Objective-C) katmanlardaki çökmeleri de yakalayabilmesi için, Sentry CLI'yi kullanarak native projeleri otomatik olarak yapılandırın.

    ```bash
    npx @sentry/wizard -i reactNative -p android ios
    ```
    -   Bu sihirbaz, sizden Sentry hesabınıza giriş yapmanızı, projenizi seçmenizi isteyecek ve `android` ve `ios` klasörlerindeki gerekli yapılandırma dosyalarını (örn: `sentry.properties`, build script'leri) otomatik olarak oluşturacaktır.

---

## 3. Kullanım ve Entegrasyon

### A. JavaScript Hatalarını Yakalama

-   Yukarıdaki kurulumdan sonra, Sentry tüm yakalanmamış JavaScript hatalarını ve unhandled promise rejection'larını **otomatik olarak** yakalayacaktır.

### B. Manuel Hata ve Mesaj Gönderme

-   `Logger.ts` gibi merkezi bir yerden, belirli hataları veya logları manuel olarak Sentry'ye gönderebilirsiniz.

    **Örnek Kod (`src/utils/Logger.ts`):**
    ```typescript
    import * as Sentry from '@sentry/react-native';

    // Bir hatayı manuel olarak gönderme
    try {
      // ... bir işlem
    } catch (error) {
      Sentry.captureException(error);
    }

    // Bir mesajı log olarak gönderme
    Sentry.captureMessage('Kullanıcı profilini güncelleyemedi', 'warning');
    ```

### C. Zengin Bağlam (Context) Ekleme

-   Hataları ayıklamayı kolaylaştırmak için, Sentry'ye ek bilgiler göndermek çok önemlidir.

    **Örnek Kod:**
    ```typescript
    import * as Sentry from '@sentry/react-native';

    // Giriş yapan kullanıcıyı tanımlama
    Sentry.setUser({ id: 'kullanici-123', email: 'test@example.com', username: 'testuser' });

    // Hata raporlarına etiket (tag) ekleme (filtreleme için)
    Sentry.setTag('screen', 'MatchScreen');

    // Hata raporlarına ek veri (extra) ekleme
    Sentry.setExtra('current_filters', { age: 25, gender: 'male' });

    // Breadcrumb ekleme (hataya yol açan adımlar)
    Sentry.addBreadcrumb({
      category: 'ui',
      message: 'User clicked "Like" button',
      level: 'info',
    });
    ```

### D. Source Map Yükleme

-   Production'da oluşan hataların okunabilir olması için, `sourcemap` dosyalarınızı Sentry'ye yüklemeniz gerekir. Sentry sihirbazı genellikle CI/CD için bir script oluşturur, ancak manuel olarak da yapabilirsiniz.

    **Örnek `package.json` Script'i:**
    ```json
    "scripts": {
      "sentry:sourcemaps": "sentry-cli react-native xcode --force-foreground && sentry-cli react-native gradle --force-foreground && sentry-cli sourcemaps inject --release $npm_package_version ./ios/main.jsbundle.map ./android/app/build/generated/sourcemaps/react/release/index.android.bundle.map && sentry-cli sourcemaps upload --release $npm_package_version ./ios/main.jsbundle.map ./android/app/build/generated/sourcemaps/react/release/index.android.bundle.map"
    }
    ```

Bu entegrasyon tamamlandığında, WMatch uygulamasında production'da meydana gelen her bir hata ve çökme, zengin bir bağlam ile birlikte Sentry dashboard'unuza düşecek ve proaktif müdahale imkanı sağlayacaktır.
