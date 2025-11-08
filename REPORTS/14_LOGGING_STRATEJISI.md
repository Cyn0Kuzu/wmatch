# 📝 WMatch - Logging Stratejisi Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu belge, WMatch uygulamasının mevcut `Logger.ts`'ini temel alarak, hem geliştirme (development) hem de üretim (production) ortamları için etkili, yapılandırılmış (structured) ve eyleme geçirilebilir (actionable) bir loglama stratejisi oluşturma adımlarını açıklamaktadır.

**Mevcut Durum:** Gelişmiş bir lokal loglama altyapısı var, ancak loglar production'da sadece kullanıcının cihazında kalıyor, bu da geliştiriciler için sıfır görünürlük anlamına geliyor.

**Hedef:** Logları, hataları ayıklamak ve sistem sağlığını izlemek için proaktif bir araca dönüştürmek.

---

## 2. Stratejinin Temel Prensipleri

1.  **Yapılandırılmış Loglama (Structured Logging):** Her log kaydı, `timestamp`, `level`, `message` gibi standart alanların yanı sıra, `userId`, `context` (örn: 'MatchService'), `sessionId` gibi zengin bir bağlam içeren bir JSON nesnesi olmalıdır. Mevcut `Logger.ts` bu prensibe zaten uymaktadır.

2.  **Doğru Log Seviyeleri (Log Levels):** Logları ciddiyetine göre doğru seviyede kaydetmek, gereksiz gürültüyü filtrelemek için kritiktir.
    -   **`DEBUG`:** Sadece geliştirme sırasında, bir fonksiyonun içindeki değişken değerleri gibi detaylı bilgiler için kullanılır. Production'da kapalı olmalıdır.
    -   **`INFO`:** Uygulamanın normal akışını gösteren önemli olaylar (kullanıcı giriş yaptı, profil güncellendi, eşleşme bulundu vb.).
    -   **`WARN`:** Beklenmedik ancak uygulamanın çökmesine neden olmayan durumlar (API'den geç yanıt geldi, bir resim yüklenemedi ama placeholder gösterildi vb.).
    -   **`ERROR`:** Uygulamanın bir işlemini başarısız kılan ancak uygulamanın çalışmaya devam ettiği hatalar (form gönderilemedi, veri yazılamadı vb.). **Bu seviyedeki hatalar mutlaka Sentry'ye gönderilmelidir.**
    -   **`CRITICAL`:** Uygulamanın çökmesine neden olan veya veri kaybına yol açan, acil müdahale gerektiren hatalar.

3.  **Hassas Verileri Loglamama (No Sensitive Data):** Asla şifreler, API anahtarları, e-posta adresleri veya kişisel olarak tanımlanabilir diğer bilgileri (PII) düz metin olarak loglamayın.

---

## 3. Implementasyon Planı: Logları Sentry ile Entegre Etme

Ayrı bir log yönetim servisi kurmak yerine, başlangıç için en etkili ve maliyet-etkin yöntem, mevcut loglama sistemini Sentry ile entegre etmektir.

### Adım 1: Hata (Error) Seviyesindeki Logları Sentry'ye Gönderme

-   `Logger.ts` içindeki `sendToMonitoring` fonksiyonunu, `ERROR` ve `CRITICAL` seviyesindeki logları `Sentry.captureException` veya `Sentry.captureMessage` ile Sentry'ye gönderecek şekilde güncelleyin.

    **Örnek Kod (`src/utils/Logger.ts`):**
    ```typescript
    import * as Sentry from '@sentry/react-native';

    class Logger {
      // ...

      private async sendToMonitoring(logEntry: LogEntry): Promise<void> {
        // Bu fonksiyon artık sadece Sentry'ye gönderecek
        if (logEntry.level >= LogLevel.ERROR) {
          const error = new Error(logEntry.message);
          error.name = `[${LogLevel[logEntry.level]}] - ${logEntry.context || 'Global'}`;

          Sentry.captureException(error, {
            extra: {
              data: logEntry.data,
              sessionId: logEntry.sessionId,
            },
            user: {
              id: logEntry.userId,
            },
            level: logEntry.level === LogLevel.CRITICAL ? 'fatal' : 'error',
          });
        }
      }
    }
    ```

### Adım 2: Diğer Logları Sentry "Breadcrumbs" Olarak Ekleme

-   `INFO` ve `WARN` seviyesindeki loglar, bir hataya yol açan adımları anlamak için paha biçilmezdir. Bu logları, Sentry'ye "breadcrumb" (ekmek kırıntısı) olarak ekleyin.

    **Örnek Kod (`src/utils/Logger.ts`):**
    ```typescript
    import * as Sentry from '@sentry/react-native';

    class Logger {
      // ...

      private async log(level: LogLevel, message: string, context?: string, data?: any): Promise<void> {
        if (level < this.logLevel) return;

        const logEntry: LogEntry = { /* ... */ };

        // Sentry'ye Breadcrumb olarak ekle
        Sentry.addBreadcrumb({
          category: context || 'general',
          message: message,
          level: this.sentryLevel(level),
          data: data,
        });

        // Hata ise Sentry'ye gönder
        if (level >= LogLevel.ERROR) {
          await this.sendToMonitoring(logEntry);
        }

        // Lokal loglama (AsyncStorage) artık sadece debug için kullanılabilir veya kaldırılabilir
        // ...
      }

      private sentryLevel(level: LogLevel): Sentry.SeverityLevel {
        switch (level) {
          case LogLevel.DEBUG: return 'debug';
          case LogLevel.INFO: return 'info';
          case LogLevel.WARN: return 'warning';
          case LogLevel.ERROR: return 'error';
          case LogLevel.CRITICAL: return 'fatal';
          default: return 'log';
        }
      }
    }
    ```

### Adım 3: Lokal Loglamayı (AsyncStorage) Kaldırma veya Azaltma

-   Loglar artık Sentry'ye gönderildiği için, production'da `AsyncStorage`'a log yazma ihtiyacı ortadan kalkar. Bu, hem performansı artırır hem de gereksiz disk kullanımını önler.
-   `storeLog` fonksiyonunu, sadece `__DEV__` modunda çalışacak şekilde güncelleyebilir veya tamamen kaldırabilirsiniz.

Bu strateji, WMatch uygulamasının loglarını pasif, cihazda kilitli kalan kayıtlardan, proaktif hata tespiti ve hızlı hata ayıklama sağlayan güçlü bir araca dönüştürecektir.
