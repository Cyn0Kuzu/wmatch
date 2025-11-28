# GitHub Pages Yayınlama Rehberi

## 📋 Adımlar

### 1. GitHub Repository Oluştur
- GitHub'da yeni bir repository oluşturun (veya mevcut repo'yu kullanın)
- Repository adı: `mwatch-privacy` veya istediğiniz bir isim

### 2. `docs` Klasörünü GitHub'a Yükle
```bash
# Repository'yi klonlayın
git clone https://github.com/[KULLANICI_ADI]/[REPO_ADI].git
cd [REPO_ADI]

# docs klasörünü kopyalayın
# (docs/index.html zaten oluşturuldu)

# Commit ve push
git add docs/
git commit -m "Add privacy policy page"
git push origin main
```

### 3. GitHub Pages'i Aktifleştir
1. GitHub repository'nize gidin
2. **Settings** → **Pages** sekmesine gidin
3. **Source** bölümünden **Deploy from a branch** seçin
4. **Branch:** `main` seçin
5. **Folder:** `/docs` seçin
6. **Save** butonuna tıklayın

### 4. URL'i Alın
GitHub Pages URL'iniz şu formatta olacak:
```
https://[KULLANICI_ADI].github.io/[REPO_ADI]/
```

Örnek:
```
https://username.github.io/mwatch-privacy/
```

### 5. LoginScreen'de URL'i Güncelleyin
`src/screens/LoginScreen.tsx` dosyasında:
```typescript
const privacyUrl = 'https://[KULLANICI_ADI].github.io/[REPO_ADI]/';
```
satırını kendi GitHub Pages URL'iniz ile değiştirin.

## 🔧 Özelleştirme

### Şirket Bilgilerini Güncelleyin
`docs/index.html` dosyasında aşağıdaki bölümleri güncelleyin:
- Şirket adı
- İletişim bilgileri (email, adres, telefon)
- Vergi numarası
- [Şirket Adresi] placeholder'ları

### Email Adreslerini Güncelleyin
- `info@mwatch.app` → Kendi email adresiniz
- `destek@mwatch.app` → Destek email adresiniz
- `güvenlik@mwatch.app` → Güvenlik email adresiniz
- `kvkk@mwatch.app` → KVKK email adresiniz

## ✅ Kontrol Listesi

- [ ] GitHub repository oluşturuldu
- [ ] `docs/index.html` yüklendi
- [ ] GitHub Pages aktifleştirildi
- [ ] URL test edildi (tarayıcıda açıldı)
- [ ] LoginScreen'de URL güncellendi
- [ ] Şirket bilgileri güncellendi
- [ ] Email adresleri güncellendi

## 📱 Test

1. Uygulamayı açın
2. Login ekranına gidin
3. "Gizlilik Politikası" linkine tıklayın
4. GitHub Pages sayfasının açıldığını doğrulayın

## 🔗 Örnek URL Formatı

```
https://username.github.io/mwatch-privacy/
```

Bu URL'i LoginScreen'de kullanın.

