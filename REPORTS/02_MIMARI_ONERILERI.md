# 🏗️ WMatch - Mimari İyileştirme Önerileri

**Tarih:** 2025-11-08

---

## Genel Bakış

Bu belge, WMatch uygulamasının mimarisini daha **modüler**, **test edilebilir**, **ölçeklenebilir** ve **sürdürülebilir** hale getirmek için somut ve önceliklendirilmiş öneriler sunmaktadır. Bu öneriler, Faz 1 Mimari Denetimi sırasında tespit edilen kritik sorunlara dayanmaktadır.

---

## 1. Yüksek Öncelikli Öneri: Bağımlılıkları Yönetmek için DI Container Kullanımı

**Sorun:** Mevcut `CoreService` yapısı, tüm servisleri birbirine sıkı sıkıya bağlayarak ("tight coupling") test ve bakımı zorlaştırmaktadır.

**Öneri:** `CoreService`'i kaldırıp, servis bağımlılıklarını yönetmek için `tsyringe` gibi bir Dependency Injection (DI) container'ı kullanın.

### Uygulama Adımları:

1.  **Kütüphaneyi Ekle:**
    ```bash
    npm install tsyringe reflect-metadata
    ```

2.  **`babel.config.js`'i Güncelle:**
    ```javascript
    // babel.config.js
    module.exports = {
      ...
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        'babel-plugin-transform-typescript-metadata',
        ...
      ],
    };
    ```

3.  **Giriş Noktasını Güncelle:** Uygulamanızın başlangıcına (`index.js` veya `App.tsx`) aşağıdaki satırı ekleyin:
    ```typescript
    // App.tsx
    import 'reflect-metadata';
    ```

4.  **Servisleri Güncelle:**
    -   Her servisi `@singleton()` decorator'ı ile işaretleyin.
    -   Bağımlılıkları constructor aracılığıyla `@inject()` decorator'ı ile enjekte edin.

    **Örnek: `AuthService`**
    ```typescript
    // src/services/AuthService.ts
    import { singleton, inject } from 'tsyringe';
    import { FirebaseService } from './FirebaseService';

    @singleton()
    export class AuthService {
      constructor(
        @inject(FirebaseService) private firebaseService: FirebaseService
      ) {}

      // ...
    }
    ```

5.  **Component'lerde Servisleri Kullanma:**
    -   Servisleri `container.resolve()` ile component içinde çağırın.

    **Örnek: `LoginScreen.tsx`**
    ```typescript
    // src/screens/LoginScreen.tsx
    import { container } from 'tsyringe';
    import { AuthService } from '../services/AuthService';

    const authService = container.resolve(AuthService);

    const LoginScreen = () => {
      const handleLogin = () => {
        authService.signIn('email', 'password');
      };
      // ...
    };
    ```

---

## 2. Yüksek Öncelikli Öneri: Monolitik State'i Parçalara Ayırma (Slicing)

**Sorun:** `useAppStore`'daki tek ve büyük state yapısı, performans sorunlarına ve yönetim zorluklarına yol açmaktadır.

**Öneri:** Zustand'ın "slice pattern"ini kullanarak state'i mantıksal olarak daha küçük, yönetilebilir store'lara bölün.

### Uygulama Adımları:

1.  **Slice Dosyaları Oluştur:** Her mantıksal alan için ayrı bir "slice" dosyası oluşturun.

    **Örnek: `userSlice.ts`**
    ```typescript
    // src/store/slices/userSlice.ts
    export const createUserSlice = (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    });
    ```

    **Örnek: `movieSlice.ts`**
    ```typescript
    // src/store/slices/movieSlice.ts
    export const createMovieSlice = (set) => ({
      trendingMovies: [],
      setTrendingMovies: (movies) => set({ trendingMovies: movies }),
    });
    ```

2.  **Ana Store'u Oluştur:** Bu slice'ları ana store dosyasında birleştirin.

    **Örnek: `useAppStore.ts`**
    ```typescript
    // src/store/useAppStore.ts
    import { create } from 'zustand';
    import { createUserSlice } from './slices/userSlice';
    import { createMovieSlice } from './slices/movieSlice';

    export const useAppStore = create((...a) => ({
      ...createUserSlice(...a),
      ...createMovieSlice(...a),
    }));
    ```

3.  **Component'lerde Kullanım:** Component'ler, state'in sadece ihtiyaç duydukları kısmını seçerek gereksiz re-render'ları önleyebilir.

    **Örnek: `ProfileScreen.tsx`**
    ```typescript
    // Sadece 'user' değiştiğinde re-render olur
    const user = useAppStore((state) => state.user);
    ```

    **Örnek: `HomeScreen.tsx`**
    ```typescript
    // Sadece 'trendingMovies' değiştiğinde re-render olur
    const trendingMovies = useAppStore((state) => state.trendingMovies);
    ```

---

## 3. Orta Öncelikli Öneri: İş Mantığı için "Use Case" Katmanı

**Sorun:** İş mantığı, veri erişim koduyla iç içe geçmiş durumda, bu da test ve yeniden kullanımı zorlaştırıyor.

**Öneri:** İş mantığını, servislerden (repository'ler) bağımsız olan `UseCase` sınıflarına taşıyın.

### Uygulama Adımları:

1.  **Repository Arayüzleri Tanımla:** Servisleriniz için soyut arayüzler (interfaces) oluşturun.

    ```typescript
    // src/domain/repositories/IAuthRepository.ts
    export interface IAuthRepository {
      signIn(email: string, password: string): Promise<User>;
    }
    ```

2.  **Servisleri Arayüzleri Implemente Edecek Şekilde Güncelle:**

    ```typescript
    // src/services/AuthService.ts
    @singleton()
    export class AuthService implements IAuthRepository {
      // ... signIn implementasyonu
    }
    ```

3.  **Use Case Sınıfı Oluştur:**

    ```typescript
    // src/domain/usecases/LoginUserUseCase.ts
    import { injectable, inject } from 'tsyringe';
    import { IAuthRepository } from '../repositories/IAuthRepository';

    @injectable()
    export class LoginUserUseCase {
      constructor(
        @inject('IAuthRepository') private authRepository: IAuthRepository
      ) {}

      async execute(email: string, password: string): Promise<User> {
        // Burada ek iş mantığı olabilir (validation, logging vb.)
        return this.authRepository.signIn(email, password);
      }
    }
    ```

4.  **DI Container'da Arayüzü Kaydet:**

    ```typescript
    // DI container'ın başlangıç noktasında
    container.register('IAuthRepository', {
      useClass: AuthService,
    });
    ```

Bu yapı, iş mantığınızı Firebase gibi belirli bir teknolojiden ayırarak tamamen test edilebilir ve esnek hale getirir.
