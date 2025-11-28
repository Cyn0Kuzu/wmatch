# Disk Temizlik ve Minimum Ayarlar Rehberi

## 🚨 Durum: 89 MB Boş Alan

Bu çok az bir alan! Emülatör için minimum 2-3 GB boş alan gerekir.

## ⚡ Hızlı Çözüm: Minimum Disk Ayarları

### Adım 1: Otomatik Minimum Ayarlar

```powershell
.\emulator-disk-minimum.ps1
```

Bu script:
- ✅ Data partition'ı 2 GB'a düşürür
- ✅ SD Card'ı 128 MB'a düşürür
- ✅ Eski snapshot'ları siler
- ✅ Cache dosyalarını temizler
- ✅ Backup oluşturur

### Adım 2: Emülatörü Wipe Data ile Başlat

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

## 🗑️ Disk Temizlik Yöntemleri

### 1. AVD Snapshot'larını Silme

Snapshot'lar çok yer kaplar:

```powershell
$snapshots = "$env:USERPROFILE\.android\avd\Medium_Phone.avd\snapshots"
if (Test-Path $snapshots) {
    $size = (Get-ChildItem $snapshots -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Host "Silinecek: $sizeMB MB"
    Remove-Item $snapshots -Recurse -Force
    Write-Host "Snapshot'lar silindi!"
}
```

### 2. Kullanılmayan AVD'leri Silme

```powershell
# Tüm AVD'leri listele
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# Kullanılmayan AVD klasörünü sil
Remove-Item "$env:USERPROFILE\.android\avd\Kullanilmayan_AVD.avd" -Recurse -Force
```

### 3. Android SDK Cache Temizleme

```powershell
# Emulator cache
$emulatorCache = "$env:LOCALAPPDATA\Android\Sdk\emulator\cache"
if (Test-Path $emulatorCache) {
    $size = (Get-ChildItem $emulatorCache -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 2)
    Remove-Item $emulatorCache -Recurse -Force
    Write-Host "$sizeMB MB emulator cache silindi"
}

# Build cache
$buildCache = "$env:LOCALAPPDATA\Android\Sdk\.cxx"
if (Test-Path $buildCache) {
    Remove-Item $buildCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Build cache silindi"
}
```

### 4. Windows Disk Temizleme

```powershell
# Geçici dosyalar
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# Windows Update dosyaları (yönetici gerekli)
# Cleanmgr /sageset:1
```

### 5. Node Modules ve Cache Temizleme

```powershell
# Proje klasöründe
npm cache clean --force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .expo -Recurse -Force -ErrorAction SilentlyContinue
```

## 📊 Disk Kullanımını Kontrol Etme

### Toplam Disk Kullanımı

```powershell
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
$usedGB = [math]::Round(($drive.Used) / 1GB, 2)
$totalGB = [math]::Round($drive.Used / 1GB, 2)

Write-Host "C: Sürücüsü:"
Write-Host "  Kullanılan: $usedGB GB"
Write-Host "  Boş: $freeGB GB"
```

### AVD Disk Kullanımı

```powershell
$avdPath = "$env:USERPROFILE\.android\avd"
$totalSize = (Get-ChildItem $avdPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "AVD Toplam: $totalSizeGB GB"
```

### En Büyük Dosyalar

```powershell
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { -not $_.PSIsContainer } | 
    Sort-Object Length -Descending | 
    Select-Object -First 10 FullName, @{Name="Size(GB)";Expression={[math]::Round($_.Length/1GB,2)}}
```

## ⚙️ Minimum Disk Ayarları

### Config Dosyası Düzenleme

Dosya: `C:\Users\cayan\.android\avd\Medium_Phone.avd\config.ini`

```ini
# Minimum ayarlar (89 MB boş alan için)
disk.dataPartition.size=2G    # Minimum 2 GB
sdcard.size=128M               # Minimum 128 MB
hw.ramSize=1536                # RAM'i de düşür (opsiyonel)
```

### Android Studio'dan

1. Tools → Device Manager
2. AVD → Edit
3. Show Advanced Settings
4. Memory and Storage:
   - Internal Storage: **2 GB** (minimum)
   - SD Card: **128 MB** (minimum)
5. Finish

## 🎯 Öncelikli Temizlik Listesi

89 MB boş alan için **SIRAYLA** şunları yapın:

### 1. ✅ AVD Snapshot'larını Sil (EN ÖNEMLİ)
```powershell
Remove-Item "$env:USERPROFILE\.android\avd\Medium_Phone.avd\snapshots" -Recurse -Force
```

### 2. ✅ Disk Boyutunu Minimuma İndir
```powershell
.\emulator-disk-minimum.ps1
```

### 3. ✅ Geçici Dosyaları Temizle
```powershell
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
```

### 4. ✅ Kullanılmayan AVD'leri Sil
```powershell
# Listele ve kullanılmayanları sil
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds
```

### 5. ✅ Android SDK Cache Temizle
```powershell
Remove-Item "$env:LOCALAPPDATA\Android\Sdk\emulator\cache" -Recurse -Force
```

### 6. ✅ Node Modules Temizle (proje klasöründe)
```powershell
npm cache clean --force
Remove-Item node_modules -Recurse -Force
```

## ⚠️ Önemli Uyarılar

1. **Wipe Data Gerekli:** Disk boyutunu değiştirdikten sonra MUTLAKA wipe data yapın
2. **Backup Alın:** Önemli verileri yedekleyin
3. **Minimum 2 GB:** Emülatör için en az 2 GB boş alan gerekir
4. **Snapshot'lar:** Çok yer kaplar, düzenli silin

## 🚀 Hızlı Başlatma

**Tek komutla tüm temizlik:**
```powershell
# Minimum ayarlar + temizlik
.\emulator-disk-minimum.ps1

# Emülatörü başlat
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

## 📝 Alternatif: Expo Go Kullan

Disk alanı çok azsa, emülatör yerine Expo Go kullanın:

```bash
npm start
# Telefonda Expo Go ile QR kodu tarayın
```

Bu yöntem:
- ✅ Disk alanı gerektirmez
- ✅ Daha hızlı
- ✅ Fiziksel cihaz testi


