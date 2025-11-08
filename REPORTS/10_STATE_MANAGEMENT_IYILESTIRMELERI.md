# 🔄 WMatch - State Management İyileştirme Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının Zustand tabanlı state yönetimini daha **performanslı**, **modüler** ve **bakımı kolay** hale getirmek için **"Slice Pattern"**'in nasıl uygulanacağını adım adım açıklamaktadır. Bu, Faz 3 State Management Denetimi'nde tespit edilen monolitik store yapısını çözmek için en etkili yöntemdir.

---

## 2. Ana Strateji: Monolitik Store'u "Slice"lara Ayırma

**Sorun:** Tüm state'in tek bir dosyada olması, gereksiz yeniden render'lara, kod karmaşıklığına ve bakım zorluklarına yol açar.

**Öneri:** `useAppStore`'u, her biri belirli bir sorumluluk alanına odaklanmış daha küçük "slice" (parça) dosyalarına bölün.

### Slice Pattern Nedir?

Slice pattern, her bir mantıksal state grubunu (örneğin, kullanıcı, filmler, ayarlar) kendi state'i ve action'ları ile birlikte ayrı bir fonksiyon içinde tanımlamaktır. Bu fonksiyonlar daha sonra ana store içinde birleştirilir.

### Uygulama Adımları:

1.  **Yeni Bir Klasör Yapısı Oluşturun:**
    ```
    src/
    └── store/
        ├── slices/
        |   ├── userSlice.ts
        |   ├── movieSlice.ts
        |   ├── matchSlice.ts
        |   ├── settingsSlice.ts
        |   └── uiSlice.ts
        |
        └── useAppStore.ts (Ana store)
    ```

2.  **İlk Slice'ı Oluşturun (`userSlice.ts`):**
    -   Kullanıcı ile ilgili tüm state ve action'ları bu dosyaya taşıyın.

    **Örnek Kod (`src/store/slices/userSlice.ts`):**
    ```typescript
    import { StateCreator } from 'zustand';

    export interface UserSlice {
      user: User | null;
      isAuthenticated: boolean;
      setUser: (user: User | null) => void;
      setAuthenticated: (isAuth: boolean) => void;
      updateUserProfile: (profileData: Partial<User>) => void;
      logout: () => void;
    }

    export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),
      updateUserProfile: (profileData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profileData } : null,
        })),
      logout: () => set({ user: null, isAuthenticated: false }),
    });
    ```

3.  **Diğer Slice'ları Oluşturun:**
    -   Aynı mantığı `movieSlice`, `matchSlice`, `settingsSlice` ve `uiSlice` için de tekrarlayın. Her dosya sadece kendiyle ilgili state ve action'ları içermelidir.

4.  **Ana Store'u Slice'ları Birleştirecek Şekilde Güncelleyin:**
    -   `useAppStore.ts` dosyası artık slice'ları içe aktarıp (import) birleştirmekten sorumlu olacaktır.

    **Örnek Kod (`src/store/useAppStore.ts` - Refactored):**
    ```typescript
    import { create } from 'zustand';
    import { persist, createJSONStorage } from 'zustand/middleware';
    import { safeStorageWrapper } from '../utils/SafeStorageWrapper';

    import { createUserSlice, UserSlice } from './slices/userSlice';
    import { createMovieSlice, MovieSlice } from './slices/movieSlice';
    // ... diğer slice'ları import et

    // Tüm slice'ları birleştirerek ana state tipini oluştur
    type AppState = UserSlice & MovieSlice; // & MatchSlice & SettingsSlice ...

    export const useAppStore = create<AppState>()(
      persist(
        (...a) => ({
          ...createUserSlice(...a),
          ...createMovieSlice(...a),
          // ...createMatchSlice(...a),
          // ...createSettingsSlice(...a),
        }),
        {
          name: 'mwatch-storage',
          storage: createJSONStorage(() => safeStorageWrapper),
          // Persistence (kalıcılık) için sadece gerekli alanları seç
          partialize: (state) => ({
            isAuthenticated: state.isAuthenticated,
            theme: state.settings.preferences.theme, // Örnek
          }),
        }
      )
    );
    ```

5.  **Component'lerde Kullanımı Optimize Edin:**
    -   Component'lerin, state'in tamamını değil, sadece ihtiyaç duydukları küçük parçaları seçtiğinden emin olun.

    **Örnek Kod (Bir component içinde):**
    ```typescript
    import { useAppStore } from '../store/useAppStore';

    // KÖTÜ ❌: State'in tamamını seçer. 'searchQuery' değiştiğinde bile re-render olur.
    const { user, isAuthenticated } = useAppStore();

    // İYİ ✅: Sadece 'user' state'ini seçer. Sadece 'user' değiştiğinde re-render olur.
    const user = useAppStore((state) => state.user);

    // EN İYİ (Birden fazla değer için) ✅: `shallow` kullanarak gereksiz re-render'ları önler.
    import { shallow } from 'zustand/shallow';

    const { user, isAuthenticated } = useAppStore(
      (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      shallow
    );
    ```

Bu yapı, state yönetimini daha organize, test edilebilir ve performanslı hale getirerek projenin uzun vadeli sağlığını önemli ölçüde iyileştirecektir.
