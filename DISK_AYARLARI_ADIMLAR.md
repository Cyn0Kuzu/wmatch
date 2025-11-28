# Disk Ayarları - Adım Adım Rehber

## 🎯 Durum: 89 MB Boş Alan

Disk boyutlarını minimuma indirmek için aşağıdaki adımları izleyin.

## 📋 ADIMLAR

### ADIM 1: Mevcut AVD'yi Kontrol Et

**PowerShell'de:**
```powershell
# AVD listesi
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# Veya klasörden kontrol
Get-ChildItem "$env:USERPROFILE\.android\avd" -Directory
```

**Eğer AVD yoksa:** Android Studio'da yeni AVD oluşturun (ADIM 2)

**Eğer AVD varsa:** ADIM 3'e geçin

---

### ADIM 2: Yeni AVD Oluşturma (Minimum Ayarlarla)

**Android Studio'da:**

1. **Tools** → **Device Manager**
2. **Create Device** butonuna tıklayın
3. **Cihaz seçin:** Pixel 3 veya Pixel 2 (daha az RAM kullanır)
4. **System Image seçin:** API 30 veya daha düşük
5. **Show Advanced Settings** tıklayın
6. **Memory and Storage:**
   - **Internal Storage:** `2 GB` (minimum)
   - **SD Card:** `128 MB` (minimum)
   - **RAM:** `1536 MB` (opsiyonel, daha az yer kaplar)
7. **Graphics:** `Software - GLES 2.0` (BIOS virtualization olmadan çalışır)
8. **Finish** ile kaydedin

**AVD adı:** `Medium_Phone` veya istediğiniz bir isim

---

### ADIM 3: Mevcut AVD Disk Ayarlarını Değiştirme

#### Yöntem A: Otomatik Script (Önerilen)

```powershell
# Minimum ayarlar için
.\emulator-disk-minimum.ps1

# Veya özel ayarlarla
.\emulator-disk-ayarla.ps1 -DataPartitionGB 2 -SDCardMB 128
```

#### Yöntem B: Manuel Config Düzenleme

1. **Config dosyasını açın:**
   ```
   C:\Users\cayan\.android\avd\Medium_Phone.avd\config.ini
   ```

2. **Disk ayarlarını bulun ve değiştirin:**
   ```ini
   # ÖNCE (mevcut)
   disk.dataPartition.size=6G
   sdcard.size=512M
   
   # SONRA (minimum)
   disk.dataPartition.size=2G
   sdcard.size=128M
   ```

3. **Dosyayı kaydedin**

#### Yöntem C: Android Studio'dan

1. **Tools** → **Device Manager**
2. AVD'yi seçin → **Edit** (kalem ikonu)
3. **Show Advanced Settings**
4. **Memory and Storage:**
   - Internal Storage: `2 GB`
   - SD Card: `128 MB`
5. **Finish**

---

### ADIM 4: Snapshot'ları ve Cache'i Temizle

**PowerShell'de:**
```powershell
$avdPath = "$env:USERPROFILE\.android\avd\Medium_Phone.avd"

# Snapshot'ları sil
$snapshots = Join-Path $avdPath "snapshots"
if (Test-Path $snapshots) {
    $size = (Get-ChildItem $snapshots -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 2)
    Remove-Item $snapshots -Recurse -Force
    Write-Host "$sizeMB MB snapshot silindi"
}

# Cache temizle
Get-ChildItem $avdPath -Recurse -Filter "*.img" | 
    Where-Object { $_.Name -like "*cache*" } | 
    Remove-Item -Force
```

---

### ADIM 5: Emülatörü Wipe Data ile Başlat

**ÖNEMLİ:** Disk boyutunu değiştirdikten sonra MUTLAKA wipe data yapın!

**PowerShell'de:**
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

**VEYA Android Studio'da:**
1. **Tools** → **Device Manager**
2. AVD'yi seçin
3. **Wipe Data** butonuna tıklayın
4. Emülatörü başlatın

---

## ⚡ Hızlı Komutlar (Tek Seferde)

### Tüm İşlemleri Otomatik Yap:

```powershell
# 1. Minimum disk ayarları
.\emulator-disk-minimum.ps1

# 2. Emülatörü başlat (wipe data ile)
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

---

## 📊 Minimum Ayarlar Özeti

| Ayar | Önce | Sonra | Kazanç |
|------|------|-------|--------|
| Data Partition | 6 GB | 2 GB | 4 GB |
| SD Card | 512 MB | 128 MB | 384 MB |
| **Toplam** | **~6.5 GB** | **~2.1 GB** | **~4.4 GB** |

---

## ⚠️ Önemli Notlar

1. **Wipe Data Zorunlu:** Disk boyutunu değiştirdikten sonra mutlaka wipe data yapın
2. **Veri Kaybı:** Wipe data yapınca tüm emülatör verileri silinir
3. **Backup:** Önemli verileri yedekleyin
4. **Minimum 2 GB:** Emülatör için en az 2 GB boş alan gerekir

---

## 🗑️ Ek Temizlik (Opsiyonel)

### Geçici Dosyaları Temizle:
```powershell
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### Node Modules Temizle:
```powershell
npm cache clean --force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
```

### Android SDK Cache:
```powershell
Remove-Item "$env:LOCALAPPDATA\Android\Sdk\emulator\cache" -Recurse -Force
```

---

## 🚀 Alternatif: Expo Go

Disk alanı çok azsa, emülatör yerine Expo Go kullanın:

```bash
npm start
# Telefonda Expo Go ile QR kodu tarayın
```

**Avantajlar:**
- ✅ Disk alanı gerektirmez
- ✅ Daha hızlı
- ✅ Fiziksel cihaz testi

---

## 📝 Sorun Giderme

### AVD Bulunamıyor:
- Android Studio'da yeni AVD oluşturun
- Veya mevcut AVD adını kontrol edin

### Config Dosyası Bulunamıyor:
- AVD klasörünün var olduğundan emin olun
- Android Studio'da AVD'yi yeniden oluşturun

### Wipe Data Yapamıyorum:
- Emülatörü kapatın
- Komut satırından `-wipe-data` parametresiyle başlatın

---

## ✅ Kontrol Listesi

- [ ] Mevcut AVD'yi kontrol ettim
- [ ] Disk ayarlarını minimuma indirdim (2 GB data, 128 MB SD)
- [ ] Snapshot'ları sildim
- [ ] Cache'i temizledim
- [ ] Emülatörü wipe data ile başlattım
- [ ] Emülatör çalışıyor

---

**Detaylı bilgi için:** `DISK_TEMIZLIK_REHBERI.md`


