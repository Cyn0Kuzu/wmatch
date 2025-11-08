# 🧭 WMatch - Navigation ve Routing İyileştirme Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının `react-navigation` yapısını daha **modern**, **performanslı** ve **tip güvenli (type-safe)** hale getirmek için somut ve önceliklendirilmiş adımlar sunmaktadır. Öneriler, Faz 3 Navigasyon Denetimi sırasında tespit edilen ve kullanıcı deneyimini doğrudan etkileyen sorunlara odaklanmaktadır.

---

## 2. Yüksek Öncelikli İyileştirme: Tek Navigasyon Yığınına Geçiş

**Sorun:** Giriş/çıkış anında iki ayrı navigasyon yığını arasında geçiş yapılması, ekranda "flicker" (yanıp sönme) ve state kaybına neden oluyor.

**Öneri:** Kimlik doğrulama durumunu, ekranları koşullu olarak render ederek tek bir `StackNavigator` içinde yönetin.

### Uygulama Adımları:

1.  **Navigasyon Tiplerini Tanımlayın (Ön Adım):**
    -   Tüm ekranlarınızı ve alabilecekleri parametreleri içeren bir tip listesi oluşturun. Bu, sonraki adımları kolaylaştıracaktır.

    **Örnek Kod (`src/navigation/types.ts`):**
    ```typescript
    export type AuthStackParamList = {
      Welcome: undefined;
      Login: undefined;
      Register: undefined;
    };

    export type MainTabParamList = {
      Watch: undefined;
      Match: undefined;
      // ...diğer tab'lar
    };

    export type RootStackParamList = {
      Auth: NavigatorScreenParams<AuthStackParamList>;
      Main: NavigatorScreenParams<MainTabParamList>;
      Settings: undefined; // Örnek bir modal ekran
    };
    ```

2.  **`AppNavigator.tsx`'i Yeniden Yapılandırın:**
    -   Tüm ekran gruplarını tek bir `StackNavigator` içine yerleştirin.
    -   Kimlik doğrulama mantığını navigatörden çıkarıp global state'ten okuyun.

    **Örnek Kod (`src/navigation/AppNavigator.tsx` - Refactored):**
    ```typescript
    import { useAppStore } from '../store/useAppStore';
    // ...

    const Stack = createStackNavigator<RootStackParamList>();

    export const AppNavigator: React.FC = () => {
      const isAuthenticated = useAppStore((state) => state.isAuthenticated);
      const isLoading = useAppStore((state) => state.isLoading); // Auth durumu yükleniyor mu?

      if (isLoading) {
        return <SplashScreen />; // Veya bir yükleme ekranı
      }

      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
          {/* Buraya tüm ekranlardan erişilebilecek ortak modallar eklenebilir */}
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      );
    };
    ```
    *Not: `AuthStack` ve `MainTabs` component'leri, kendi içlerindeki `StackNavigator` ve `TabNavigator`'ı içermeye devam eder.*

---

## 3. Yüksek Öncelikli İyileştirme: Merkezi Kimlik Doğrulama Mantığı

**Sorun:** `AppNavigator` içindeki kimlik doğrulama mantığı karmaşık, güvenilmez ve yanlış yerde.

**Öneri:** Kimlik doğrulama durumunu, uygulamanın kökünde dinleyin ve sonucu doğrudan global state'e (Zustand store) yazın.

### Uygulama Adımları:

1.  **Auth Dinleyicisini `CoreEngine`'e Taşıyın:**
    -   Uygulama ilk yüklendiğinde `onAuthStateChanged` için tek bir dinleyici kurun.

    **Örnek Kod (`src/core/CoreEngine.tsx`):**
    ```typescript
    import { useAppStore } from '../store/useAppStore';

    export const CoreEngine: React.FC = ({ children }) => {
      const { setAuthenticated, setLoading } = useAppStore();

      useEffect(() => {
        const unsubscribe = coreService.authService.onAuthStateChanged((user) => {
          const isAuthenticated = !!user && user.emailVerified;
          setAuthenticated(isAuthenticated);
          setLoading(false); // Auth durumu belirlendi, yükleme bitti.
        });

        return () => unsubscribe(); // Cleanup on unmount
      }, []);

      // ...
    };
    ```

2.  **`AppNavigator.tsx`'ten `useEffect`'i Kaldırın:**
    -   `AppNavigator.tsx` içindeki kimlik doğrulama ile ilgili tüm `useEffect` ve `useState` hook'larını tamamen silin. `AppNavigator` artık sadece global state'i okumakla sorumlu olacaktır.

---

## 4. Orta Öncelikli İyileştirme: Tip Güvenliği (Type Safety)

**Sorun:** Ekran adları ve parametreler string olarak kullanılıyor, bu da hatalara açık.

**Öneri:** `react-navigation`'ın tip sistemini tam olarak entegre edin.

### Uygulama Adımları:

1.  **`ParamList` Tiplerini Oluşturun:** Adım 1'de gösterildiği gibi, her navigatör için `ParamList` tipleri oluşturun.

2.  **Tipleri Navigatörlere ve Hook'lara Sağlayın:**
    -   `createStackNavigator<RootStackParamList>()`
    -   `createBottomTabNavigator<MainTabParamList>()`
    -   `const navigation = useNavigation<NavigationProp<RootStackParamList>>();`
    -   `const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();`

3.  **Tip Güvenli Navigasyon Kullanın:**
    -   Artık `navigation.navigate` fonksiyonu, sadece `ParamList`'te tanımlı ekran adlarını kabul edecek ve parametrelerin doğru tipte olmasını zorunlu kılacaktır.

    **Örnek:**
    ```typescript
    // HATA ❌: TypeScript derleme hatası verir, çünkü 'userId' eksik.
    navigation.navigate('Profile');

    // DOĞRU ✅:
    navigation.navigate('Profile', { userId: '123' });
    ```

Bu adımlar, navigasyon yapınızı daha sağlam, kullanıcı deneyimini daha akıcı ve geliştirme sürecini daha güvenli hale getirecektir.
