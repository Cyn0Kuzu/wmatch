# Android Emulator Disk Boyutu - MINIMUM AYARLAR
# 89 MB bos alan icin optimize edilmis

param(
    [string]$AVDName = "Medium_Phone"
)

Write-Host "========================================" -ForegroundColor Red
Write-Host "EMULATOR DISK BOYUTU - MINIMUM AYARLAR" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "[UYARI] Cok az bos alan var (89 MB)" -ForegroundColor Yellow
Write-Host "Disk boyutlari minimuma indirilecek!" -ForegroundColor Yellow
Write-Host ""

$avdConfig = "$env:USERPROFILE\.android\avd\$AVDName.avd\config.ini"
$avdPath = "$env:USERPROFILE\.android\avd\$AVDName.avd"

# AVD var mi kontrol et
if (-not (Test-Path $avdConfig)) {
    Write-Host "[HATA] AVD bulunamadi: $AVDName" -ForegroundColor Red
    exit 1
}

# Minimum ayarlar (cok az bos alan icin)
$minDataPartition = 2  # GB - minimum
$minSDCard = 128       # MB - minimum

Write-Host "=== Yeni Minimum Ayarlar ===" -ForegroundColor Yellow
Write-Host "  Data Partition: $minDataPartition GB (minimum)" -ForegroundColor Green
Write-Host "  SD Card: $minSDCard MB (minimum)" -ForegroundColor Green
Write-Host "  Toplam: ~$($minDataPartition + 0.1) GB" -ForegroundColor Green
Write-Host ""

# Onay al
Write-Host "[UYARI] Bu islem mevcut emulator verilerini SILECEK!" -ForegroundColor Red
$confirm = Read-Host "Devam etmek istiyor musunuz? (E/H)"
if ($confirm -ne "E" -and $confirm -ne "e") {
    Write-Host "Iptal edildi." -ForegroundColor Yellow
    exit 0
}

# Emulator calisiyorsa kapat
Write-Host "`nEmulator kontrol ediliyor..." -ForegroundColor Cyan
$emulatorProcesses = Get-Process | Where-Object { $_.ProcessName -match "emulator|qemu" } -ErrorAction SilentlyContinue
if ($emulatorProcesses) {
    Write-Host "[UYARI] Calisan emulator bulundu, kapatiliyor..." -ForegroundColor Yellow
    $emulatorProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Backup olustur
$backupPath = "$avdConfig.backup-minimum-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $avdConfig) {
    Copy-Item $avdConfig $backupPath -Force
    Write-Host "[OK] Backup olusturuldu: $backupPath" -ForegroundColor Green
}

# Config dosyasini oku
$configContent = Get-Content $avdConfig -Raw

# Data partition boyutunu minimuma indir
if ($configContent -match "disk\.dataPartition\.size\s*=\s*\d+G") {
    $configContent = $configContent -replace "disk\.dataPartition\.size\s*=\s*\d+G", "disk.dataPartition.size=$minDataPartition`G"
    Write-Host "[OK] Data partition $minDataPartition GB'a dusuruldu" -ForegroundColor Green
} else {
    $configContent += "`ndisk.dataPartition.size=$minDataPartition`G`n"
    Write-Host "[OK] Data partition $minDataPartition GB olarak eklendi" -ForegroundColor Green
}

# SD Card boyutunu minimuma indir
if ($configContent -match "sdcard\.size\s*=\s*\d+M") {
    $configContent = $configContent -replace "sdcard\.size\s*=\s*\d+M", "sdcard.size=$minSDCard`M"
    Write-Host "[OK] SD Card $minSDCard MB'a dusuruldu" -ForegroundColor Green
} else {
    $configContent += "`nsdcard.size=$minSDCard`M`n"
    Write-Host "[OK] SD Card $minSDCard MB olarak eklendi" -ForegroundColor Green
}

# Dosyayi kaydet
Set-Content -Path $avdConfig -Value $configContent -NoNewline
Write-Host "[OK] Config dosyasi guncellendi" -ForegroundColor Green

# Eski snapshot'lari sil (yer acmak icin)
Write-Host "`nEski snapshot'lar temizleniyor..." -ForegroundColor Cyan
$snapshotsPath = Join-Path $avdPath "snapshots"
if (Test-Path $snapshotsPath) {
    $snapshotSize = (Get-ChildItem $snapshotsPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $snapshotSizeMB = [math]::Round($snapshotSize / 1MB, 2)
    Remove-Item $snapshotsPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] $snapshotSizeMB MB snapshot silindi" -ForegroundColor Green
}

# Eski cache dosyalarini temizle
Write-Host "Cache dosyalari temizleniyor..." -ForegroundColor Cyan
Get-ChildItem $avdPath -Recurse -Filter "*.img" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*cache*" } | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Cache temizlendi" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  [OK] Data partition: $minDataPartition GB" -ForegroundColor White
Write-Host "  [OK] SD Card: $minSDCard MB" -ForegroundColor White
Write-Host "  [OK] Snapshot'lar silindi" -ForegroundColor White
Write-Host "  [OK] Cache temizlendi" -ForegroundColor White
Write-Host ""
Write-Host "SONRAKI ADIMLAR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Emulatoru WIPE DATA ile baslatin:" -ForegroundColor White
Write-Host "   & `"$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe`" -avd $AVDName -wipe-data" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. VEYA Android Studio'da:" -ForegroundColor White
Write-Host "   Tools > Device Manager > $AVDName > Wipe Data" -ForegroundColor White
Write-Host ""
Write-Host "[UYARI] Wipe Data yapmadan emulator calismayabilir!" -ForegroundColor Red
Write-Host ""


