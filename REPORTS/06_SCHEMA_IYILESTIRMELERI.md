# 🗄️ WMatch - Veritabanı Şeması İyileştirme Önerileri

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu rehber, WMatch uygulamasının Firestore veritabanı şemasını daha **performanslı**, **ölçeklenebilir** ve **sürdürülebilir** hale getirmek için somut öneriler sunmaktadır. Öneriler, Faz 2 Veritabanı Denetimi sırasında tespit edilen kritik tasarım sorunlarına odaklanmaktadır.

---

## 2. Yüksek Öncelikli Öneri: Monolitik `UserProfile`'ı Subcollection'lara Bölme

**Sorun:** Tüm kullanıcı verilerinin tek bir büyük dökümanda toplanması, verimsiz güncellemelere ve gereksiz veri indirmeye neden olmaktadır.

**Öneri:** Sık güncellenen, ayrı erişilen veya hassas olan veri gruplarını kendi **subcollection**'larına taşıyın.

### Önerilen Yeni `users` Koleksiyon Yapısı:

```
users/{userId} (Ana Profil Dökümanı - Az Değişen Veriler)
|
|-- uid: "..."
|-- username: "..."
|-- firstName: "..."
|-- profile: {
|   |-- bio: "..."
|   |-- location: "..."
|   |-- birthDate: "..."
|   `-- profilePhotos: ["..."]
|
`-- social: {
    |-- isVerified: false
    `-- socialLinks: {...}
}

|
|--- subcollections:
    |
    |-- private/{docId} (Hassas Veriler - Sadece Kullanıcı Erişebilir)
    |   `-- email: "...", phoneNumber: "..."
    |
    |-- settings/{docId} (Kullanıcı Ayarları)
    |   `-- notifications: {...}, privacy: {...}, theme: "dark"
    |
    |-- statistics/{docId} (Sık Güncellenen İstatistikler)
    |   `-- moviesWatched: 120, totalWatchTime: 9500
    |
    `-- state/{docId} (Anlık Durum Bilgileri)
        `-- isOnline: true, lastActivity: "Timestamp", currentlyWatching: {...}
```

### Uygulama Adımları:

1.  **Yeni Veri Yazma:** Yeni kullanıcı kayıtlarında ve profil güncellemelerinde, verileri bu yeni yapıya göre yazmaya başlayın.
2.  **Veri Okumayı Güncelle:** İlgili ekranların (örneğin, `SettingsScreen`) verileri artık ana profil dökümanı yerine ilgili subcollection'dan okumasını sağlayın.
3.  **Veri Migrasyonu:** Mevcut kullanıcıların verilerini bu yeni yapıya taşımak için bir Firebase Function (HTTP veya Pub/Sub trigger ile) yazın. Bu script, her kullanıcı dökümanını okur, ilgili alanları yeni subcollection'lara taşır ve ana dökümandan siler.

---

## 3. Yüksek Öncelikli Öneri: Normalize Koleksiyon Yapısına Geçiş

**Sorun:** Eşleşmeler (`matches`), beğeniler (`likes`) gibi ilişkisel veriler, `UserProfile` dökümanı içindeki dizilerde tutuluyor. Bu, ölçeklenmeyi ve sorgulamayı zorlaştırıyor.

**Öneri:** `DatabaseSchema.ts`'te planlandığı gibi, bu ilişkisel veriler için üst düzey (top-level) koleksiyonlar kullanın.

### Önerilen Üst Düzey Koleksiyonlar:

-   **`matches`**: İki kullanıcı arasındaki her eşleşme için bir döküman.
    -   **ID:** İki kullanıcının UID'lerinin sıralanıp birleştirilmesi (örn: `uid1_uid2`).
    -   **Alanlar:** `users: [uid1, uid2]`, `matchedAt`, `lastMessage`, `lastMessageAt`, `unreadCount: { uid1: 0, uid2: 3 }`.

-   **`swipes`**: Her swipe işlemi için bir döküman.
    -   **Alanlar:** `swiperId`, `swipedId`, `action: 'like' | 'pass'`, `timestamp`.

### Uygulama Adımları:

1.  **Yeni Veri Yazma:** `MatchScreen`'deki `handleLike` ve `handlePass` fonksiyonlarını, `UserProfile`'ı güncellemek yerine yeni `swipes` koleksiyonuna bir döküman ekleyecek şekilde güncelleyin.
2.  **Eşleşme Mantığını Güncelle (Firebase Function):** Bir "like" swipe'ı yapıldığında, karşı tarafın da daha önce "like" yapıp yapmadığını kontrol eden bir Firebase Function (`onNewSwipe`) oluşturun. Eğer karşılıklı beğeni varsa, bu fonksiyon yeni bir dökümanı `matches` koleksiyonuna ekler.
3.  **Veri Okumayı Güncelle:** `MessageScreen` gibi ekranların, eşleşme listesini artık `UserProfile`'dan değil, mevcut kullanıcıyı içeren `matches` koleksiyonunu sorgulayarak almasını sağlayın.

---

## 4. Acil Öneri: Birleşik İndekslerin Tanımlanması

**Sorun:** `firestore.indexes.json` dosyası boş, bu da karmaşık sorguları imkansız hale getiriyor.

**Öneri:** Uygulamanın ihtiyaç duyduğu tüm birleşik indeksleri tanımlayın.

### Uygulama Adımları:

1.  **`firestore.indexes.json` Dosyasını Doldur:** Backend performans raporunda önerilen ve `05_FIRESTORE_INDEXES.json` dosyasında sunulan indeks tanımlamalarını projenizin `firestore.indexes.json` dosyasına ekleyin.
2.  **Deploy Et:** Firebase CLI kullanarak yeni indeksleri deploy edin:
    ```bash
    firebase deploy --only firestore:indexes
    ```

Bu değişiklikler, veritabanı işlemlerini daha verimli hale getirecek, sorgu performansını artıracak ve uygulamanın gelecekteki büyümesine zemin hazırlayacaktır.
