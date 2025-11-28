# 💳 Ödeme Sistemi Rehberi - MVP İçin

## 🎯 Demo Fiyatlandırma
- **Günlük Swipe:** 2 swipe/gün (ücretsiz)
- **1 Ekstra Swipe:** 1 TL
- **2 Ekstra Swipe:** 2 TL
- **Premium:** 3 TL/ay (sınırsız swipe + tüm filtreler)

---

## 📱 Ödeme Sistemi Seçenekleri (iOS + Android)

### 1️⃣ **react-native-iap (ÖNERİLEN - Hem iOS Hem Android) ⭐⭐⭐⭐⭐**

#### ✅ Avantajlar:
- **Tek paket ile hem iOS hem Android desteği**
- Google Play Billing (Android) + Apple In-App Purchase (iOS)
- Kolay entegrasyon, tek API
- Native ödeme sistemleri (güvenli)
- Otomatik abonelik yönetimi

#### ❌ Dezavantajlar:
- Google/Apple %30 komisyon
- Her platform için ayrı ürün tanımlama gerekir
- App Store/Play Store'da yayınlanmalı

#### 🔧 Teknoloji:
```bash
npm install react-native-iap
```

#### 📝 Kullanım:
```typescript
import * as RNIap from 'react-native-iap';

// Hem iOS hem Android için çalışır
const products = await RNIap.getProducts(['extra_swipes_1']);
const purchase = await RNIap.requestPurchase('extra_swipes_1');
```

---

### 2️⃣ **Stripe (Uluslararası, Kredi Kartı) ⭐⭐⭐⭐**

#### ✅ Avantajlar:
- **Hem iOS hem Android'de çalışır**
- Kredi kartı, Apple Pay, Google Pay desteği
- Dünya çapında kullanılabilir
- Güçlü React Native SDK
- Komisyon: %2.9 + 0.30$ (kredi kartı)

#### ❌ Dezavantajlar:
- Türk Lirası desteği sınırlı (USD/EUR ağırlıklı)
- Kredi kartı bilgisi girmek gerekir (kullanıcı deneyimi)
- 3D Secure desteği gerekir (Türkiye için)

#### 🔧 Teknoloji:
```bash
npm install @stripe/stripe-react-native
```

---

### 3️⃣ **iyzico (Sadece Türkiye) ⭐⭐⭐**

#### ✅ Avantajlar:
- Türk şirketi, Türk Lirası desteği
- Düşük komisyon (%2.9 + 0.25 TL)
- Kredi kartı, banka kartı, cüzdan

#### ❌ Dezavantajlar:
- **Sadece Türkiye'de kullanılabilir**
- React Native SDK sınırlı (WebView gerekir)
- iOS/Android native entegrasyon yok

---

### 4️⃣ **PayPal (Uluslararası) ⭐⭐⭐**

#### ✅ Avantajlar:
- Hem iOS hem Android
- Dünya çapında kullanılabilir
- PayPal hesabı ile ödeme

#### ❌ Dezavantajlar:
- Türkiye'de sınırlı kullanım
- Yüksek komisyon (%3.4 + sabit ücret)
- React Native SDK sınırlı

---

### 5️⃣ **RevenueCat (Abonelik Yönetimi) ⭐⭐⭐⭐⭐**

#### ✅ Avantajlar:
- **Hem iOS hem Android**
- Google Play + Apple IAP'ı tek API'de birleştirir
- Abonelik yönetimi otomatik
- Analytics ve kullanıcı yönetimi
- Ücretsiz plan mevcut

#### ❌ Dezavantajlar:
- Google/Apple komisyonu + RevenueCat ücreti (küçük)
- Backend entegrasyonu gerekir

#### 🔧 Teknoloji:
```bash
npm install react-native-purchases
```

---

## 🎯 iOS + Android İçin En İyi Seçenekler

### **Seçenek 1: react-native-iap (ÖNERİLEN)**
```
✅ Tek paket
✅ Native ödeme (güvenli)
✅ Hem iOS hem Android
✅ Kolay entegrasyon
❌ %30 komisyon (Google/Apple)
```

### **Seçenek 2: RevenueCat**
```
✅ react-native-iap'ın üstüne ekstra özellikler
✅ Abonelik yönetimi
✅ Analytics
✅ Hem iOS hem Android
❌ Ekstra maliyet
```

### **Seçenek 3: Stripe**
```
✅ Kredi kartı direkt ödeme
✅ Apple Pay / Google Pay
✅ Hem iOS hem Android
❌ Türk Lirası sınırlı
❌ 3D Secure gerekir
```

---

## 💡 MVP İçin Öneri

### **react-native-iap** kullan (hem iOS hem Android)

**Neden:**
1. Tek paket, iki platform
2. Native ödeme (güvenli)
3. Kolay entegrasyon
4. Standart komisyon (%30)

**Kurulum:**
```bash
npm install react-native-iap
cd ios && pod install
```

**Kod:**
```typescript
import * as RNIap from 'react-native-iap';

// Platform otomatik algılanır
const products = await RNIap.getProducts(['extra_swipes_1']);
const purchase = await RNIap.requestPurchase('extra_swipes_1');
```

---

### 1️⃣ **Google Play Billing (ÖNERİLEN - Android)**

#### ✅ Avantajlar:
- Google'ın kendi ödeme sistemi
- Kullanıcılar Google hesabı ile ödeme yapar
- Güvenli ve otomatik işlem yönetimi
- Google %30 komisyon alır (standart)
- Kolay entegrasyon (`react-native-iap`)

#### ❌ Dezavantajlar:
- Sadece Android için
- Google Play Store'da yayınlanmalı
- Google'ın kurallarına uymalı

#### 🔧 Teknoloji:
```bash
npm install react-native-iap
```

#### 📝 Kullanım:
```typescript
import * as RNIap from 'react-native-iap';

// Ürünleri al
const products = await RNIap.getProducts(['extra_swipes_1', 'extra_swipes_2', 'premium_monthly']);

// Satın alma
const purchase = await RNIap.requestPurchase('extra_swipes_1');

// Backend'de doğrula (Firebase Functions)
```

---

### 2️⃣ **iyzico (Türkiye İçin İyi Seçenek)**

#### ✅ Avantajlar:
- Türk şirketi, Türk Lirası desteği
- Kredi kartı, banka kartı, cüzdan desteği
- Mobil SDK mevcut
- Komisyon: ~%2.9 + 0.25 TL (kredi kartı)
- Hızlı onay süreci

#### ❌ Dezavantajlar:
- Sadece Türkiye'de kullanılabilir
- React Native SDK'sı sınırlı (webview kullanılabilir)
- Backend entegrasyonu gerekli

#### 🔧 Teknoloji:
```bash
npm install react-native-webview
# iyzico için webview ile ödeme sayfası gösterilir
```

#### 📝 Kullanım:
```typescript
// iyzico API ile backend'de ödeme başlat
// WebView ile ödeme sayfasını göster
// Callback ile sonucu al
```

---

### 3️⃣ **Stripe (Uluslararası)**

#### ✅ Avantajlar:
- Dünya çapında kullanılabilir
- Güçlü React Native SDK
- Kredi kartı, Apple Pay, Google Pay
- Komisyon: %2.9 + 0.30$ (uluslararası)

#### ❌ Dezavantajlar:
- Türk Lirası desteği sınırlı
- Daha yüksek komisyon
- Karmaşık kurulum

---

### 4️⃣ **Apple In-App Purchase (iOS)**

#### ✅ Avantajlar:
- iOS için zorunlu
- Apple'ın kendi sistemi
- Güvenli

#### ❌ Dezavantajlar:
- Sadece iOS
- Apple %30 komisyon
- App Store'da yayınlanmalı

---

## 🎯 MVP İçin Öneri: **react-native-iap (iOS + Android)**

### Senaryo:
1. **iOS + Android:** `react-native-iap` kullan (tek paket)
2. **Platform otomatik algılanır:** iOS → Apple IAP, Android → Google Play
3. **Tek kod, iki platform**

### Neden react-native-iap?
- **Tek paket:** Hem iOS hem Android
- **Native ödeme:** Güvenli ve hızlı
- **Kolay entegrasyon:** Tek API
- **Standart:** Her platformun kendi ödeme sistemi

---

## 🚀 Hızlı Başlangıç: react-native-iap (iOS + Android)

### 1. Paketi Yükle
```bash
npm install react-native-iap
cd ios && pod install # iOS için
```

### 2. Platform'larda Ürünleri Tanımla

**Android (Google Play Console):**
1. Google Play Console → Uygulamanız → Monetize → Ürünler → In-app products
2. Ürünleri ekle:
   - `extra_swipes_1` - 1 TL
   - `extra_swipes_2` - 2 TL
   - `premium_monthly` - 3 TL

**iOS (App Store Connect):**
1. App Store Connect → Uygulamanız → In-App Purchases
2. Aynı ürün ID'leri ile ürünleri ekle
3. Fiyatları belirle (TL veya USD)

### 3. Kod Entegrasyonu
```typescript
// PurchaseService.ts'yi güncelle
import * as RNIap from 'react-native-iap';
import { Platform } from 'react-native';

const productIds = [
  'extra_swipes_1',
  'extra_swipes_2', 
  'premium_monthly'
];

// Platform otomatik algılanır (iOS/Android)
await RNIap.initConnection();

// Ürünleri al (hem iOS hem Android için)
const products = await RNIap.getProducts(productIds);

// Satın alma (platform otomatik)
const purchase = await RNIap.requestPurchase('extra_swipes_1');

// Backend'de doğrula (Firebase Functions)
// iOS için: Apple receipt verification
// Android için: Google Play purchase token verification
```

### 4. Backend Doğrulama (Firebase Functions)
```javascript
// functions/index.js
const {google} = require('googleapis');
const https = require('https');

exports.verifyPurchase = functions.https.onCall(async (data, context) => {
  const {platform, purchaseToken, productId, receipt} = data;
  
  if (platform === 'ios') {
    // Apple receipt verification
    // App Store API ile doğrula
    // receipt data ile doğrulama yap
  } else if (platform === 'android') {
    // Google Play API ile doğrula
    const auth = new google.auth.GoogleAuth();
    const androidpublisher = google.androidpublisher('v3');
    // purchaseToken ile doğrulama yap
  }
  
  // Başarılıysa Firestore'a kaydet
});
```

---

## 💡 Demo İçin Basit Çözüm

### Test Modu (Şimdilik)
```typescript
// PurchaseService.ts - Test modu
async purchaseProduct(userId: string, productId: string): Promise<PurchaseResult> {
  // DEMO: Gerçek ödeme yapmadan test et
  if (__DEV__) {
    // Test modunda direkt başarılı döndür
    if (productId === 'premium_monthly') {
      await premiumService.purchasePremium(userId, 1);
    } else if (productId.startsWith('extra_swipes_')) {
      const product = premiumService.getProduct(productId);
      if (product?.amount) {
        await swipeLimitService.addExtraSwipes(userId, product.amount);
      }
    }
    return { success: true, productId };
  }
  
  // Production'da gerçek ödeme yap
  // ...
}
```

---

## 📊 Komisyon Karşılaştırması

| Sistem | Komisyon | Türkiye Desteği | Kolaylık |
|--------|----------|-----------------|----------|
| Google Play | %30 | ✅ | ⭐⭐⭐⭐⭐ |
| iyzico | %2.9 + 0.25₺ | ✅ | ⭐⭐⭐ |
| Stripe | %2.9 + 0.30$ | ⚠️ | ⭐⭐⭐⭐ |
| Apple IAP | %30 | ✅ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Sonuç ve Öneri

### MVP İçin:
1. **Şimdilik:** Test modu ile başla (gerçek ödeme yok)
2. **iOS + Android için:** `react-native-iap` entegre et
3. **Production:** Her iki platformda da aktif et
4. **Alternatif:** Türkiye için iyzico eklenebilir (opsiyonel)

### Adımlar:
1. ✅ Kod hazır (test modu)
2. ⏳ `react-native-iap` paketini ekle
3. ⏳ Google Play Console'da ürünleri tanımla (Android)
4. ⏳ App Store Connect'te ürünleri tanımla (iOS)
5. ⏳ Backend doğrulama (Firebase Functions)
6. ⏳ Test et ve yayınla

---

## 📝 Notlar

- **Demo fiyatları:** Test için çok düşük (1-3 TL)
- **Production:** Gerçek fiyatları belirle (örn: 10-25-250 TL)
- **Güvenlik:** Ödeme doğrulaması mutlaka backend'de yapılmalı
- **Kullanıcı deneyimi:** Ödeme başarısız olursa kullanıcıya bilgi ver

