# Android Emulator Sorun Giderme ve Duzeltme Scripti

Write-Host "=== Android Emulator Sorun Giderme ===" -ForegroundColor Cyan
Write-Host ""

# 1. Android SDK yolunu bul
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT"
)

$sdkPath = $null
foreach ($path in $sdkPaths) {
    if ($path -and (Test-Path $path)) {
        $emulatorPath = Join-Path $path "emulator\emulator.exe"
        if (Test-Path $emulatorPath) {
            $sdkPath = $path
            Write-Host "[OK] Android SDK bulundu: $sdkPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $sdkPath) {
    Write-Host "[HATA] Android SDK bulunamadi!" -ForegroundColor Red
    Write-Host "Lutfen Android Studio'yu yukleyin veya ANDROID_HOME ortam degiskenini ayarlayin." -ForegroundColor Yellow
    exit 1
}

$emulatorExe = Join-Path $sdkPath "emulator\emulator.exe"
$adbExe = Join-Path $sdkPath "platform-tools\adb.exe"

# 2. Hypervisor Platform kontrolu
Write-Host ""
Write-Host "=== Hypervisor Platform Kontrolu ===" -ForegroundColor Cyan
try {
    $hypervisor = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue
    if ($hypervisor -and $hypervisor.State -eq "Enabled") {
        Write-Host "[OK] Hypervisor Platform etkin" -ForegroundColor Green
    } else {
        Write-Host "[HATA] Hypervisor Platform etkin degil!" -ForegroundColor Red
        Write-Host "Etkinlestirmek icin PowerShell'i YONETICI olarak calistirin ve su komutu calistirin:" -ForegroundColor Yellow
        Write-Host "  Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All" -ForegroundColor White
        Write-Host "  Ardindan bilgisayari yeniden baslatin." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[UYARI] Hypervisor Platform kontrol edilemedi (yonetici yetkisi gerekli)" -ForegroundColor Yellow
}

# 3. AVD listesi
Write-Host ""
Write-Host "=== Mevcut AVD'ler ===" -ForegroundColor Cyan
if (Test-Path $emulatorExe) {
    & $emulatorExe -list-avds
} else {
    Write-Host "[HATA] Emulator bulunamadi!" -ForegroundColor Red
}

# 4. Calisan emulatorler
Write-Host ""
Write-Host "=== Calisan Emulatorler ===" -ForegroundColor Cyan
if (Test-Path $adbExe) {
    & $adbExe devices
} else {
    Write-Host "[HATA] ADB bulunamadi!" -ForegroundColor Red
}

# 5. Disk alani kontrolu
Write-Host ""
Write-Host "=== Disk Alani Kontrolu ===" -ForegroundColor Cyan
$drive = Get-PSDrive C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "C: surucusunde bos alan: $freeSpaceGB GB" -ForegroundColor $(if ($freeSpaceGB -gt 10) { "Green" } else { "Red" })
if ($freeSpaceGB -lt 10) {
    Write-Host "[UYARI] Emulator icin en az 10 GB bos alan onerilir!" -ForegroundColor Yellow
}

# 6. Oneriler
Write-Host ""
Write-Host "=== Oneriler ===" -ForegroundColor Cyan
Write-Host "1. Windows Hypervisor Platform'u etkinlestirin (yonetici yetkisi gerekli)" -ForegroundColor White
Write-Host "2. Android Studio'da AVD Manager'dan Medium_Phone AVD'sini silip yeniden olusturun" -ForegroundColor White
Write-Host "3. Yeni AVD olustururken RAM'i 2048 MB veya daha dusuk yapin" -ForegroundColor White
Write-Host "4. Alternatif: Expo Go kullanin (npm start)" -ForegroundColor White
Write-Host ""
Write-Host "Detayli cozumler icin EMULATOR_HATA_COZUMU.md dosyasina bakin." -ForegroundColor Yellow

