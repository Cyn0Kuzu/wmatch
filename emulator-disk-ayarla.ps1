# Android Emulator Disk Boyutu Ayarlama Scripti

param(
    [int]$DataPartitionGB = 6,
    [int]$SDCardMB = 512,
    [string]$AVDName = "Medium_Phone"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Emulator Disk Boyutu Ayarlama" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$avdConfig = "$env:USERPROFILE\.android\avd\$AVDName.avd\config.ini"
$avdPath = "$env:USERPROFILE\.android\avd\$AVDName.avd"

# AVD var mi kontrol et
if (-not (Test-Path $avdConfig)) {
    Write-Host "[HATA] AVD bulunamadi: $AVDName" -ForegroundColor Red
    Write-Host "Mevcut AVD'ler:" -ForegroundColor Yellow
    $emulatorExe = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
    if (Test-Path $emulatorExe) {
        & $emulatorExe -list-avds
    }
    exit 1
}

Write-Host "AVD: $AVDName" -ForegroundColor Green
Write-Host ""

# Mevcut ayarlari goster
Write-Host "=== Mevcut Ayarlar ===" -ForegroundColor Yellow
$currentConfig = Get-Content $avdConfig -Raw
if ($currentConfig -match "disk\.dataPartition\.size\s*=\s*(\d+)G") {
    $currentData = $matches[1]
    Write-Host "  Data Partition: $currentData GB" -ForegroundColor White
} else {
    Write-Host "  Data Partition: (ayarlanmamis)" -ForegroundColor Gray
}

if ($currentConfig -match "sdcard\.size\s*=\s*(\d+)M") {
    $currentSD = $matches[1]
    Write-Host "  SD Card: $currentSD MB" -ForegroundColor White
} else {
    Write-Host "  SD Card: (ayarlanmamis)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Yeni Ayarlar ===" -ForegroundColor Yellow
Write-Host "  Data Partition: $DataPartitionGB GB" -ForegroundColor Green
Write-Host "  SD Card: $SDCardMB MB" -ForegroundColor Green
Write-Host ""

# Onay al
$confirm = Read-Host "Devam etmek istiyor musunuz? (E/H)"
if ($confirm -ne "E" -and $confirm -ne "e") {
    Write-Host "Iptal edildi." -ForegroundColor Yellow
    exit 0
}

# Backup olustur
$backupPath = "$avdConfig.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $avdConfig $backupPath -Force
Write-Host "[OK] Backup olusturuldu: $backupPath" -ForegroundColor Green

# Config dosyasini oku
$configContent = Get-Content $avdConfig -Raw

# Data partition boyutunu guncelle
if ($configContent -match "disk\.dataPartition\.size\s*=\s*\d+G") {
    $configContent = $configContent -replace "disk\.dataPartition\.size\s*=\s*\d+G", "disk.dataPartition.size=$DataPartitionGB`G"
    Write-Host "[OK] Data partition boyutu guncellendi" -ForegroundColor Green
} else {
    # Eger yoksa ekle
    $configContent += "`ndisk.dataPartition.size=$DataPartitionGB`G`n"
    Write-Host "[OK] Data partition boyutu eklendi" -ForegroundColor Green
}

# SD Card boyutunu guncelle
if ($configContent -match "sdcard\.size\s*=\s*\d+M") {
    $configContent = $configContent -replace "sdcard\.size\s*=\s*\d+M", "sdcard.size=$SDCardMB`M"
    Write-Host "[OK] SD Card boyutu guncellendi" -ForegroundColor Green
} else {
    # Eger yoksa ekle
    $configContent += "`nsdcard.size=$SDCardMB`M`n"
    Write-Host "[OK] SD Card boyutu eklendi" -ForegroundColor Green
}

# Dosyayi kaydet
Set-Content -Path $avdConfig -Value $configContent -NoNewline
Write-Host "[OK] Config dosyasi guncellendi" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ONEMLI NOTLAR" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Degisikliklerin etkili olmasi icin:" -ForegroundColor White
Write-Host "   - Emulatoru kapatin (calisiyorsa)" -ForegroundColor White
Write-Host "   - AVD'yi silip yeniden olusturun VEYA" -ForegroundColor White
Write-Host "   - Emulatoru -wipe-data ile baslatin" -ForegroundColor White
Write-Host ""
Write-Host "2. Mevcut veriler silinebilir!" -ForegroundColor Red
Write-Host ""
Write-Host "3. Yeni ayarlarla emulatoru baslatmak icin:" -ForegroundColor White
Write-Host "   & `"$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe`" -avd $AVDName -wipe-data" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Veya Android Studio'da:" -ForegroundColor White
Write-Host "   Tools > Device Manager > $AVDName > Wipe Data" -ForegroundColor White
Write-Host ""

