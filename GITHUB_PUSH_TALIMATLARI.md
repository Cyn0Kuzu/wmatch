# GitHub'a Push Talimatları

## ✅ Yapılan İşlemler

1. ✅ Git repository başlatıldı
2. ✅ Tüm dosyalar commit edildi
3. ✅ Main branch olarak ayarlandı

## 📋 GitHub'a Push Adımları

### 1. GitHub'da Repository Oluştur

1. GitHub.com'a giriş yapın
2. **New repository** butonuna tıklayın
3. Repository adı: `mwatch` (veya istediğiniz isim)
4. **Public** veya **Private** seçin
5. **Initialize this repository with a README** seçeneğini **İŞARETLEMEYİN**
6. **Create repository** butonuna tıklayın

### 2. Remote Repository Ekle ve Push

GitHub'da repository oluşturduktan sonra, size verilen URL'i kullanın:

```bash
# Remote repository ekle (URL'i kendi repository URL'iniz ile değiştirin)
git remote add origin https://github.com/[KULLANICI_ADI]/[REPO_ADI].git

# Tüm branch'leri push et
git push -u origin main

# Eğer eski branch'ler varsa, onları sil
git branch -D [ESKI_BRANCH_ADI]  # Her eski branch için tekrarlayın
```

### 3. Eski Branch'leri Kontrol Et ve Sil

```bash
# Tüm branch'leri listele
git branch -a

# Eski branch'leri sil (eğer varsa)
git branch -D [branch-adi]
```

### 4. GitHub Pages'i Aktifleştir

1. GitHub repository'nize gidin
2. **Settings** → **Pages** sekmesine gidin
3. **Source** bölümünden **Deploy from a branch** seçin
4. **Branch:** `main` seçin
5. **Folder:** `/docs` seçin
6. **Save** butonuna tıklayın

GitHub Pages URL'iniz:
```
https://[KULLANICI_ADI].github.io/[REPO_ADI]/
```

### 5. LoginScreen'de URL'i Güncelle

`src/screens/LoginScreen.tsx`, `src/screens/WelcomeScreen.tsx` ve `src/screens/RegisterScreen.tsx` dosyalarında:

```typescript
const privacyUrl = 'https://[KULLANICI_ADI].github.io/[REPO_ADI]/';
```

satırını kendi GitHub Pages URL'iniz ile değiştirin.

## 🔧 Git Config (İsteğe Bağlı)

Eğer farklı bir email/name kullanmak isterseniz:

```bash
git config user.email "sizin@email.com"
git config user.name "Sizin Adınız"
```

## ✅ Kontrol Listesi

- [ ] GitHub'da repository oluşturuldu
- [ ] Remote repository eklendi
- [ ] Main branch push edildi
- [ ] Eski branch'ler silindi (eğer varsa)
- [ ] GitHub Pages aktifleştirildi
- [ ] LoginScreen, WelcomeScreen ve RegisterScreen'de URL güncellendi

## 📝 Notlar

- Tüm dosyalar commit edildi
- `.gitignore` dosyası eklendi (node_modules, build dosyaları vb. hariç)
- Main branch olarak ayarlandı
- Privacy policy checkbox'ları WelcomeScreen, LoginScreen ve RegisterScreen'e eklendi

