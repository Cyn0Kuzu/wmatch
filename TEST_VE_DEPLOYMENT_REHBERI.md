# 🚀 WMatch - Test ve Deployment Rehberi

## ✅ MEVCUT DURUM

Uygulama **feature-complete** durumda ve test edilmeye hazır! Tüm temel özellikler implement edilmiş.

---

## 📱 1. UYGULAMAYI TEST ETME

### **Yöntem 1: Expo Go ile Test (Önerilen - En Kolay)**

**Adımlar:**

1. **Expo Go Uygulamasını İndir:**
   - iOS: App Store'dan "Expo Go" indir
   - Android: Google Play'den "Expo Go" indir

2. **Projeyi Başlat:**
   ```bash
   cd C:\Users\lenovo\Desktop\WMatch
   npm start
   ```
   
   Bu komut:
   - Development server'ı başlatır
   - Terminal'de QR kod gösterir
   - Metro bundler çalışır

3. **QR Kodu Tara:**
   - iOS: Camera uygulaması ile QR kodu tara
   - Android: Expo Go uygulaması içindeki "Scan QR Code" ile tara

4. **Uygulama Yüklenir:**
   - Expo Go uygulaması içinde WMatch açılır
   - Hot reload aktif (kod değişiklikleri anında yansır)

**Avantajları:**
- ✅ Hızlı test
- ✅ Hot reload
- ✅ Gerçek cihazda test
- ✅ APK build gerekmez

**Dezavantajları:**
- ⚠️ Expo Go uygulaması gerekir
- ⚠️ Bazı native özellikler sınırlı olabilir

---

### **Yöntem 2: Android Emulator ile Test**

**Gereksinimler:**
- Android Studio kurulu
- Android Emulator çalışıyor

**Adımlar:**
```bash
# Emulator'ü başlat (Android Studio'dan)
# Sonra terminal'de:
npm start
# Başka bir terminal'de:
npm run android
```

**Avantajları:**
- ✅ Fiziksel cihaz gerekmez
- ✅ Farklı ekran boyutları test edilebilir

---

### **Yöntem 3: Fiziksel Android Cihaz ile Test**

**Gereksinimler:**
- USB Debugging açık
- ADB kurulu
- Cihaz USB ile bağlı

**Adımlar:**
```bash
# Cihaz bağlantısını kontrol et
adb devices

# Uygulamayı başlat
npm start

# Başka bir terminal'de:
npm run android
```

---

## 🔨 2. RELEASE BUILD OLUŞTURMA

### **ÖNEMLİ: Gradlew Komutları Gerekmez!**

Bu bir **Expo projesi**, dolayısıyla:
- ❌ `gradlew clean` gerekmez
- ❌ `gradlew build` gerekmez
- ✅ Expo'nun kendi build sistemini kullanır

---

### **Yöntem 1: EAS Build (Önerilen - Modern Yöntem)**

**EAS (Expo Application Services)** kullanarak optimize edilmiş build oluşturma:

```bash
# EAS CLI'yi global olarak kur (ilk kez)
npm install -g eas-cli

# EAS'e login ol
eas login

# Projeyi configure et (ilk kez)
eas build:configure

# Android build oluştur
npm run build-android-eas
# veya
npx eas build --platform android --profile preview
```

**Build Profilleri:**
- `preview`: Test için APK
- `production`: Play Store için AAB

**Avantajları:**
- ✅ Cloud'da build (kendi bilgisayarınızda build gerekmez)
- ✅ Optimize edilmiş APK/AAB
- ✅ Daha küçük dosya boyutu
- ✅ Play Store'a hazır

**Süre:** 10-20 dakika (cloud build)

---

### **Yöntem 2: Local Build (Gelişmiş)**

**Gereksinimler:**
- Android Studio
- Android SDK
- Java JDK

**Adımlar:**
```bash
# Development build oluştur
npx expo run:android --variant release
```

**Avantajları:**
- ✅ Hızlı (local build)
- ✅ İnternet gerekmez

**Dezavantajları:**
- ⚠️ Daha büyük APK
- ⚠️ Local ortam kurulumu gerekir

---

### **Yöntem 3: Deploy Script Kullanma**

Projede hazır bir deploy script var:

```bash
npm run deploy-android
```

Bu script:
- Cihaz bağlantısını kontrol eder
- Storage kontrolü yapar
- Önceki kurulumları temizler
- Release build oluşturur

---

## 🔔 3. FIREBASE FUNCTIONS DEPLOYMENT (KRİTİK!)

### **Neden Gerekli?**

Firebase Functions, push notification'lar için **zorunludur**:
- ✅ Yeni eşleşme bildirimleri
- ✅ Yeni mesaj bildirimleri
- ✅ Real-time event handling

**Functions olmadan:**
- ❌ Push notification'lar çalışmaz
- ❌ Eşleşme bildirimleri gönderilmez
- ❌ Mesaj bildirimleri gönderilmez

---

### **Deployment Adımları**

#### **1. Firebase CLI Kurulumu**

```bash
# Global olarak Firebase CLI kur
npm install -g firebase-tools

# Firebase'e login ol
firebase login

# Projeyi bağla (ilk kez)
firebase use --add
# Firebase proje ID'nizi seçin
```

#### **2. Functions Dependencies Kurulumu**

```bash
# Functions klasörüne git
cd functions

# Dependencies'leri kur
npm install

# Ana dizine geri dön
cd ..
```

#### **3. Firebase.json Güncelleme**

`firebase.json` dosyasına functions yapılandırması eklenmeli:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "nam5",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint"
    ]
  }
}
```

#### **4. Functions Deploy**

```bash
# Tüm functions'ları deploy et
firebase deploy --only functions

# Sadece belirli bir function deploy etmek için:
firebase deploy --only functions:onNewMatch
firebase deploy --only functions:onNewMessage
```

#### **5. Deploy Sonrası Kontrol**

```bash
# Functions listesini görüntüle
firebase functions:list

# Function loglarını görüntüle
firebase functions:log
```

---

### **Functions Yapısı**

Mevcut functions:

1. **`onNewMatch`**
   - Trigger: Yeni eşleşme oluştuğunda
   - İşlev: Eşleşen kullanıcıya push notification gönderir
   - Path: `users/{userId}/social/matches/{matchId}`

2. **`onNewMessage`**
   - Trigger: Yeni mesaj gönderildiğinde
   - İşlev: Alıcıya push notification gönderir
   - Path: `chats/{chatId}/messages/{messageId}`

**Not:** Mesajlaşma backend entegrasyonu yapıldıktan sonra bu function aktif olacak.

---

## 📋 4. TEST CHECKLIST

### **✅ Temel Fonksiyonlar**

#### **Authentication:**
- [ ] Welcome ekranı görünüyor
- [ ] Kayıt ol (5 adım)
- [ ] Email doğrulama linki geldi
- [ ] Email doğrulandı
- [ ] Giriş yap
- [ ] Oturum hatırlanıyor

#### **Watch Ekranı:**
- [ ] Film/dizi arama çalışıyor
- [ ] Popüler içerikler görünüyor
- [ ] "İzle" butonu çalışıyor
- [ ] Film detay modal açılıyor
- [ ] Favorilere ekleme çalışıyor
- [ ] "İzledim" işaretleme çalışıyor
- [ ] Şu an izlenenler listesi güncelleniyor

#### **Match Ekranı:**
- [ ] Watch'tan "İzle" yaptıktan sonra eşleşmeler görünüyor
- [ ] Swipe sağa (beğen) çalışıyor
- [ ] Swipe sola (geç) çalışıyor
- [ ] Kullanıcı kartları doğru gösteriliyor
- [ ] Fotoğraf galerisi çalışıyor
- [ ] Karşılıklı beğeni → Eşleşme bildirimi

#### **Discover Ekranı:**
- [ ] Geçmiş izlemelere göre öneriler görünüyor
- [ ] Ortak film sayısı gösteriliyor
- [ ] Swipe çalışıyor
- [ ] Pull-to-refresh çalışıyor

#### **Liked Ekranı:**
- [ ] "Beğendiklerim" sekmesi çalışıyor
- [ ] "Beni Beğenenler" sekmesi çalışıyor
- [ ] Swipeable modal açılıyor
- [ ] "Beni Beğenenler"den beğenince anında match

#### **Message Ekranı:**
- [ ] Eşleşmeler listesi görünüyor
- [ ] Chat ekranı açılıyor
- [ ] Mesaj yazma UI çalışıyor
- ⚠️ Backend entegrasyonu gerekli (UI hazır)

#### **Profile Ekranı:**
- [ ] Profil bilgileri görünüyor
- [ ] Fotoğraf galerisi çalışıyor
- [ ] Favoriler/İzlenenler görünüyor
- [ ] Profil düzenleme çalışıyor
- [ ] Çıkış yap çalışıyor

---

### **✅ Performans Testleri**

- [ ] Uygulama hızlı açılıyor (< 3 saniye)
- [ ] Ekranlar hızlı yükleniyor
- [ ] Swipe animasyonları smooth
- [ ] Scroll performansı iyi
- [ ] Memory leak yok
- [ ] Crash yok

---

### **✅ UI/UX Testleri**

- [ ] Dark theme tutarlı
- [ ] Renkler doğru (#E50914 accent)
- [ ] Animasyonlar smooth
- [ ] Loading states var
- [ ] Empty states var
- [ ] Error handling var
- [ ] Toast mesajları çalışıyor

---

## 🐛 BİLİNEN SORUNLAR VE ÇÖZÜMLER

### **Sorun 1: "No matches found" (Match Ekranı)**

**Sebep:** Watch ekranından "İzle" yapılmamış

**Çözüm:**
1. Watch ekranına git
2. Bir film seç
3. "İzle" butonuna bas
4. Match ekranına geri dön

---

### **Sorun 2: "Henüz öneri yok" (Discover Ekranı)**

**Sebep:** Yeterli film izlenmemiş

**Çözüm:**
1. Watch ekranından birkaç film izle
2. "İzledim" olarak işaretle
3. Discover ekranına geri dön

---

### **Sorun 3: Mesaj Gönderilemiyor**

**Sebep:** Backend entegrasyonu henüz yapılmamış

**Durum:****
- ✅ UI tamamen hazır
- ✅ Chat ekranı çalışıyor
- ⚠️ Backend entegrasyonu gerekli

**Çözüm:** Real-time messaging implementasyonu yapılmalı (GELISTIRME_PLANI_CEVAPLAR.md'de detaylar var)

---

### **Sorun 4: Push Notification Gelmiyor**

**Sebep:** Firebase Functions deploy edilmemiş

**Çözüm:**
1. Firebase CLI kur
2. `cd functions && npm install`
3. `firebase deploy --only functions`

---

### **Sorun 5: Email Doğrulama Linki Gelmiyor**

**Sebep:** Email spam klasöründe olabilir veya Firebase yapılandırması eksik

**Çözüm:**
1. Spam/Junk klasörünü kontrol et
2. Firebase Console'da Authentication ayarlarını kontrol et
3. Email template'lerini kontrol et

---

## 🔧 GELİŞTİRME ORTAMI KURULUMU

### **Gereksinimler:**

1. **Node.js** (v16 veya üzeri)
2. **npm** veya **yarn**
3. **Expo CLI** (npm install -g expo-cli)
4. **Firebase CLI** (npm install -g firebase-tools)
5. **Git**

### **Kurulum:**

```bash
# Dependencies kur
npm install

# Firebase yapılandırmasını kontrol et
firebase projects:list

# Expo yapılandırmasını kontrol et
npx expo doctor
```

---

## 📦 BUILD SCRIPT'LERİ ÖZET

| Komut | Amaç | Kullanım |
|-------|------|----------|
| `npm start` | Development server başlat | Test için |
| `npm run android` | Android'de çalıştır | Test için |
| `npm run ios` | iOS'da çalıştır | Test için |
| `npm run build-android` | Local Android build | Release için |
| `npm run build-android-eas` | EAS Cloud build | Release için (önerilen) |
| `npm run deploy-android` | Deploy script | Release için |
| `npm run clean` | Cache temizle | Sorun giderme |

---

## 🚀 DEPLOYMENT CHECKLIST

### **Production'a Çıkmadan Önce:**

- [ ] Tüm testler geçti
- [ ] Firebase Functions deploy edildi
- [ ] Firestore Rules kontrol edildi
- [ ] Storage Rules kontrol edildi
- [ ] Environment variables ayarlandı
- [ ] API keys güvenli (hardcode yok)
- [ ] Error handling tam
- [ ] Loading states var
- [ ] Empty states var
- [ ] Performance optimize edildi
- [ ] Memory leak yok
- [ ] Crash yok

---

## 📝 SONUÇ

Uygulama test edilmeye hazır! 

**Hızlı Test:**
1. `npm start` → QR kod tara → Expo Go'da test et

**Release Build:**
1. `npm run build-android-eas` → Cloud build

**Push Notifications:**
1. `cd functions && npm install`
2. `firebase deploy --only functions`

**Sorularınız varsa:**
- `TESTING_GUIDE.md` - Detaylı test senaryoları
- `GELISTIRME_PLANI_CEVAPLAR.md` - Geliştirme planı
- `EKRANLAR_ACIKLAMASI.md` - Ekran açıklamaları

🎬 **İyi testler!** ❤️

