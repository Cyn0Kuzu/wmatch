# Detayli Emulator Cozum Scripti
# BIOS Virtualization sorunu ve alternatif cozumler

Write-Host "========================================" -ForegroundColor Red
Write-Host "ONEMLI BULGU: BIOS Virtualization KAPALI!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Write-Host "SORUN: CPU Virtualization: False" -ForegroundColor Yellow
Write-Host "Bu, BIOS'ta sanallastirmanin kapali oldugunu gosterir." -ForegroundColor Yellow
Write-Host ""

# 1. BIOS ayarlari talimati
Write-Host "=== COZUM 1: BIOS AYARLARI ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Bilgisayari yeniden baslatin" -ForegroundColor White
Write-Host "2. BIOS'a girin (genellikle F2, F10, F12 veya Del tusu)" -ForegroundColor White
Write-Host "3. Su ayarlari bulun ve ETKINLESTIRIN:" -ForegroundColor White
Write-Host "   - Intel: 'Intel Virtualization Technology (VT-x)' veya 'Intel VT-x'" -ForegroundColor Cyan
Write-Host "   - AMD: 'AMD-V' veya 'SVM Mode'" -ForegroundColor Cyan
Write-Host "4. Ayarlari kaydedin ve cikin (F10)" -ForegroundColor White
Write-Host "5. Bilgisayar yeniden basladiktan sonra emulatoru tekrar deneyin" -ForegroundColor White
Write-Host ""

# 2. Alternatif: Software rendering
Write-Host "=== COZUM 2: SOFTWARE RENDERING (BIOS olmadan) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "BIOS'u degistiremiyorsaniz, software rendering kullanin:" -ForegroundColor Yellow
Write-Host ""

$avdConfig = "$env:USERPROFILE\.android\avd\Medium_Phone.avd\config.ini"
if (Test-Path $avdConfig) {
    Write-Host "AVD config dosyasi duzenleniyor..." -ForegroundColor Yellow
    
    $content = Get-Content $avdConfig -Raw
    $backupPath = "$avdConfig.backup"
    
    # Backup olustur
    Copy-Item $avdConfig $backupPath -Force
    Write-Host "  [OK] Backup olusturuldu: $backupPath" -ForegroundColor Green
    
    # GPU mode'u software'e degistir
    if ($content -match "hw\.gpu\.mode\s*=\s*.*") {
        $content = $content -replace "hw\.gpu\.mode\s*=\s*.*", "hw.gpu.mode = swiftshader_indirect"
        Write-Host "  [OK] GPU mode swiftshader_indirect olarak degistirildi" -ForegroundColor Green
    } else {
        $content += "`nhw.gpu.mode = swiftshader_indirect`n"
        Write-Host "  [OK] GPU mode eklendi" -ForegroundColor Green
    }
    
    # RAM'i biraz dusur
    if ($content -match "hw\.ramSize\s*=\s*(\d+)") {
        $currentRam = [int]$matches[1]
        if ($currentRam -gt 1536) {
            $content = $content -replace "hw\.ramSize\s*=\s*\d+", "hw.ramSize = 1536"
            Write-Host "  [OK] RAM 1536 MB'a dusuruldu (daha stabil)" -ForegroundColor Green
        }
    }
    
    # Dosyayi kaydet
    Set-Content -Path $avdConfig -Value $content -NoNewline
    Write-Host "  [OK] Config dosyasi guncellendi" -ForegroundColor Green
    Write-Host ""
    Write-Host "Emulatoru tekrar deneyin:" -ForegroundColor Yellow
    Write-Host "  & `"$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe`" -avd Medium_Phone" -ForegroundColor Cyan
} else {
    Write-Host "[HATA] AVD config bulunamadi" -ForegroundColor Red
}

Write-Host ""

# 3. Alternatif: Yeni AVD olusturma
Write-Host "=== COZUM 3: YENI AVD OLUSTURMA ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Daha dusuk sistem gereksinimleri olan yeni bir AVD olusturun:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Android Studio'da:" -ForegroundColor White
Write-Host "1. Tools > Device Manager" -ForegroundColor White
Write-Host "2. Create Device" -ForegroundColor White
Write-Host "3. Pixel 3 veya Pixel 2 secin (daha az RAM kullanir)" -ForegroundColor White
Write-Host "4. System Image: API 30 veya daha dusuk secin" -ForegroundColor White
Write-Host "5. Show Advanced Settings:" -ForegroundColor White
Write-Host "   - RAM: 1536 MB" -ForegroundColor Cyan
Write-Host "   - VM heap: 256 MB" -ForegroundColor Cyan
Write-Host "   - Graphics: Software - GLES 2.0" -ForegroundColor Cyan
Write-Host ""

# 4. Expo Go alternatifi
Write-Host "=== COZUM 4: EXPO GO (EN KOLAY) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Emulator sorunlari devam ederse, fiziksel cihaz kullanin:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Telefonunuzda Expo Go uygulamasini yukleyin" -ForegroundColor White
Write-Host "2. Projeyi baslatin:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host "3. Telefonda Expo Go'yu acin ve QR kodu tarayin" -ForegroundColor White
Write-Host ""

# 5. Emulator parametreleri
Write-Host "=== COZUM 5: OZEL EMULATOR PARAMETRELERI ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Emulatoru ozel parametrelerle baslatin:" -ForegroundColor Yellow
Write-Host ""
$emulatorExe = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
if (Test-Path $emulatorExe) {
    Write-Host "Komut:" -ForegroundColor White
    Write-Host "& `"$emulatorExe`" -avd Medium_Phone -gpu swiftshader_indirect -no-snapshot-load -wipe-data" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Parametreler:" -ForegroundColor White
    Write-Host "  -gpu swiftshader_indirect : Software rendering" -ForegroundColor Gray
    Write-Host "  -no-snapshot-load : Snapshot yukleme" -ForegroundColor Gray
    Write-Host "  -wipe-data : Temiz baslangic (dikkatli kullanin!)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ONERILEN SIRA:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. BIOS'ta Virtualization'i etkinlestir (EN IYI COZUM)" -ForegroundColor Green
Write-Host "2. Software rendering kullan (YUKARIDA YAPILDI)" -ForegroundColor Yellow
Write-Host "3. Expo Go ile fiziksel cihaz kullan" -ForegroundColor Yellow
Write-Host "4. Yeni, daha hafif AVD olustur" -ForegroundColor Yellow
Write-Host ""

