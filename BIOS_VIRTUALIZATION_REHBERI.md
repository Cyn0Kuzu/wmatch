# BIOS Virtualization Etkinleştirme Rehberi

## ⚠️ ÖNEMLİ: BIOS'ta Virtualization KAPALI!

Sistem kontrolünde **"CPU Virtualization: False"** görüldü. Bu, emülatörün çalışmamasının ana nedeni.

## BIOS'a Nasıl Girilir?

### Yaygın Tuşlar:
- **F2** (En yaygın - Dell, Acer, Lenovo)
- **F10** (HP, Compaq)
- **F12** (Dell, bazı Lenovo modelleri)
- **Del** (Desktop bilgisayarlar)
- **Esc** (Bazı modellerde)

### Adımlar:

1. **Bilgisayarı tamamen kapatın**
2. **Açılış sırasında** (Windows logosu görünmeden önce) yukarıdaki tuşlardan birine **sürekli basın**
3. BIOS menüsü açılacak

## BIOS'ta Nerede Bulunur?

Virtualization ayarı genellikle şu bölümlerde bulunur:

### Intel İşlemciler:
- **Advanced** → **CPU Configuration** → **Intel Virtualization Technology (VT-x)**
- **Advanced** → **Processor Configuration** → **Intel VT-x**
- **Security** → **Virtualization**

### AMD İşlemciler:
- **Advanced** → **CPU Configuration** → **AMD-V** veya **SVM Mode**
- **Advanced** → **SVM Mode**

### Genel Yerler:
- **Configuration**
- **Advanced BIOS Features**
- **System Configuration**

## Nasıl Etkinleştirilir?

1. BIOS menüsünde yukarıdaki bölümlerden birini bulun
2. **Intel Virtualization Technology (VT-x)** veya **AMD-V** seçeneğini bulun
3. **Disabled** → **Enabled** yapın
4. **F10** tuşuna basın (veya **Save & Exit** seçeneğini seçin)
5. **Yes** ile onaylayın
6. Bilgisayar yeniden başlayacak

## Etkinleştirdikten Sonra

1. Windows açıldıktan sonra, PowerShell'de kontrol edin:
   ```powershell
   $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
   $cpu.VirtualizationFirmwareEnabled
   ```
   **True** görünmeli.

2. Emülatörü tekrar deneyin:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone
   ```

## BIOS'a Giremiyorsanız

Eğer BIOS'a giremiyorsanız veya ayarı bulamıyorsanız:

1. **Software Rendering kullanın** (zaten yapıldı)
2. **Expo Go ile fiziksel cihaz kullanın** (en kolay çözüm)
3. **Yeni, daha hafif AVD oluşturun**

## Marka Özel Talimatlar

### Dell:
- F2 veya F12 ile BIOS'a girin
- **Advanced** → **Virtualization** → **Enable**

### HP:
- F10 ile BIOS'a girin
- **Advanced** → **System Options** → **Virtualization Technology (VTx)**

### Lenovo:
- F1 veya F2 ile BIOS'a girin
- **Security** → **Virtualization** → **Enable**

### ASUS:
- F2 veya Del ile BIOS'a girin
- **Advanced** → **CPU Configuration** → **Intel Virtualization Technology**

## Sorun Giderme

### BIOS'ta Ayar Görünmüyor:
- İşlemciniz sanallaştırmayı desteklemiyor olabilir
- BIOS güncellemesi gerekebilir
- Software rendering kullanın

### Ayarı Değiştiremiyorum:
- BIOS şifresi olabilir (fabrika ayarlarına sıfırlayın)
- Bazı laptoplarda bu özellik kilitli olabilir
- Software rendering kullanın

## Alternatif Çözümler

BIOS'u değiştiremiyorsanız, zaten yapılan değişiklikler:

✅ **AVD Config güncellendi:**
- GPU mode: `swiftshader_indirect` (software rendering)
- RAM: 1536 MB (daha stabil)

Şimdi emülatörü deneyin:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone
```

Veya Expo Go kullanın:
```bash
npm start
```

