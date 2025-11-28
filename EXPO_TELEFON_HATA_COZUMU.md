# Expo Telefon Bağlantı Hatası Çözümü

## 🚨 Hata: "Failed to download remote update"

Bu hata genellikle telefon ve bilgisayar arasındaki bağlantı sorunlarından kaynaklanır.

## ⚡ Hızlı Çözümler

### Çözüm 1: Tunnel Modu (Önerilen)

Tunnel modu, telefon ve bilgisayar farklı ağlarda olsa bile çalışır.

**Komut:**
```powershell
npx expo start --tunnel --clear
```

**VEYA script ile:**
```powershell
.\expo-tunnel-start.ps1
```

**Avantajlar:**
- ✅ Farklı ağlarda çalışır
- ✅ NAT/Firewall sorunlarını aşar
- ✅ Daha stabil bağlantı

**Dezavantajlar:**
- ⚠️ İlk başlatma daha yavaş
- ⚠️ İnternet bağlantısı gerekir

### Çözüm 2: LAN Modu (Aynı Ağda)

Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.

**Komut:**
```powershell
npx expo start --lan --clear
```

**Kontrol:**
- Telefon ve bilgisayar aynı Wi-Fi'de mi?
- Firewall Expo'yu engelliyor mu?

### Çözüm 3: Localhost + USB Debugging

**Adımlar:**

1. **Telefonda USB Debugging açın:**
   - Ayarlar → Telefon Hakkında → Yapı Numarası'na 7 kez tıklayın
   - Ayarlar → Geliştirici Seçenekleri → USB Debugging

2. **USB ile bağlayın:**
   ```powershell
   # Cihaz kontrolü
   adb devices
   ```

3. **Expo'yu başlatın:**
   ```powershell
   npx expo start --localhost
   ```

4. **ADB reverse ile yönlendirin:**
   ```powershell
   adb reverse tcp:8081 tcp:8081
   ```

### Çözüm 4: Expo Go Cache Temizleme

**Telefonda:**

1. Expo Go uygulamasını açın
2. Ayarlar → Clear Cache
3. Uygulamayı kapatın ve yeniden açın
4. QR kodu tekrar tarayın

### Çözüm 5: Development Build Kullanma

Expo Go yerine development build kullanın:

```powershell
# Development build oluştur
npx expo run:android

# Veya EAS Build
npx eas build --profile development --platform android
```

## 🔍 Sorun Giderme Adımları

### Adım 1: Ağ Kontrolü

**Bilgisayarda:**
```powershell
# IP adresini kontrol et
ipconfig

# Windows Firewall kontrolü
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Expo*"}
```

**Telefonda:**
- Wi-Fi bağlı mı?
- Bilgisayarla aynı ağda mı?
- Mobil veri kapalı mı?

### Adım 2: Port Kontrolü

```powershell
# Port 8081 kullanımda mı?
netstat -ano | findstr :8081

# Kullanıyorsa, process'i kapat
# Task Manager'dan Node.js process'ini sonlandır
```

### Adım 3: Expo Go Versiyonu

- Expo Go uygulamasını güncelleyin
- Play Store'dan en son sürümü yükleyin

### Adım 4: Proje Temizleme

```powershell
# Cache temizle
npx expo start --clear

# Node modules temizle
Remove-Item node_modules -Recurse -Force
Remove-Item .expo -Recurse -Force
npm install

# Metro cache temizle
npx react-native start --reset-cache
```

## 📱 Telefon Ayarları

### Android Ayarları:

1. **Wi-Fi:**
   - Bilgisayarla aynı ağa bağlı olmalı
   - Mobil veri kapalı olmalı

2. **Güvenlik:**
   - Antivirus Expo Go'yu engelliyor mu?
   - VPN kapalı mı?

3. **Expo Go:**
   - Uygulama güncel mi?
   - Cache temizlendi mi?
   - İzinler verildi mi?

## 🌐 Ağ Modları Karşılaştırma

| Mod | Aynı Ağ | Farklı Ağ | Hız | Güvenilirlik |
|-----|---------|----------|-----|--------------|
| **LAN** | ✅ | ❌ | ⚡⚡⚡ | ⭐⭐⭐ |
| **Tunnel** | ✅ | ✅ | ⚡⚡ | ⭐⭐⭐⭐ |
| **Localhost** | ✅ | ❌ | ⚡⚡⚡ | ⭐⭐ |

## 🚀 Önerilen Çözüm Sırası

1. ✅ **Tunnel modu dene** (en kolay)
   ```powershell
   npx expo start --tunnel --clear
   ```

2. ✅ **LAN modu dene** (aynı ağda)
   ```powershell
   npx expo start --lan --clear
   ```

3. ✅ **Expo Go cache temizle** (telefonda)

4. ✅ **USB Debugging kullan** (localhost)

5. ✅ **Development build oluştur** (son çare)

## ⚠️ Yaygın Hatalar

### "Network request failed"
- Wi-Fi bağlantısını kontrol edin
- Firewall ayarlarını kontrol edin
- Tunnel modu kullanın

### "Unable to resolve host"
- DNS sorunu olabilir
- Tunnel modu kullanın
- VPN'i kapatın

### "Connection timeout"
- Port 8081 açık mı?
- Firewall Expo'yu engelliyor mu?
- Tunnel modu kullanın

## 📝 Manuel IP ile Bağlanma

**Bilgisayarda IP'yi bulun:**
```powershell
ipconfig
# IPv4 Address: 192.168.1.100 (örnek)
```

**Telefonda Expo Go'da:**
- QR kod yerine manuel IP girin
- Format: `exp://192.168.1.100:8081`

## 🔧 Gelişmiş Çözümler

### Firewall Kuralı Ekleme

```powershell
# PowerShell (Yönetici)
New-NetFirewallRule -DisplayName "Expo Dev Server" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

### Port Yönlendirme (Router)

1. Router ayarlarına girin
2. Port Forwarding ekleyin
3. Port: 8081
4. IP: Bilgisayarınızın IP'si

## 💡 İpuçları

1. **Tunnel modu** en güvenilir çözümdür
2. **Aynı ağda** LAN modu daha hızlıdır
3. **USB Debugging** en stabil bağlantıdır
4. **Development build** production'a yakındır

## 🆘 Hala Çalışmıyorsa

1. Expo Go'yu silip yeniden yükleyin
2. Bilgisayarı ve telefonu yeniden başlatın
3. Farklı bir Wi-Fi ağı deneyin
4. Development build oluşturun

---

**Hızlı Başlatma:**
```powershell
.\expo-tunnel-start.ps1
```


