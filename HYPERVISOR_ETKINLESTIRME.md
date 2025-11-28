# Windows Hypervisor Platform Etkinleştirme

## Yöntem 1: PowerShell (Önerilen)

1. **PowerShell'i YÖNETİCİ olarak açın:**
   - Windows tuşuna basın
   - "PowerShell" yazın
   - Sağ tıklayın → "Yönetici olarak çalıştır"

2. **Şu komutu çalıştırın:**
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All
   ```

3. **Bilgisayarı yeniden başlatın**

## Yöntem 2: Windows Özellikler (GUI)

1. **Windows tuşu + R** tuşlarına basın
2. **`optionalfeatures`** yazın ve Enter'a basın
3. Açılan pencerede:
   - ✅ **"Windows Hypervisor Platform"** seçeneğini işaretleyin
   - ✅ **"Hyper-V"** seçeneğini de işaretleyin (varsa)
4. **Tamam**'a tıklayın
5. **Bilgisayarı yeniden başlatın**

## Yöntem 3: Komut İstemi (CMD)

1. **CMD'yi YÖNETİCİ olarak açın**
2. Şu komutu çalıştırın:
   ```cmd
   DISM /Online /Enable-Feature /FeatureName:HypervisorPlatform /All
   ```
3. **Bilgisayarı yeniden başlatın**

## Kontrol Etme

Yeniden başlattıktan sonra, PowerShell'de (yönetici olarak):

```powershell
Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
```

"State" değeri "Enabled" olmalı.

## BIOS Kontrolü

Eğer hala çalışmıyorsa, BIOS'ta sanallaştırma etkin olmalı:

1. Bilgisayarı yeniden başlatın
2. BIOS'a girin (genellikle F2, F10, F12 veya Del tuşu)
3. Şunları arayın ve etkinleştirin:
   - **Intel:** "Intel Virtualization Technology (VT-x)" veya "Intel VT-x"
   - **AMD:** "AMD-V" veya "SVM Mode"
4. Değişiklikleri kaydedin ve çıkın

## Sonraki Adımlar

Hypervisor Platform'u etkinleştirdikten sonra:

1. Bilgisayarı yeniden başlatın
2. Android Studio'yu açın
3. Emülatörü tekrar çalıştırmayı deneyin
4. Hala çalışmıyorsa, AVD'yi silip yeniden oluşturun

