# Emulator Sorunu - Cozum Ozeti

## 🔍 Tespit Edilen Sorunlar

### 1. Ana Sorun: BIOS Virtualization KAPALI
- **CPU Virtualization: False** tespit edildi
- Bu, emülatörün çalışmamasının ana nedeni
- Hyper-V aktif olsa bile, BIOS'ta virtualization kapalıysa çalışmaz

### 2. Yapılan Düzeltmeler

✅ **AVD Config Güncellendi:**
- GPU mode: `swiftshader_indirect` (software rendering)
- RAM: 2048 MB → 1536 MB (daha stabil)
- Backup oluşturuldu: `config.ini.backup`

✅ **Emülatör Software Rendering ile Başlatıldı:**
- BIOS olmadan çalışabilir
- Daha yavaş ama çalışır

## 📋 Çözüm Seçenekleri

### ✅ ÇÖZÜM 1: BIOS Virtualization Etkinleştir (ÖNERİLEN)

**Adımlar:**
1. Bilgisayarı yeniden başlat
2. BIOS'a gir (F2, F10, F12 veya Del)
3. **Intel Virtualization Technology (VT-x)** veya **AMD-V** bul
4. **Enabled** yap
5. F10 ile kaydet ve çık
6. Windows açıldıktan sonra emülatörü tekrar dene

**Detaylı rehber:** `BIOS_VIRTUALIZATION_REHBERI.md`

### ✅ ÇÖZÜM 2: Software Rendering (ZATEN YAPILDI)

AVD config dosyası güncellendi. Emülatörü şu komutla başlat:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -gpu swiftshader_indirect
```

**Not:** Daha yavaş çalışır ama BIOS değişikliği gerektirmez.

### ✅ ÇÖZÜM 3: Expo Go (EN KOLAY)

Emülatör sorunları devam ederse:

```bash
npm start
```

Telefonunuzda Expo Go uygulamasını açın ve QR kodu tarayın.

### ✅ ÇÖZÜM 4: Yeni Hafif AVD

Android Studio'da:
1. Tools > Device Manager
2. Create Device
3. Pixel 3 seçin
4. API 30 veya daha düşük
5. Advanced Settings:
   - RAM: 1536 MB
   - Graphics: Software - GLES 2.0

## 🚀 Hızlı Başlatma

### Software Rendering ile:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -gpu swiftshader_indirect -no-snapshot-load
```

### Expo Go ile:
```bash
npm start
# Telefonda Expo Go ile QR kodu tarayın
```

## 📁 Oluşturulan Dosyalar

1. **emulator-detayli-cozum.ps1** - Otomatik düzeltme scripti
2. **BIOS_VIRTUALIZATION_REHBERI.md** - BIOS rehberi
3. **COZUM_OZETI.md** - Bu dosya
4. **config.ini.backup** - AVD config yedek

## ⚠️ Önemli Notlar

1. **BIOS Virtualization** en iyi çözümdür - emülatör daha hızlı çalışır
2. **Software Rendering** BIOS olmadan çalışır ama yavaştır
3. **Expo Go** en kolay çözümdür - fiziksel cihaz kullanır
4. AVD config yedeği: `C:\Users\cayan\.android\avd\Medium_Phone.avd\config.ini.backup`

## 🔄 Geri Alma

Eğer değişiklikleri geri almak isterseniz:

```powershell
$backup = "$env:USERPROFILE\.android\avd\Medium_Phone.avd\config.ini.backup"
$config = "$env:USERPROFILE\.android\avd\Medium_Phone.avd\config.ini"
Copy-Item $backup $config -Force
```

## 📞 Sonraki Adımlar

1. **BIOS Virtualization'i etkinleştirin** (en iyi çözüm)
2. Veya **software rendering ile emülatörü deneyin** (zaten yapıldı)
3. Veya **Expo Go kullanın** (en kolay)

Herhangi bir sorun olursa, log dosyalarını kontrol edin:
```powershell
Get-Content "$env:USERPROFILE\.android\avd\Medium_Phone.avd\hardware-qemu.log" -Tail 50
```

