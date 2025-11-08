# 🔄 WMatch - State Management Analiz Raporu (Faz 3)

**Tarih:** 2025-11-08
**Öncelik:** 🟡 Orta

---

## Executive Summary

Bu denetim, WMatch uygulamasının global durum yönetimi (state management) stratejisini ve Zustand kütüphanesinin kullanımını analiz etmektedir. Analiz, mimari denetiminde de belirtildiği gibi, uygulamanın tüm durumunu **tek ve monolitik bir store (`useAppStore.ts`) içinde yönettiğini** ve bu yaklaşımın önemli **performans, ölçeklenebilirlik ve bakım sorunlarına** yol açtığını doğrulamaktadır.

Ana sorunlar, **gereksiz yeniden render'lar (re-renders)**, **state'in mantıksal olarak ayrıştırılmamış olması**, **iş mantığının store içinde yer alması** ve **verimsiz state persistence (kalıcılık)** stratejileridir. Bu durum, uygulamanın performansını düşürmekte ve kod tabanının karmaşıklığını artırmaktadır.

Bu raporda, mevcut state yönetimi yaklaşımının zayıflıkları ve daha performanslı, modüler ve sürdürülebilir bir yapı için "slice pattern" gibi en iyi pratiklerin nasıl uygulanacağı detaylandırılmaktadır.

---

## 🟡 P1 - Yüksek Öncelikli Sorunlar

### 1. Monolitik Store Yapısı ve Gereksiz Yeniden Render'lar

-   **Sorun:** `useAppStore.ts`, kullanıcı kimliğinden film listelerine, anlık UI durumundan (`searchQuery`) ayarlara kadar birbiriyle alakasız tüm verileri tek bir global state nesnesinde birleştirmektedir.
-   **Kök Neden:** State'in, ait olduğu özellik (feature) veya domain'e göre mantıksal olarak ayrıştırılmaması.
-   **Etki:**
    -   **Performans Düşüşü:** Zustand, varsayılan olarak tüm state nesnesini component'lere döndürür. Eğer geliştirici state'in sadece ilgili parçasını seçmezse (`useAppStore(state => state.user)` gibi), state'in alakasız bir parçasındaki en küçük değişiklik bile (örneğin, arama kutusuna harf yazmak) o component'in gereksiz yere yeniden render olmasına neden olur. Buna "render fırtınası" (render storm) denir.
    -   **Bakım Zorluğu:** Yüzlerce satırlık tek bir store dosyası, hangi state'in nerede kullanıldığını ve nasıl güncellendiğini anlamayı zorlaştırır.
-   **Çözüm Önerisi: Slice Pattern**
    -   **State'i Mantıksal Parçalara Ayırın:** Zustand'ın resmi olarak önerdiği "slice pattern"ini kullanarak, monolitik store'u daha küçük ve yönetilebilir "slice"lara (parçalara) bölün. Her slice, kendi state'ini ve o state'i değiştiren action'ları içerir.
    -   **Önerilen Slice'lar:**
        -   `createUserSlice`: `user`, `isAuthenticated` gibi kimlik doğrulama ve kullanıcı bilgilerini yönetir.
        -   `createMovieSlice`: `trendingMovies`, `popularMovies` gibi film verilerini yönetir.
        -   `createMatchSlice`: `matches`, `likedMatches` gibi eşleşme ve swipe verilerini yönetir.
        -   `createSettingsSlice`: Kullanıcı ayarlarını yönetir.
        -   `createUISlice`: `searchQuery`, `isLoading` gibi geçici UI durumlarını yönetir.
    -   Bu slice'lar, ana `useAppStore` dosyasında birleştirilerek tek bir store oluşturmaya devam eder, ancak mantıksal olarak tamamen ayrılmıştır. Bu, hem kodun okunabilirliğini artırır hem de geliştiricileri state'in sadece ihtiyaç duydukları parçasına abone olmaya teşvik eder.

---

## 🟡 P2 - Orta Öncelikli Sorunlar

### 2. İş Mantığının Store İçinde Yer Alması

-   **Sorun:** `likeMatch` ve `dislikeMatch` gibi action'lar, sadece state'i güncellemekle kalmaz, aynı zamanda bir eşleşmeyi bulma, filtreleme ve yeni bir dizi oluşturma gibi iş mantığı adımlarını da içerir.
-   **Kök Neden:** İş mantığının, ait olduğu katmandan (domain/use case) ayrılarak UI'a en yakın katman olan state yönetimine taşınması.
-   **Etki:**
    -   **Test Zorluğu:** Bu iş mantığını, bir component'i render etmeden veya Zustand store'unu mock'lamadan bağımsız olarak test etmek zordur.
    -   **Yeniden Kullanılamama:** Bu mantık, başka bir yerde (örneğin, bir bildirim işleyicisinde) kullanılmak istendiğinde, state store'una bağımlı olduğu için yeniden kullanılamaz.
-   **Çözüm Önerisi:**
    -   **İş Mantığını Store'dan Ayırın:** İş mantığını, state yönetiminden bağımsız olan saf fonksiyonlara veya mimari denetiminde önerilen "Use Case" sınıflarına taşıyın.
    -   **Action'ları Basitleştirin:** Store içindeki action'lar, sadece önceden işlenmiş veriyi alıp `set()` fonksiyonunu çağırmaktan sorumlu olmalıdır.
    -   **Örnek Refactor:**
        ```typescript
        // a separate utility or use case file
        export const likeMatchLogic = (matches, matchId) => {
          const match = matches.find(m => m.id === matchId);
          if (!match) return { updatedMatches: matches, likedMatch: null };
          const updatedMatches = matches.filter(m => m.id !== matchId);
          const likedMatch = { ...match, isLiked: true };
          return { updatedMatches, likedMatch };
        }

        // in the store slice
        likeMatch: (matchId) => {
          const { updatedMatches, likedMatch } = likeMatchLogic(get().matches, matchId);
          if (likedMatch) {
            set({ matches: updatedMatches, likedMatches: [...get().likedMatches, likedMatch] });
          }
        },
        ```

### 3. Verimsiz State Persistence (Kalıcılık)

-   **Sorun:** Zustand'ın `persist` middleware'i, `partialize` seçeneği ile state'in bir kısmını `AsyncStorage`'a kaydetmektedir. Ancak, `user` nesnesinin tamamı gibi büyük ve gereksiz veriler kaydedilmektedir.
-   **Kök Neden:** Hangi verinin oturumlar arası kalıcı olması gerektiğinin dikkatli bir şekilde analiz edilmemesi.
-   **Etki:**
    -   **Gereksiz Depolama Kullanımı:** Cihazda gereksiz yer kaplar.
    -   **Yavaş Başlatma (Hydration):** Uygulama başlangıcında `AsyncStorage`'dan büyük bir JSON nesnesinin okunması ve parse edilmesi, uygulamanın açılış süresini yavaşlatabilir.
-   **Çözüm Önerisi:**
    -   **Sadece Gerekli Veriyi Saklayın:** `partialize` fonksiyonunu, sadece oturum için gerçekten gerekli olan minimum veriyi saklayacak şekilde güncelleyin. Örneğin, `user` nesnesinin tamamı yerine sadece `isAuthenticated` ve belki `userId` saklanabilir. Diğer tüm kullanıcı verileri, uygulama açıldığında sunucudan taze olarak çekilmelidir.
    -   **Örnek:**
        ```typescript
        partialize: (state) => ({
          // Sadece bu iki alanı sakla
          isAuthenticated: state.isAuthenticated,
          theme: state.settings.preferences.theme, // Tema gibi kullanıcı tercihleri saklanabilir
        }),
        ```
