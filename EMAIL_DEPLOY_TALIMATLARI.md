# 📧 Email Bildirim Sistemi Deploy Talimatları

## ⚠️ ÖNEMLİ
Email gönderimi için Firebase Functions'ı deploy etmeniz **ZORUNLUDUR**. Aksi halde bildirimler email'e gönderilmeyecektir.

---

## 🚀 Hızlı Deploy (PowerShell Script)

### 1. Deploy Script'ini Çalıştır

```powershell
.\deploy-email-function.ps1
```

Script size adım adım rehberlik edecek:
- Gmail App Password oluşturma talimatları
- Email bilgilerini girme
- Otomatik config ayarlama
- Functions deploy

---

## 📋 Manuel Deploy Adımları

### 1. Gmail App Password Oluştur

1. Google Account'a giriş yapın
2. **Security** → **2-Step Verification** (açık olmalı)
3. **App Passwords** → **Generate**
4. **"Mail"** ve **"Other (Custom name)"** seçin
5. Oluşturulan şifreyi kopyalayın (16 karakterlik)

### 2. Firebase Functions Config Ayarla

```bash
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
```

**Örnek:**
```bash
firebase functions:config:set email.user="memodee333@gmail.com" email.password="abcd efgh ijkl mnop"
```

### 3. Functions Paketlerini Yükle

```bash
cd functions
npm install
cd ..
```

### 4. Functions'ı Deploy Et

```bash
firebase deploy --only functions:sendReportEmail
```

---

## ✅ Deploy Sonrası Kontrol

### 1. Firebase Console'da Kontrol

1. [Firebase Console](https://console.firebase.google.com) → Projeniz
2. **Functions** sekmesine gidin
3. `sendReportEmail` function'ının **Active** olduğunu kontrol edin

### 2. Test

1. Uygulamada bir bildirim gönderin
2. `memodee333@gmail.com` adresine email gelip gelmediğini kontrol edin
3. Email'de tüm detayların (bildiren, bildirilen, ekran görüntüleri vb.) olduğunu kontrol edin

---

## 📧 Email İçeriği

Email şunları içerir:

### Bildirim Detayları
- Bildirim ID
- Kategoriler
- Açıklama
- Tarih

### Bildiren Kullanıcı
- Ad Soyad
- Kullanıcı Adı
- Email
- User ID
- Bio
- Konum
- Takipçi/Takip/Eşleşme sayıları
- İzlenen film sayısı
- Hesap oluşturulma tarihi
- Son aktiflik tarihi

### Bildirilen Kullanıcı
- Ad Soyad
- Kullanıcı Adı
- Email
- User ID
- Bio
- Konum
- Takipçi/Takip/Eşleşme sayıları
- İzlenen film sayısı
- Hesap oluşturulma tarihi
- Son aktiflik tarihi

### Ekran Görüntüleri
- Varsa tüm ekran görüntüleri email'de görüntülenir

---

## 🔍 Sorun Giderme

### Email gelmiyor

1. **Firebase Functions logs kontrol:**
   ```bash
   firebase functions:log
   ```

2. **Config kontrol:**
   ```bash
   firebase functions:config:get
   ```

3. **Gmail App Password doğru mu?**
   - 16 karakterlik olmalı
   - Boşluklar olabilir (script otomatik temizler)

4. **Spam klasörünü kontrol edin**

### Functions deploy hatası

1. **Node.js versiyonu kontrol:**
   ```bash
   node --version  # v18+ olmalı
   ```

2. **Paketler yüklü mü:**
   ```bash
   cd functions
   npm install
   ```

3. **Firebase CLI güncel mi:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

---

## 📝 Notlar

- Email gönderimi **otomatik** olarak yapılır (Firestore trigger)
- Bildirim Firestore'a kaydedildiğinde email gönderilir
- Email gönderilemese bile bildirim kaydedilir
- Tüm detaylar email'de yer alır

---

## 🎯 Başarı Kriterleri

✅ Firebase Functions deploy edildi
✅ `sendReportEmail` function'ı aktif
✅ Bildirim gönderildiğinde email geliyor
✅ Email'de tüm detaylar var (bildiren, bildirilen, ekran görüntüleri vb.)

---

**Sorun yaşıyorsanız:** `firebase functions:log` komutu ile logları kontrol edin.



