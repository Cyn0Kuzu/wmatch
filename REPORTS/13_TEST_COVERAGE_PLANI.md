# 🧪 WMatch - Test Kapsamı Artırma Planı (Coverage Plan)

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu belge, WMatch uygulamasının %0 olan mevcut test kapsamını, sistematik ve yönetilebilir adımlarla artırmak için bir yol haritası sunmaktadır. Amaç, aniden %100 kapsama ulaşmak değil, en yüksek getiriyi (ROI) sağlayan en kritik alanlardan başlayarak projenin kalitesini ve stabilitesini kademeli olarak yükseltmektir.

---

## 2. Faz 1: Temel Altyapı ve Unit Testler (%0 → ~%25 Kapsam)

**Hedef:** Test altyapısını kurmak ve projenin en temel, izole edilebilir mantıklarını test kapsamına almak.

**Öncelikli Alanlar:**

1.  **Test Altyapısının Kurulumu:**
    -   `jest` ve `react-native-testing-library` kurulumunu tamamlayın.
    -   `jest.config.js` ve `jest-setup.js` dosyalarını yapılandırın.
    -   `npm run test` komutunun çalıştığından emin olun.
    -   `npm run test -- --coverage` ile kapsam raporu oluşturabildiğinizi doğrulayın.

2.  **Yardımcı Fonksiyonlar (`/src/utils`):**
    -   **Neden Öncelikli?** Bu fonksiyonlar, projenin temel taşlarıdır, saf (pure) ve bağımlılıkları az olduğu için test yazması en kolay yerdir.
    -   **Görev:** `validation.ts`, `performance.ts` gibi dosyalardaki tüm fonksiyonlar için tam (%100) test kapsamı hedefleyin. `13_TEST_ORNEKLERI/validation.test.ts` dosyasını başlangıç noktası olarak kullanın.

3.  **Custom Hook'lar (`/src/hooks`):**
    -   **Neden Öncelikli?** Component'ler arası paylaşılan state'li mantığı içerirler ve bunları izole olarak test etmek, hataları erken yakalamayı sağlar.
    -   **Görev:** `useFormValidation` gibi hook'ları, `@testing-library/react-hooks`'un `renderHook` API'sini kullanarak test edin.

4.  **En Basit UI Component'leri (`/src/components/ui`):**
    -   **Neden Öncelikli?** Ekibe `React Native Testing Library` ile component test etme pratiği kazandırır.
    -   **Görev:** `AnimatedButton` gibi state'siz veya çok az state'i olan component'leri test edin. Props'larına göre doğru metni render edip etmediğini (`getByText`) ve `onPress` event'ini tetikleyip tetiklemediğini (`fireEvent.press`) doğrulayın.

---

## 3. Faz 2: Servisler ve Entegrasyon Testleri (~%25 → ~%50 Kapsam)

**Hedef:** Uygulamanın iş mantığını ve farklı birimlerin (servisler, state, component'ler) birlikte çalışma şeklini test kapsamına almak.

**Öncelikli Alanlar:**

1.  **Servislerdeki İş Mantığı (`/src/services`):**
    -   **Neden Öncelikli?** Uygulamanın çekirdek iş mantığını içerirler.
    -   **Görev:** `MatchService` veya `AuthService` gibi servislerdeki, dış bağımlılıkları (Firebase, TMDB) olan fonksiyonları test edin. `jest.mock()` kullanarak bu dış bağımlılıkları "mock'layın" (taklit edin), böylece sadece test etmek istediğiniz iş mantığına odaklanabilirsiniz.

2.  **Zustand Store (`/src/store`):**
    -   **Neden Öncelikli?** Global state yönetiminin doğru çalıştığını garanti altına alır.
    -   **Görev:** State "slice"larının action'larını test edin. Bir action çağrıldığında, state'in beklendiği gibi güncellendiğini doğrulayın.

3.  **Ekran (Screen) Entegrasyon Testleri (`/src/screens`):**
    -   **Neden Öncelikli?** Kullanıcının gördüğü ve etkileşimde bulunduğu son noktadır.
    -   **Görev:** `LoginScreen` gibi bir form ekranını test edin. Kullanıcı metin girdiğinde, butona tıkladığında ve `AuthService`'in mock'lanmış bir fonksiyonu çağrıldığında, ekranda beklenen değişikliklerin (örneğin, bir yükleme göstergesi veya hata mesajı) göründüğünü test edin.

---

## 4. Faz 3: Karmaşık Akışlar ve E2E Testler (~%50 → ~%70+ Kapsam)

**Hedef:** Kritik kullanıcı yolculuklarını otomatize etmek ve genel sistem sağlığını güvence altına almak.

**Öncelikli Alanlar:**

1.  **Karmaşık Component'ler (`MatchScreen`):**
    -   **Görev:** `MatchScreen` gibi birden fazla state, servis ve kullanıcı etkileşimi içeren karmaşık ekranlar için entegrasyon testleri yazın.

2.  **Kritik Kullanıcı Akışları (E2E Testler):**
    -   **Neden Öncelikli?** Uygulamanın en önemli işlevlerinin her zaman çalıştığından emin olmak.
    -   **Görev:** `Detox` veya `Maestro` gibi bir araç kurarak aşağıdaki 2 ana akışı otomatize edin:
        1.  **Kayıt ve Giriş Akışı:** Yeni bir kullanıcının başarıyla kayıt olup giriş yapabilmesi.
        2.  **Temel Eşleşme Akışı:** Bir kullanıcının `MatchScreen`'de birini beğenmesi.

---

## 5. Kapsam Hedefleri

-   **Genel Kapsam Hedefi:** `%70-80`. %100 kapsama ulaşmak genellikle maliyetli ve gereksizdir.
-   **`/src/utils`:** `%95+`
-   **`/src/hooks`:** `%90+`
-   **Servislerdeki İş Mantığı:** `%80+`
-   **Component'ler:** `%60-70`

Bu plan, ekibin test yazma yetkinliğini kademeli olarak artırmasına olanak tanırken, en kısa sürede en yüksek değeri sağlayacak alanlara odaklanır.
