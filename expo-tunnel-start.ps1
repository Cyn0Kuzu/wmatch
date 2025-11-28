# Expo Tunnel Modunda Baslatma
# Telefon baglanti sorunlari icin

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Expo Tunnel Modunda Baslatiliyor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tunnel modu, telefon ve bilgisayarin farkli aglarda olsa bile calisir." -ForegroundColor Yellow
Write-Host ""

# Calisan Expo process'lerini kapat
Write-Host "Calisan Expo process'leri kontrol ediliyor..." -ForegroundColor Cyan
$expoProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.MainWindowTitle -like "*expo*" } -ErrorAction SilentlyContinue
if ($expoProcesses) {
    Write-Host "Calisan Expo process'leri kapatiliyor..." -ForegroundColor Yellow
    $expoProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Tunnel modunda baslat
Write-Host "Expo tunnel modunda baslatiliyor..." -ForegroundColor Green
Write-Host "Bu biraz zaman alabilir (tunnel kurulumu)...`n" -ForegroundColor Yellow

npx expo start --tunnel --clear


