# Android Emulator Otomatik Duzeltme Scripti
# Bu script tum kontrolleri yapar ve gerekli duzeltmeleri uygular

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Emulator Otomatik Duzeltme" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Yonetici yetkisi kontrolu
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[UYARI] Bu script yonetici yetkisi gerektiriyor!" -ForegroundColor Yellow
    Write-Host "PowerShell'i yonetici olarak acip tekrar calistirin." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Devam etmek icin Enter'a basin (sadece kontroller yapilacak)..." -ForegroundColor Yellow
    Read-Host
}

# 1. Android SDK yolunu bul
Write-Host "[1/6] Android SDK kontrol ediliyor..." -ForegroundColor Cyan
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
    Write-Host "Lutfen Android Studio'yu yukleyin." -ForegroundColor Yellow
    exit 1
}

$emulatorExe = Join-Path $sdkPath "emulator\emulator.exe"
$adbExe = Join-Path $sdkPath "platform-tools\adb.exe"

# 2. Hypervisor Platform kontrolu ve etkinlestirme
Write-Host ""
Write-Host "[2/6] Hypervisor Platform kontrol ediliyor..." -ForegroundColor Cyan

if ($isAdmin) {
    try {
        $hypervisor = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue
        
        if ($hypervisor -and $hypervisor.State -eq "Enabled") {
            Write-Host "[OK] Hypervisor Platform zaten etkin" -ForegroundColor Green
        } else {
            Write-Host "[DUZELTME] Hypervisor Platform etkinlestiriliyor..." -ForegroundColor Yellow
            try {
                Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All -NoRestart
                Write-Host "[OK] Hypervisor Platform etkinlestirildi!" -ForegroundColor Green
                Write-Host "[UYARI] Degisikliklerin etkili olmasi icin bilgisayari yeniden baslatmaniz gerekiyor." -ForegroundColor Yellow
                $restartNeeded = $true
            } catch {
                Write-Host "[HATA] Hypervisor Platform etkinlestirilemedi: $_" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "[HATA] Hypervisor Platform kontrol edilemedi: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[UYARI] Yonetici yetkisi olmadan kontrol edilemedi" -ForegroundColor Yellow
    Write-Host "Manuel olarak etkinlestirmek icin:" -ForegroundColor Yellow
    Write-Host "  Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All" -ForegroundColor White
}

# 3. AVD listesi kontrolu
Write-Host ""
Write-Host "[3/6] AVD'ler kontrol ediliyor..." -ForegroundColor Cyan
if (Test-Path $emulatorExe) {
    $avds = & $emulatorExe -list-avds 2>&1
    if ($avds) {
        Write-Host "[OK] Bulunan AVD'ler:" -ForegroundColor Green
        $avds | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        
        # Medium_Phone kontrolu
        if ($avds -contains "Medium_Phone") {
            Write-Host "[OK] Medium_Phone AVD bulundu" -ForegroundColor Green
        } else {
            Write-Host "[UYARI] Medium_Phone AVD bulunamadi" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[UYARI] AVD bulunamadi" -ForegroundColor Yellow
    }
} else {
    Write-Host "[HATA] Emulator bulunamadi!" -ForegroundColor Red
}

# 4. Calisan emulatorler kontrolu
Write-Host ""
Write-Host "[4/6] Calisan emulatorler kontrol ediliyor..." -ForegroundColor Cyan
if (Test-Path $adbExe) {
    $devices = & $adbExe devices 2>&1
    $deviceCount = ($devices | Where-Object { $_ -match "device$" }).Count
    if ($deviceCount -gt 0) {
        Write-Host "[OK] $deviceCount cihaz bagli" -ForegroundColor Green
        $devices | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    } else {
        Write-Host "[BILGI] Bagli cihaz yok" -ForegroundColor Yellow
    }
} else {
    Write-Host "[HATA] ADB bulunamadi!" -ForegroundColor Red
}

# 5. Disk alani kontrolu
Write-Host ""
Write-Host "[5/6] Disk alani kontrol ediliyor..." -ForegroundColor Cyan
$drive = Get-PSDrive C -ErrorAction SilentlyContinue
if ($drive) {
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    Write-Host "C: surucusunde bos alan: $freeSpaceGB GB" -ForegroundColor $(if ($freeSpaceGB -gt 10) { "Green" } else { "Red" })
    if ($freeSpaceGB -lt 10) {
        Write-Host "[UYARI] Emulator icin en az 10 GB bos alan onerilir!" -ForegroundColor Yellow
    }
}

# 6. Emulator ayarlari kontrolu ve duzeltme onerileri
Write-Host ""
Write-Host "[6/6] Emulator ayarlari kontrol ediliyor..." -ForegroundColor Cyan

# AVD config dosyasini kontrol et
$avdPath = "$env:USERPROFILE\.android\avd\Medium_Phone.avd"
if (Test-Path $avdPath) {
    $configFile = Join-Path $avdPath "config.ini"
    if (Test-Path $configFile) {
        Write-Host "[OK] AVD config dosyasi bulundu" -ForegroundColor Green
        
        # RAM ayarlarini kontrol et
        $configContent = Get-Content $configFile -Raw
        if ($configContent -match "hw\.ramSize\s*=\s*(\d+)") {
            $ramSize = [int]$matches[1]
            Write-Host "  RAM: $ramSize MB" -ForegroundColor White
            
            if ($ramSize -gt 2048) {
                Write-Host "[ONERI] RAM 2048 MB veya daha dusuk olmali" -ForegroundColor Yellow
                Write-Host "  Android Studio'da AVD Manager > Edit > Show Advanced Settings > RAM: 2048 MB" -ForegroundColor White
            }
        }
    }
} else {
    Write-Host "[BILGI] AVD config dosyasi bulunamadi" -ForegroundColor Yellow
}

# Ozet ve oneriler
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OZET VE ONERILER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($restartNeeded) {
    Write-Host "[ONEMLI] Bilgisayari yeniden baslatin!" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Yapilacaklar:" -ForegroundColor Yellow
Write-Host "1. Eger Hypervisor Platform etkinlestirildiyse, bilgisayari yeniden baslatin" -ForegroundColor White
Write-Host "2. Android Studio'yu acin" -ForegroundColor White
Write-Host "3. Tools > Device Manager > Medium_Phone > Edit" -ForegroundColor White
Write-Host "4. Show Advanced Settings > RAM: 2048 MB yapin" -ForegroundColor White
Write-Host "5. Emulatoru tekrar calistirin" -ForegroundColor White
Write-Host ""

Write-Host "Alternatif (Emulator olmadan):" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor White
Write-Host "  Telefonunuzda Expo Go ile QR kodu tarayin" -ForegroundColor White
Write-Host ""

Write-Host "Detayli bilgi icin:" -ForegroundColor Yellow
Write-Host "  - EMULATOR_HATA_COZUMU.md" -ForegroundColor White
Write-Host "  - HYPERVISOR_ETKINLESTIRME.md" -ForegroundColor White
Write-Host ""

if ($restartNeeded) {
    $restart = Read-Host "Bilgisayari simdi yeniden baslatmak ister misiniz? (E/H)"
    if ($restart -eq "E" -or $restart -eq "e") {
        Write-Host "Bilgisayar yeniden baslatiliyor..." -ForegroundColor Yellow
        Restart-Computer -Force
    }
}

