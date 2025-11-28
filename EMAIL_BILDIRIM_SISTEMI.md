# 📧 Email Bildirim Sistemi Kurulum Rehberi

## 🎯 Sorun
Bildirim gönderildiğinde "memodee333@gmail.com" adresine email gönderilmiyor.

## ✅ Çözüm
Firebase Functions kullanarak otomatik email gönderimi yapılandırıldı.

---

## 📋 Kurulum Adımları

### 1. Firebase Functions Kurulumu

```bash
# Firebase CLI ile functions klasörü oluştur
firebase init functions

# Seçenekler:
# - JavaScript kullan
# - ESLint kullan (opsiyonel)
# - Dependencies yükle (evet)
```

### 2. Gerekli Paketleri Yükle

```bash
cd functions
npm install nodemailer
npm install firebase-functions firebase-admin
```

### 3. Email Yapılandırması

Gmail kullanmak için App Password oluştur:
1. Google Account → Security → 2-Step Verification (açık olmalı)
2. App Passwords → Generate
3. "Mail" ve "Other (Custom name)" seç
4. Oluşturulan şifreyi kopyala

### 4. Firebase Functions Config Ayarla

```bash
# Gmail kullanıcı adı ve App Password ayarla
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
```

### 5. Functions Dosyasını Kopyala

`functions/index.js` dosyası zaten oluşturuldu. İçeriğini kontrol et.

### 6. Deploy Et

```bash
# Functions'ı deploy et
firebase deploy --only functions

# Veya sadece sendReportEmail function'ını deploy et
firebase deploy --only functions:sendReportEmail
```

---

## 🔧 Alternatif: HTTP Endpoint Kullanımı

Eğer Firebase Functions kullanmak istemiyorsanız, EmailService'i bir HTTP endpoint ile yapılandırabilirsiniz:

```typescript
// App.tsx veya CoreEngine.tsx içinde
import { emailService } from './services/EmailService';

// Email API URL'ini ayarla (örnek: Firebase Functions HTTP endpoint)
emailService.setEmailApiUrl('https://us-central1-mwatch-69a6f.cloudfunctions.net/sendReportEmail');
```

---

## 🧪 Test

Bildirim gönderildiğinde:
1. Firestore'da `reports` koleksiyonuna kayıt eklenir
2. Firebase Functions trigger çalışır
3. Email "memodee333@gmail.com" adresine gönderilir

---

## 📝 Notlar

- Email gönderilemezse, bildirim yine de Firestore'a kaydedilir
- Console'da email gönderim durumu loglanır
- Email API URL yapılandırılmamışsa, console'a detaylı log yazılır

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Functions klasörü oluştur
firebase init functions

# 2. Paketleri yükle
cd functions
npm install nodemailer firebase-functions firebase-admin

# 3. Email config ayarla
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"

# 4. Deploy et
firebase deploy --only functions
```

---

## ✅ Kontrol

Bildirim gönderildikten sonra:
- ✅ Firestore'da `reports` koleksiyonunda kayıt var mı?
- ✅ Firebase Functions logs'da email gönderim mesajı var mı?
- ✅ "memodee333@gmail.com" adresine email geldi mi?

---

## 🔍 Sorun Giderme

### Email gelmiyor
1. Firebase Functions logs kontrol et: `firebase functions:log`
2. Email config doğru mu: `firebase functions:config:get`
3. Gmail App Password doğru mu?
4. Spam klasörünü kontrol et

### Functions deploy hatası
1. Node.js versiyonu kontrol et (v14+ gerekli)
2. `functions/package.json` dosyasını kontrol et
3. Dependencies yüklü mü: `cd functions && npm install`

---

## 📧 Email İçeriği

Email şunları içerir:
- Bildirim ID
- Kategoriler
- Açıklama
- Bildiren kullanıcı bilgileri
- Bildirilen kullanıcı bilgileri
- Ekran görüntüleri (varsa)
- Tarih

