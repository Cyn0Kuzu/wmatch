# 🔧 GitHub Pages Düzeltme Talimatları

## ⚠️ Sorun

GitHub Pages ayarlarında **"/ (root)"** klasörü seçili, ancak sayfa **`/docs`** klasöründe. Bu yüzden GitHub Pages çalışmıyor.

## ✅ Çözüm

### GitHub'da Ayarları Düzelt

1. **GitHub repository'nize gidin:** https://github.com/Cyn0Kuzu/wmatch
2. **Settings** → **Pages** sekmesine gidin
3. **Build and deployment** bölümünde:
   - **Source:** "Deploy from a branch" seçili olmalı ✅
   - **Branch:** `main` seçili olmalı ✅
   - **Folder:** **`/docs`** seçin ⚠️ (Şu anda "/ (root)" seçili)
4. **Save** butonuna tıklayın

### Beklenen Sonuç

GitHub Pages URL'iniz aktif olacak:
```
https://cyn0kuzu.github.io/wmatch/
```

Sayfa yüklenmesi 1-2 dakika sürebilir.

## ✅ Yapılan Düzeltmeler

### 1. URL'ler Güncellendi
- ✅ `src/screens/WelcomeScreen.tsx` - URL güncellendi
- ✅ `src/screens/RegisterScreen.tsx` - URL güncellendi

**Yeni URL:**
```typescript
const privacyUrl = 'https://cyn0kuzu.github.io/wmatch/';
```

### 2. Dosya Kontrolü
- ✅ `docs/index.html` - Mevcut ve hazır
- ✅ `docs/README.md` - Mevcut

## 📋 Kontrol Listesi

- [x] URL'ler güncellendi (WelcomeScreen, RegisterScreen)
- [ ] GitHub Pages ayarlarında `/docs` klasörü seçildi
- [ ] GitHub Pages aktif ve çalışıyor
- [ ] URL test edildi: https://cyn0kuzu.github.io/wmatch/

## 🔍 Test

1. GitHub Pages ayarlarını düzelttikten sonra
2. 1-2 dakika bekleyin
3. Tarayıcıda açın: https://cyn0kuzu.github.io/wmatch/
4. Sayfa açılıyorsa ✅ başarılı!

## ⚠️ Önemli Not

GitHub Pages'in aktif olması için:
- ✅ `docs/index.html` dosyası mevcut
- ✅ Main branch'e push edildi
- ⚠️ **GitHub'da `/docs` klasörü seçilmeli** (şu anda "/ (root)" seçili)

