# 📝 WMatch - TypeScript Strict Mode'a Geçiş Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch projesinin kod tabanını daha güvenli, daha sağlam ve daha kolay sürdürülebilir hale getirmek için TypeScript'in **`strict` moduna** kademeli ve güvenli bir şekilde nasıl geçiş yapılacağını açıklamaktadır.

**Neden `strict` Modu?**
-   **Hata Yakalama:** `null`, `undefined` ve `any` tiplerinden kaynaklanan sayısız potansiyel hatayı derleme (compile) aşamasında yakalar.
-   **Kod Kalitesi:** Geliştiricileri daha bilinçli ve temiz kod yazmaya teşvik eder.
-   **Geliştirici Deneyimi (DX):** Daha iyi otomatik tamamlama (autocompletion) ve kod üzerinde daha güvenli refactoring imkanı sunar.

---

## 2. Kademeli Geçiş Stratejisi

Tüm projeyi tek seferde `strict` moda geçirmek, yüzlerce hatayla karşılaşmanıza neden olabilir ve geliştirme sürecini durdurabilir. Bunun yerine, aşağıdaki kademeli stratejiyi izleyin.

### Adım 1: `noImplicitAny` Kuralını Etkinleştirme (En Yüksek Öncelik)

Bu kural, TypeScript'in bir değişkenin tipini belirleyemediği durumlarda onu `any` olarak işaretlemesini engeller. Bu, `strict` moda geçişin en önemli ve en temel adımıdır.

1.  **`tsconfig.json` Dosyasını Güncelleyin:**
    ```json
    {
      "extends": "@tsconfig/react-native/tsconfig.json",
      "compilerOptions": {
        "skipLibCheck": true,
        "strict": false,
        "noImplicitAny": true // <-- BU SATIRI GÜNCELLEYİN
      }
    }
    ```

2.  **Derleme Hatalarını Giderin:**
    -   Projenizi `npx tsc --noEmit` komutuyla derleyin.
    -   Derleyici, tipi belirtilmemiş tüm değişkenler, fonksiyon parametreleri ve geri dönüş değerleri için hata verecektir.
    -   **Çözüm:** Bu hataları, ilgili yerlere doğru tipleri (`string`, `number`, `User`, vb.) ekleyerek giderin. Eğer bir tipin ne olduğundan emin değilseniz, geçici olarak `any` kullanabilirsiniz, ancak bunu bir `// TODO: fix any type` yorumuyla işaretleyin.

### Adım 2: `strictNullChecks` Kuralını Etkinleştirme (Yüksek Öncelik)

Bu kural, `null` ve `undefined` değerlerinin potansiyel olarak kullanılabileceği yerleri tespit eder ve "Cannot read property 'x' of undefined" gibi hataları önler.

1.  **`tsconfig.json` Dosyasını Güncelleyin:**
    ```json
    {
      // ...
      "compilerOptions": {
        "skipLibCheck": true,
        "strict": false,
        "noImplicitAny": true,
        "strictNullChecks": true // <-- BU SATIRI EKLEYİN
      }
    }
    ```

2.  **Derleme Hatalarını Giderin:**
    -   Projenizi tekrar derleyin (`npx tsc --noEmit`).
    -   Derleyici, bir değişkenin `null` veya `undefined` olabileceği ancak kontrol edilmeden kullanıldığı yerlerde hata verecektir.
    -   **Çözüm:**
        -   **Null Check Ekleme:** Değişkeni kullanmadan önce bir `if (variable)` veya `if (variable != null)` kontrolü ekleyin.
        -   **Optional Chaining Kullanımı:** `user.profile.bio` yerine `user?.profile?.bio` kullanarak güvenli erişim sağlayın.
        -   **Non-null Assertion Operatörü (`!`):** Eğer bir değerin o noktada asla `null` olmayacağından %100 eminseniz, `variable!` şeklinde "non-null assertion" operatörünü kullanabilirsiniz. **Ancak bunu dikkatli kullanın!**

### Adım 3: Tam `strict` Modunu Etkinleştirme (Orta Öncelik)

Yukarıdaki iki adımı tamamladıktan sonra, tam `strict` moda geçiş çok daha kolay olacaktır.

1.  **`tsconfig.json` Dosyasını Güncelleyin:**
    ```json
    {
      // ...
      "compilerOptions": {
        "skipLibCheck": true,
        "strict": true // <-- BU SATIRI GÜNCELLEYİN (diğerlerini silebilirsiniz)
      }
    }
    ```

2.  **Kalan Hataları Giderin:**
    -   `strict` modu, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization` gibi ek kuralları da etkinleştirir.
    -   Projenizi derleyin ve ortaya çıkan son hataları (genellikle sınıf (class) constructor'larında veya fonksiyon tiplerinde olur) düzeltin.

---

## 3. Pratik İpuçları ve En İyi Pratikler

-   **Yeni Kodları `strict` Yazın:** Bu geçiş sürecinde yazılan tüm yeni component'lerin ve fonksiyonların en başından itibaren `strict` mod kurallarına uygun yazıldığından emin olun.
-   **Adım Adım İlerleyin:** Eğer proje çok büyükse, bu kuralları önce projenin belirli bir modülü veya klasörü için etkinleştirmeyi düşünebilirsiniz.
-   **CI/CD Entegrasyonu:** `npx tsc --noEmit` komutunu CI/CD pipeline'ınıza ekleyin. Bu, `strict` moddan sapan hiçbir kodun ana branch'e merge edilmemesini garanti eder.
-   **Takım Eğitimi:** Ekibinizin bu kuralların neden önemli olduğunu ve ortaya çıkan hataları nasıl çözeceklerini anladığından emin olun. Bu rehberi ekiple paylaşın.

Bu adımları izleyerek, WMatch projesinin kod kalitesini ve stabilitesini sistematik bir şekilde artırabilirsiniz.
