# Android Emulator Disk Boyutu Ayarlama Rehberi

## 📊 Mevcut Disk Ayarları

**Medium_Phone AVD:**
- Data Partition: **6 GB**
- SD Card: **512 MB**
- Toplam kullanım: ~0.5 GB

## 🔧 Disk Boyutunu Değiştirme Yöntemleri

### Yöntem 1: Otomatik Script (Önerilen)

**Kullanım:**
```powershell
# Varsayılan ayarlarla (6GB data, 512MB SD card)
.\emulator-disk-ayarla.ps1

# Özel ayarlarla
.\emulator-disk-ayarla.ps1 -DataPartitionGB 8 -SDCardMB 1024

# Farklı AVD için
.\emulator-disk-ayarla.ps1 -AVDName "Pixel_3_API_30" -DataPartitionGB 4 -SDCardMB 256
```

**Parametreler:**
- `-DataPartitionGB`: Data partition boyutu (GB cinsinden, örn: 4, 6, 8)
- `-SDCardMB`: SD Card boyutu (MB cinsinden, örn: 256, 512, 1024)
- `-AVDName`: AVD adı (varsayılan: Medium_Phone)

### Yöntem 2: Manuel Config Düzenleme

**Adımlar:**

1. **Config dosyasını açın:**
   ```
   C:\Users\[KullanıcıAdı]\.android\avd\Medium_Phone.avd\config.ini
   ```

2. **Disk ayarlarını bulun ve değiştirin:**
   ```ini
   # Data partition boyutu (GB)
   disk.dataPartition.size=6G
   
   # SD Card boyutu (MB)
   sdcard.size=512M
   ```

3. **Örnek değişiklikler:**
   ```ini
   # Daha küçük (4 GB data, 256 MB SD card)
   disk.dataPartition.size=4G
   sdcard.size=256M
   
   # Daha büyük (8 GB data, 1 GB SD card)
   disk.dataPartition.size=8G
   sdcard.size=1024M
   ```

4. **Dosyayı kaydedin**

### Yöntem 3: Android Studio AVD Manager

**Adımlar:**

1. Android Studio'yu açın
2. **Tools** → **Device Manager**
3. AVD'yi seçin → **Edit** (kalem ikonu)
4. **Show Advanced Settings**
5. **Memory and Storage** bölümünde:
   - **Internal Storage**: Data partition boyutu
   - **SD Card**: SD Card boyutu
6. **Finish** ile kaydedin

**Not:** Bu yöntem AVD'yi yeniden oluşturur, mevcut veriler silinir.

### Yöntem 4: Yeni AVD Oluştururken

**Android Studio'da:**

1. **Tools** → **Device Manager** → **Create Device**
2. Cihaz seçin
3. System Image seçin
4. **Show Advanced Settings**
5. **Memory and Storage:**
   - **Internal Storage**: İstediğiniz boyut (örn: 4GB, 6GB, 8GB)
   - **SD Card**: İstediğiniz boyut (örn: 256MB, 512MB, 1GB)
6. **Finish**

## ⚠️ Önemli Notlar

### Değişikliklerin Etkili Olması

Config dosyasını değiştirdikten sonra:

1. **Emülatörü kapatın** (çalışıyorsa)
2. **Wipe Data yapın:**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
   ```
   
   VEYA Android Studio'da:
   - Device Manager → AVD → **Wipe Data**

### Veri Kaybı

- Disk boyutunu **küçültürseniz**, mevcut veriler silinebilir
- Disk boyutunu **büyütürseniz**, genellikle sorun olmaz
- Her durumda **backup** alın

### Önerilen Boyutlar

| Kullanım | Data Partition | SD Card | Toplam |
|----------|---------------|---------|--------|
| Minimal | 4 GB | 256 MB | ~4.3 GB |
| Normal | 6 GB | 512 MB | ~6.5 GB |
| Büyük | 8 GB | 1 GB | ~9 GB |
| Çok Büyük | 10 GB | 2 GB | ~12 GB |

## 🔍 Disk Kullanımını Kontrol Etme

**Mevcut kullanımı görmek için:**
```powershell
$avdPath = "$env:USERPROFILE\.android\avd\Medium_Phone.avd"
$totalSize = (Get-ChildItem $avdPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "Toplam kullanim: $totalSizeGB GB"
```

**En büyük dosyaları görmek için:**
```powershell
Get-ChildItem $avdPath -Recurse | Where-Object { -not $_.PSIsContainer } | Sort-Object Length -Descending | Select-Object -First 10 Name, @{Name="Size(GB)";Expression={[math]::Round($_.Length/1GB,2)}}
```

## 🗑️ Disk Alanını Temizleme

### 1. AVD'yi Silme

**Android Studio:**
- Device Manager → AVD → **Delete**

**Komut satırı:**
```powershell
# AVD listesi
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# AVD klasörünü sil
Remove-Item "$env:USERPROFILE\.android\avd\Medium_Phone.avd" -Recurse -Force
```

### 2. Snapshot'ları Silme

Snapshot'lar çok yer kaplayabilir:
```powershell
$snapshots = "$env:USERPROFILE\.android\avd\Medium_Phone.avd\snapshots"
if (Test-Path $snapshots) {
    Remove-Item $snapshots -Recurse -Force
    Write-Host "Snapshot'lar silindi"
}
```

### 3. Cache Temizleme

```powershell
# Emulator cache
Remove-Item "$env:LOCALAPPDATA\Android\Sdk\emulator\cache" -Recurse -Force -ErrorAction SilentlyContinue

# AVD cache
Get-ChildItem "$env:USERPROFILE\.android\avd" -Recurse -Filter "*.img" | Where-Object { $_.Name -like "*cache*" } | Remove-Item -Force
```

## 📝 Örnek Senaryolar

### Senaryo 1: Disk Alanı Azaltma

**Sorun:** Emülatör çok yer kaplıyor

**Çözüm:**
```powershell
# Data partition'ı 4GB'a düşür
.\emulator-disk-ayarla.ps1 -DataPartitionGB 4 -SDCardMB 256

# Emülatörü wipe data ile başlat
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

### Senaryo 2: Daha Fazla Alan İhtiyacı

**Sorun:** Uygulama yüklerken "disk dolu" hatası

**Çözüm:**
```powershell
# Data partition'ı 8GB'a çıkar
.\emulator-disk-ayarla.ps1 -DataPartitionGB 8 -SDCardMB 1024

# Emülatörü wipe data ile başlat
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone -wipe-data
```

### Senaryo 3: Yeni AVD Oluşturma

**Android Studio:**
1. Device Manager → Create Device
2. Pixel 3 seçin
3. API 30 seçin
4. Advanced Settings:
   - Internal Storage: 4 GB
   - SD Card: 256 MB
5. Finish

## 🔄 Geri Alma

Config değişikliklerini geri almak için:

```powershell
# Backup dosyasını bul
$backup = Get-ChildItem "$env:USERPROFILE\.android\avd\Medium_Phone.avd\config.ini.backup*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($backup) {
    Copy-Item $backup.FullName "$env:USERPROFILE\.android\avd\Medium_Phone.avd\config.ini" -Force
    Write-Host "Config geri yuklendi: $($backup.Name)"
}
```

## 💡 İpuçları

1. **Disk boyutunu küçültmeden önce** önemli verileri yedekleyin
2. **Snapshot'ları düzenli silin** (çok yer kaplar)
3. **Kullanılmayan AVD'leri silin**
4. **SD Card boyutunu** ihtiyacınıza göre ayarlayın (genellikle 256-512 MB yeterli)
5. **Data partition** için 4-6 GB genellikle yeterlidir

## 📊 Disk Boyutu Hesaplama

**Toplam disk kullanımı:**
- Data Partition: X GB
- SD Card: Y MB
- System Image: ~2-3 GB (değişken)
- **Toplam:** ~(X + Y/1024 + 2-3) GB

**Örnek:**
- Data: 6 GB
- SD Card: 512 MB (0.5 GB)
- System: ~2.5 GB
- **Toplam:** ~9 GB

