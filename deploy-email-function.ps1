# Firebase Functions Email Deploy Script
# Bu script Firebase Functions'ı deploy eder ve email gönderimini aktif eder

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Functions Email Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Gmail App Password kontrolü
Write-Host "1. Gmail App Password oluşturuldu mu?" -ForegroundColor Yellow
Write-Host "   - Google Account → Security → 2-Step Verification (açık olmalı)" -ForegroundColor Gray
Write-Host "   - App Passwords → Generate" -ForegroundColor Gray
Write-Host "   - 'Mail' ve 'Other (Custom name)' seç" -ForegroundColor Gray
Write-Host "   - Oluşturulan şifreyi kopyala" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Gmail App Password hazır mı? (y/n)"

if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Lütfen önce Gmail App Password oluşturun." -ForegroundColor Red
    exit 1
}

# 2. Email bilgilerini al
Write-Host ""
Write-Host "2. Email bilgilerini girin:" -ForegroundColor Yellow
$emailUser = Read-Host "Gmail adresiniz (örn: your-email@gmail.com)"
$emailPassword = Read-Host "Gmail App Password" -AsSecureString
$emailPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($emailPassword))

# 3. Firebase Functions config ayarla
Write-Host ""
Write-Host "3. Firebase Functions config ayarlanıyor..." -ForegroundColor Yellow
$configCmd = "firebase functions:config:set email.user=`"$emailUser`" email.password=`"$emailPasswordPlain`""
Invoke-Expression $configCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Config ayarlama başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Config ayarlandı" -ForegroundColor Green

# 4. Functions paketlerini yükle
Write-Host ""
Write-Host "4. Functions paketleri yükleniyor..." -ForegroundColor Yellow
Set-Location functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Paket yükleme başarısız!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "✓ Paketler yüklendi" -ForegroundColor Green

# 5. Functions'ı deploy et
Write-Host ""
Write-Host "5. Firebase Functions deploy ediliyor..." -ForegroundColor Yellow
firebase deploy --only functions:sendReportEmail

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Firebase Functions başarıyla deploy edildi!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Artık bildirim gönderildiğinde otomatik olarak" -ForegroundColor Cyan
Write-Host "memodee333@gmail.com adresine email gönderilecek." -ForegroundColor Cyan
Write-Host ""



