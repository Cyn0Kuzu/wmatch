# 🗄️ WMatch - Veritabanı Tasarımı ve Optimizasyon Raporu (Faz 2)

**Tarih:** 2025-11-08
**Öncelik:** 🟡 Yüksek

---

## Executive Summary

Bu denetim, WMatch uygulamasının Firestore veritabanı şemasını, veri modelini ve sorgu verimliliğini analiz etmektedir. Analiz, **planlanan şema (`DatabaseSchema.ts`)** ile **uygulanan şema (`FirestoreService.ts`)** arasında ciddi bir tutarsızlık olduğunu ve bu durumun önemli performans, ölçeklenebilirlik ve bakım sorunlarına yol açtığını ortaya koymuştur.

Ana sorunlar, **monolitik ve aşırı iç içe (nested) bir kullanıcı profili dökümanı**, **veri normalizasyonu ve denormalizasyonu arasında tutarsızlık** ve en kritik olarak, **hiçbir birleşik (composite) indeksin tanımlanmamış olmasıdır**. Bu durum, veritabanı sorgularının verimsiz çalışmasına ve uygulamanın ölçeklenmesinin önünde büyük bir engel teşkil etmesine neden olmaktadır.

Bu raporda, mevcut veritabanı tasarımının zayıflıkları detaylandırılmakta ve daha performanslı, ölçeklenebilir ve sürdürülebilir bir yapı için somut öneriler sunulmaktadır.

---

## 🔴 P0 - Kritik Veritabanı Sorunları

### 1. Hiçbir Birleşik (Composite) İndeksin Tanımlanmamış Olması

-   **Sorun:** `firestore.indexes.json` dosyası tamamen boştur. Bu, uygulamanın birden fazla alana göre filtreleme veya sıralama yapan karmaşık sorguları (örneğin, "25-30 yaş aralığındaki ve son 1 ayda aktif olan erkek kullanıcıları getir") verimli bir şekilde çalıştıramayacağı anlamına gelir.
-   **Kök Neden:** Geliştirme sürecinde indekslerin tanımlanmasının ihmal edilmesi.
-   **Etki:**
    -   **Yavaş Sorgular:** Firestore, bu tür sorguları çalıştırmak için tüm koleksiyonu taramak zorunda kalabilir, bu da çok yavaş ve maliyetlidir.
    -   **Başarısız Sorgular:** Karmaşık sorgular, gerekli indeksler olmadan Firestore tarafından tamamen reddilebilir.
    -   **Backend Performans Darboğazı:** Sunucu tarafı eşleştirme mantığı, verimli sorgulama olmadan etkili bir şekilde çalışamaz.
-   **Çözüm Önerisi:** Backend Performans raporunda (`05_BACKEND_PERFORMANS_DENETIMI.md`) önerilen sunucu tarafı eşleştirme fonksiyonunun gerektirdiği tüm sorgular için **birleşik indeksler** tanımlanmalıdır. Bu indeksler, `firestore.indexes.json` dosyasına eklenmeli ve deploy edilmelidir. `05_FIRESTORE_INDEXES.json` dosyasında başlangıç için önerilen indeksler sunulmuştur.

---

## 🟡 P1 - Yüksek Öncelikli Veritabanı Tasarım Sorunları

### 2. Şema Tutarsızlığı: Planlanan vs. Uygulanan

-   **Sorun:** `DatabaseSchema.ts` dosyası, `USER_MATCHES`, `USER_RATINGS` gibi ayrı, normalize edilmiş üst düzey koleksiyonlar içeren iyi tasarlanmış bir şema tanımlamaktadır. Ancak, `FirestoreService.ts` ve uygulamanın geri kalanı, bu verileri `UserProfile` dökümanı içindeki `social.matches` gibi dizilerde (arrays) denormalize ederek saklamaktadır.
-   **Kök Neden:** Geliştirme kolaylığı için başlangıçta denormalize bir yapının tercih edilmesi ve daha sonra planlanan normalize şemaya geçişin yapılmaması.
-   **Etki:**
    -   **Veri Tutarsızlığı:** Eşleşme bilgisi hem `user1` hem de `user2`'nin dökümanlarında ayrı ayrı tutulduğunda, birinin güncellenip diğerinin güncellenmemesi riski vardır.
    -   **Sorgulama Zorluğu:** "En son yapılan 100 eşleşme" gibi genel sorguları yapmak imkansızdır, çünkü tüm kullanıcı dökümanlarını taramak gerekir.
    -   **Döküman Boyutu Sınırı:** Bir kullanıcının on binlerce beğenisi veya eşleşmesi olursa, bu diziler Firestore'un 1 MB'lık döküman boyutu sınırını aşabilir.
-   **Çözüm Önerisi:** Kademeli olarak `DatabaseSchema.ts`'te tanımlanan normalize yapıya geçiş yapın:
    -   **Yeni Eşleşmeler İçin:** Yeni eşleşmeleri, `UserProfile` yerine ayrı bir `matches` koleksiyonuna yazmaya başlayın.
    -   **Veri Migrasyonu:** Mevcut `social.matches` verilerini yeni `matches` koleksiyonuna taşımak için bir migration script'i (Firebase Function ile yazılabilir) oluşturun.
    -   **Uygulamayı Güncelle:** Uygulamanın eşleşme verilerini `UserProfile` yerine `matches` koleksiyonundan okumasını sağlayın.

### 3. Monolitik ve Aşırı İç İçe (Nested) `UserProfile` Dökümanı

-   **Sorun:** `UserProfile` dökümanı, `profile`, `preferences`, `settings`, `statistics`, `social` gibi çok sayıda iç içe nesne içermektedir. Bu, tek bir dökümanda çok fazla veri toplanmasına neden olur.
-   **Kök Neden:** İlişkili verileri ayrı koleksiyonlara bölmek yerine tek bir dökümanda gruplama eğilimi.
-   **Etki:**
    -   **Verimsiz Güncellemeler:** Kullanıcının sadece `lastActivity` zaman damgasını güncellemek gibi küçük bir değişiklik için bile, potansiyel olarak büyük bir `UserProfile` dökümanının tamamının okunması ve yazılması gerekebilir. Bu, "write amplification" sorununa yol açar.
    -   **Gereksiz Veri İndirme:** İstemci, bir kullanıcının sadece profil fotoğrafını ve adını göstermek istediğinde bile, tüm ayarlar, istatistikler ve sosyal bilgiler gibi gereksiz verileri indirmek zorunda kalır.
-   **Çözüm Önerisi:** Sık güncellenen veya ayrı olarak erişilen verileri **subcollection**'lara taşıyın.
    -   **`settings` Subcollection'ı:** Kullanıcı ayarlarını `/users/{userId}/settings/` altına taşıyın. Bu, ayarlar ekranının sadece kendiyle ilgili verileri çekmesini sağlar.
    -   **`statistics` Subcollection'ı:** İstatistikleri ayrı bir subcollection'a taşıyın.
    -   **`private` Subcollection'ı:** E-posta, telefon numarası gibi hassas veya özel verileri, sadece kullanıcının kendisinin erişebileceği `/users/{userId}/private/` subcollection'ına taşıyın. Bu, güvenlik kurallarının daha granüler yazılmasına olanak tanır.

---

## 4. Veritabanı Optimizasyon Yol Haritası

1.  **Adım 1: İndeksleri Oluştur (Acil)**
    -   `firestore.indexes.json` dosyasını, en kritik sorguları destekleyecek şekilde güncelleyin ve deploy edin. Bu, mevcut performans sorunları üzerinde anında bir etki yaratacaktır.

2.  **Adım 2: `UserProfile`'ı Subcollection'lara Ayırma (Yüksek Öncelik)**
    -   En bariz aday olan `settings` ve potansiyel olarak `statistics` verilerini kendi subcollection'larına taşıyın.
    -   Uygulamanın ilgili ekranlarını, verileri bu yeni subcollection'lardan okuyacak şekilde güncelleyin.

3.  **Adım 3: Normalize Yapıya Geçiş (Orta Öncelik)**
    -   Yeni verileri (`matches`, `likes` vb.) `DatabaseSchema.ts`'te tanımlanan ayrı koleksiyonlara yazmaya başlayın.
    -   Mevcut verileri taşımak için bir migrasyon planı oluşturun. Bu, uzun vadeli ölçeklenebilirlik için en önemli adımdır.
