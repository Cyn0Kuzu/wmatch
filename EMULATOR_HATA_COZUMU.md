# Android Emülatör Hatası Çözüm Rehberi

## Hata: "The emulator process for AVD Medium_Phone has terminated"

Bu hata genellikle Windows'ta emülatörün başlatılamaması durumunda oluşur. Aşağıdaki çözümleri sırayla deneyin.

## Hızlı Çözümler

### 1. Windows Hypervisor Platform Kontrolü

Windows 10/11'de emülatör çalışması için Hyper-V veya Windows Hypervisor Platform gerekir.

**Kontrol etmek için:**
```powershell
# PowerShell'i yönetici olarak çalıştırın
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
```

**Etkinleştirmek için:**
```powershell
# PowerShell'i yönetici olarak çalıştırın
Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All
```

**Alternatif (GUI):**
1. Windows tuşu + R → `optionalfeatures` yazın
2. "Windows Hypervisor Platform" ve "Hyper-V" seçeneklerini işaretleyin
3. Bilgisayarı yeniden başlatın

### 2. BIOS Ayarları

Bilgisayarınızın BIOS'unda sanallaştırma (Virtualization) etkin olmalı:
- Intel: "Intel Virtualization Technology (VT-x)"
- AMD: "AMD-V" veya "SVM Mode"

### 3. Emülatör RAM Ayarları

Emülatör çok fazla RAM kullanıyorsa çökebilir.

**Android Studio'da:**
1. Tools → Device Manager
2. Medium_Phone AVD'yi seçin → Edit (kalem ikonu)
3. "Show Advanced Settings"
4. RAM'i 2048 MB veya 1536 MB'a düşürün
5. VM heap'i 512 MB'a düşürün

### 4. AVD'yi Yeniden Oluşturma

Bozuk AVD'yi silip yeniden oluşturun:

**Android Studio'da:**
1. Tools → Device Manager
2. Medium_Phone AVD'yi seçin → Delete (çöp kutusu ikonu)
3. "Create Device" ile yeni bir AVD oluşturun
4. Daha düşük sistem gereksinimleri olan bir cihaz seçin (örn: Pixel 3)

### 5. Disk Alanı Kontrolü

Emülatör için yeterli disk alanı olmalı (en az 10 GB boş alan).

```powershell
# Disk alanını kontrol edin
Get-PSDrive C
```

### 6. Android SDK ve Emülatör Güncelleme

**Android Studio'da:**
1. Tools → SDK Manager
2. SDK Tools sekmesi
3. "Android Emulator" ve "Android SDK Platform-Tools" güncel olduğundan emin olun
4. Güncellemeleri yükleyin

### 7. Emülatörü Komut Satırından Çalıştırma

Hata mesajını görmek için:

```powershell
# Android SDK yolunu bulun (genellikle):
# C:\Users\[KullanıcıAdı]\AppData\Local\Android\Sdk

# Emülatör listesini görüntüleyin
& "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\emulator\emulator.exe" -list-avds

# Emülatörü başlatın (hata mesajlarını görmek için)
& "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone
```

### 8. Alternatif: Expo Go Kullanma

Emülatör sorunları devam ederse, fiziksel cihaz veya Expo Go kullanın:

```bash
# Expo Go ile çalıştırma
npm start
# Ardından telefonunuzda Expo Go uygulamasını açın ve QR kodu tarayın
```

### 9. WSL2 Çakışması

WSL2 kullanıyorsanız, Hyper-V ile çakışma olabilir. WSL2'yi güncelleyin:

```powershell
wsl --update
```

### 10. Antivirus/Yazılım Çakışması

Bazı antivirus yazılımları emülatörü engelleyebilir. Geçici olarak devre dışı bırakıp deneyin.

## Önerilen Adımlar (Sırayla)

1. ✅ Windows Hypervisor Platform'u etkinleştirin
2. ✅ Bilgisayarı yeniden başlatın
3. ✅ Android Studio'yu güncelleyin
4. ✅ AVD'yi silip yeniden oluşturun (daha düşük RAM ile)
5. ✅ Emülatörü komut satırından çalıştırıp hata mesajını kontrol edin
6. ✅ Alternatif olarak Expo Go veya fiziksel cihaz kullanın

## Hata Mesajlarını Kontrol Etme

Emülatör loglarını kontrol etmek için:

```powershell
# Log dosyası konumu
$env:USERPROFILE\.android\avd\Medium_Phone.avd\hardware-qemu.log
```

## Expo ile Fiziksel Cihaz Kullanma

Emülatör sorunları devam ederse:

1. Telefonunuzda USB Debugging'i etkinleştirin
2. Telefonu USB ile bilgisayara bağlayın
3. ADB ile kontrol edin:
   ```bash
   adb devices
   ```
4. Expo'yu çalıştırın:
   ```bash
   npm start
   npm run android
   ```

## Daha Fazla Yardım

- Android Studio logları: Help → Show Log in Explorer
- Expo dokümantasyonu: https://docs.expo.dev/
- React Native dokümantasyonu: https://reactnative.dev/docs/environment-setup

