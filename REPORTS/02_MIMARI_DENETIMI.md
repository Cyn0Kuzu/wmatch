# 🏗️ WMatch - Mimari ve Sistem Tasarımı Denetim Raporu (Faz 1)

**Tarih:** 2025-11-08
**Öncelik:** 🔴 Kritik

---

## Executive Summary

Bu denetim, WMatch uygulamasının mevcut yazılım mimarisini, sistem tasarımını ve temel yapısal desenlerini analiz etmektedir. Mevcut mimari, uygulamanın hızlı bir şekilde geliştirilmesini sağlamış olsa da, projenin büyümesi ve sürdürülebilirliği önünde ciddi engeller teşkil eden önemli zayıflıklar barındırmaktadır.

Ana sorunlar, **Singleton** ve **Service Locator** desenlerinin birleşimiyle oluşan **yüksek bağımlılık (tight coupling)**, ve tüm uygulama durumunun tek bir yerde yönetildiği **monolitik state management** yaklaşımıdır. Bu durum, test edilebilirliği, modülerliği ve ölçeklenebilirliği olumsuz etkilemektedir.

Bu raporda, mevcut mimarinin detaylı bir analizi, tespit edilen sorunlar ve projenin geleceği için önerilen iyileştirme yol haritası sunulmaktadır.

---

## 1. Mevcut Mimari Analizi

WMatch mimarisi üç ana katmandan oluşmaktadır:

1.  **Service Layer (Hizmet Katmanı):** `CoreService.ts` dosyası, uygulamanın merkezinde yer alan bir **Singleton** nesnesidir. Bu nesne, diğer tüm servisleri (örneğin, `AuthService`, `FirestoreService`, `TMDBService`) başlatır ve yönetir. Servisler arasındaki bağımlılıklar (dependencies) manuel olarak `CoreService` içinde enjekte edilir. Bu desen, bir **Service Locator** olarak işlev görür.

2.  **State Management (Durum Yönetimi):** `useAppStore.ts` dosyası, Zustand kütüphanesi kullanılarak oluşturulmuş **tek ve monolitik** bir store içerir. Kullanıcı bilgileri, ayarlar, filmler, eşleşmeler ve anlık UI durumu gibi uygulamanın tüm global state'i bu tek store içinde tutulur.

3.  **UI Layer (Arayüz Katmanı):** `CoreEngine.tsx`, servisleri React Context API aracılığıyla component ağacına sunar. `src/screens` klasöründeki ekranlar, bu servisleri ve `useAppStore`'u kullanarak iş mantığını ve arayüzü oluşturur.

---

## 🔴 P0 - Kritik Mimari Sorunlar

### 1. Yüksek Bağımlılık (Tight Coupling) ve "God Object" Anti-Pattern'i

- **Sorun:** `CoreService` sınıfı, tüm servisleri doğrudan tanır ve birbirine bağlar. Bu, servislerin birbirinden bağımsız çalışmasını veya test edilmesini neredeyse imkansız hale getirir. Örneğin, `AuthService`'i test etmek için `FirebaseService` ve `AnalyticsService` gibi bağımlılıklarını da başlatmak gerekir.
- **Kök Neden:** Service Locator deseninin, Dependency Injection (DI) container'ları olmadan manuel olarak uygulanması.
- **Etki:**
    - **Düşük Test Edilebilirlik:** Servislerin birim testleri (unit tests) yazılamaz, çünkü bağımlılıkları kolayca mock'lanamaz.
    - **Kırılganlık (Fragility):** Bir serviste yapılan değişiklik, `CoreService` üzerinden dolaylı olarak diğer servisleri etkileyebilir ve beklenmedik hatalara yol açabilir.
    - **Sürdürülebilirlik Zorluğu:** Yeni bir servis eklemek, `CoreService` içinde manuel değişiklikler gerektirir ve karmaşıklığı artırır.
- **Çözüm Önerisi:**
    - **Dependency Injection (DI) Container Kullanımı:** `tsyringe`, `inversify` gibi bir DI container kütüphanesi kullanarak servislerin bağımlılıklarını otomatik olarak yönetin. Servisler, ihtiyaç duydukları diğer servisleri constructor aracılığıyla "ister" ve DI container bu bağımlılıkları kendisi sağlar. Bu, servisleri birbirinden ayırır (decoupling).

### 2. Monolitik State Management

- **Sorun:** Tüm uygulama durumu, `useAppStore` adlı tek bir Zustand store'unda tutulmaktadır. Bu, alakasız component'lerin, state'in küçük bir parçası değiştiğinde bile yeniden render olmasına neden olabilir. Örneğin, arama kutusuna yazı yazarken `searchQuery` state'inin güncellenmesi, `user` bilgisine abone olan tüm component'leri potansiyel olarak tetikleyebilir.
- **Kök Neden:** State'in mantıksal olarak ayrıştırılmaması.
- **Etki:**
    - **Performans Sorunları:** Gereksiz yeniden render'lar (re-renders) uygulamanın yavaşlamasına neden olabilir.
    - **Yönetim Zorluğu:** Store dosyası büyüdükçe, hangi component'in state'in hangi parçasını kullandığını takip etmek zorlaşır.
    - **Mantıksal Karmaşa:** Farklı özelliklere (features) ait state'lerin aynı yerde olması, kodun okunabilirliğini düşürür.
- **Çözüm Önerisi:**
    - **State'i Mantıksal Parçalara Ayırma (Slicing):** Zustand'ın "slice pattern" özelliğini kullanarak state'i daha küçük ve odaklanmış store'lara bölün. Örneğin:
        - `useUserStore`: Sadece kullanıcı ve kimlik doğrulama bilgilerini tutar.
        - `useMovieStore`: Film verilerini ve listelerini yönetir.
        - `useMatchStore`: Eşleşme ve swipe işlemlerini yönetir.
        - `useSettingsStore`: Kullanıcı ayarlarını tutar.
    - Bu, component'lerin sadece ihtiyaç duydukları state'e abone olmasını sağlar ve gereksiz render'ları önler.

---

## 🟡 P1 - Yüksek Öncelikli Mimari İyileştirmeler

### 3. Servis ve İş Mantığının Karışması

- **Sorun:** Servisler (`AuthService`, `FirestoreService` vb.), hem veri erişimi (Firebase, TMDB API) hem de iş mantığı (eşleşme algoritması, kimlik doğrulama akışı) içermektedir. Bu, "separation of concerns" (sorumlulukların ayrılması) ilkesini ihlal eder.
- **Kök Neden:** İş mantığı için ayrı bir katman (domain layer) oluşturulmaması.
- **Etki:**
    - **Test Zorluğu:** Veri erişim kodunu mock'lamadan iş mantığını test etmek zordur.
    - **Yeniden Kullanılabilirlik Düşüklüğü:** İş mantığı, belirli bir veri kaynağına (örneğin, Firebase) sıkı sıkıya bağlıdır.
- **Çözüm Önerisi:**
    - **Use Case / Interactor Katmanı Oluşturma:** Servisler sadece veri kaynaklarıyla iletişim kurmalıdır (veri getirme, yazma vb.). İş mantığı ise `LoginUserUseCase`, `FindMatchesUseCase` gibi ayrı sınıflara taşınmalıdır. Bu "use case" sınıfları, ihtiyaç duydukları servisleri (repository olarak) constructor aracılığıyla alır. Bu, iş mantığını tamamen test edilebilir ve yeniden kullanılabilir hale getirir.

---

## Mimari İyileştirme Yol Haritası

1.  **Adım 1: DI Container Entegrasyonu (Yüksek Öncelik)**
    - `tsyringe` kütüphanesini projeye ekleyin.
    - Tüm servisleri `@injectable()` ve `@singleton()` olarak işaretleyin.
    - `CoreService`'i kaldırın ve servis bağımlılıklarını constructor injection ile yönetin.

2.  **Adım 2: State'in Parçalanması (Slicing) (Yüksek Öncelik)**
    - `useAppStore`'u `useUserStore`, `useMovieStore`, `useMatchStore` gibi daha küçük store'lara bölün.
    - Component'lerin yalnızca ihtiyaç duydukları store'lardan veri okumasını sağlayacak şekilde refactor edin.

3.  **Adım 3: Use Case Katmanı Oluşturma (Orta Öncelik)**
    - Servislerdeki iş mantığını, ayrı `UseCase` sınıflarına taşımaya başlayın.
    - Bu, kodun test edilebilirliğini ve modülerliğini artıracaktır.

---

## Mimari Diyagramlar (Metin Tabanlı)

### Mevcut Mimari

```
[ UI Layer (Screens & Components) ]
      |
      +-----> [ CoreEngine (React Context) ]
                  |
                  +-----> [ CoreService (Singleton / Service Locator) ]
                              |
                              +-----> [ AuthService ]
                              |
                              +-----> [ FirestoreService ]
                              |
                              +-----> [ TMDBService ]
                              |
                              +-----> (diğer tüm servisler...)
      |
      +-----> [ useAppStore (Monolithic Zustand Store) ]

```

### Önerilen Mimari

```
[ UI Layer (Screens & Components) ]
      |
      +-----> [ Hooks / Presenters ]
                  |
                  +-----> [ Use Cases (İş Mantığı) ]
                  |           |
                  |           +-----> [ Repositories (Soyut Arayüzler) ]
                  |
                  +-----> [ DI Container (örn: tsyringe) ]
                              |
                              +-----> [ Services (Repository Implementasyonları) ]
                                          |
                                          +-----> [ Firebase / TMDB API / AsyncStorage ]
      |
      +-----> [ Sliced Zustand Stores ]
                  |
                  +-----> [ useUserStore ]
                  |
                  +-----> [ useMovieStore ]
                  |
                  +-----> [ useMatchStore ]
```