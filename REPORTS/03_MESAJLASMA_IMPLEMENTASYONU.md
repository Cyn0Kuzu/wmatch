# 💬 WMatch - Mesajlaşma Backend Implementasyon Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu belge, WMatch uygulamasının gerçek zamanlı mesajlaşma özelliğinin backend veri modelini ve Firestore şemasını detaylandırmaktadır. Amaç, ölçeklenebilir, verimli ve sorgulanması kolay bir yapı oluşturmaktır.

Bu yapı, iki ana koleksiyona dayanmaktadır:
1.  **`matches`**: İki kullanıcı arasındaki eşleşmeyi temsil eden ana koleksiyon.
2.  **`chats`**: İki kullanıcı arasındaki sohbeti ve mesajları içeren subcollection yapısı.

---

## 2. Firestore Veri Modeli ve Şeması

### `matches` Koleksiyonu

Bu koleksiyon, her eşleşme için tek bir döküman içerir. Döküman ID'si, iki kullanıcının UID'lerinin alfabetik olarak sıralanıp birleştirilmesiyle oluşturulmalıdır. Bu, her zaman tutarlı bir ID sağlar ve çift yönlü eşleşmelerin tek bir yerde tutulmasını garanti eder.

**Örnek Döküman ID'si:** `uid_user1_uid_user2`

**Döküman Şeması (`/matches/{matchId}`):**
```json
{
  "users": ["uid_user1", "uid_user2"], // Eşleşen kullanıcıların UID dizisi
  "matchedAt": "Firebase.Timestamp", // Eşleşmenin gerçekleştiği zaman
  "lastMessage": "Merhaba! Nasılsın?", // Sohbetteki son mesajın metni (denormalized)
  "lastMessageAt": "Firebase.Timestamp", // Son mesajın gönderildiği zaman (denormalized)
  "lastMessageSenderId": "uid_user1", // Son mesajı gönderen kullanıcı (denormalized)
  "unreadCount": {
    "uid_user1": 0, // user1 için okunmamış mesaj sayısı
    "uid_user2": 3  // user2 için okunmamış mesaj sayısı
  },
  "isActive": true // Eşleşme aktif mi? (Kullanıcılardan biri eşleşmeyi kaldırırsa false olabilir)
}
```

**Notlar:**
-   `lastMessage`, `lastMessageAt`, `lastMessageSenderId` ve `unreadCount` alanları **denormalize** edilmiştir. Bu, sohbet listesi ekranında çok sayıda dökümanı tek seferde ve verimli bir şekilde okumak için kritik öneme sahiptir.
-   Bu denormalize edilmiş alanlar, **Firebase Functions** aracılığıyla güncellenmelidir.

---

### `chats` Koleksiyonu

`chats` koleksiyonu, her bir eşleşmenin mesajlarını barındırır. Her döküman bir sohbeti temsil eder ve `messages` adında bir subcollection içerir.

**Döküman ID'si:** `matches` koleksiyonundaki `matchId` ile aynı olmalıdır.

**Koleksiyon Yapısı:** `/chats/{matchId}/messages/{messageId}`

### `messages` Subcollection'ı

Bu subcollection, bir sohbetteki tüm mesajları içerir. Her döküman tek bir mesajdır.

**Döküman Şeması (`/chats/{matchId}/messages/{messageId}`):**
```json
{
  "senderId": "uid_user1", // Mesajı gönderen kullanıcının UID'si
  "receiverId": "uid_user2", // Mesajı alan kullanıcının UID'si
  "text": "Bu bir test mesajıdır.", // Mesajın içeriği
  "createdAt": "Firebase.Timestamp", // Mesajın gönderildiği zaman
  "isRead": false, // Alıcı tarafından okunup okunmadığı
  "type": "text" // Mesaj tipi (gelecekte 'image', 'video' olabilir)
}
```

---

## 3. Güvenlik Kuralları (`firestore.rules`)

Bu veri modelini güvence altına almak için aşağıdaki Firestore kuralları uygulanmalıdır.

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // MATCHES: Sadece eşleşen kullanıcılar kendi eşleşme dökümanını okuyabilir.
    // Yazma işlemi sunucu (Firebase Functions) tarafından yapılmalıdır.
    match /matches/{matchId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.users;
      allow write: if false; // İstemciden yazmayı engelle
    }

    // MESSAGES: Sadece eşleşen kullanıcılar mesajları okuyabilir ve yeni mesaj gönderebilir.
    match /chats/{matchId}/messages/{messageId} {
      // Okuma izni: Eşleşen kullanıcılar tüm mesajları okuyabilir.
      allow read: if request.auth != null && get(/databases/$(database)/documents/matches/$(matchId)).data.users.hasAny([request.auth.uid]);

      // Yazma izni: Sadece gönderen kullanıcı yeni mesaj oluşturabilir.
      allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;

      // Güncelleme/Silme izni: Kullanıcılar sadece kendi gönderdikleri mesajları güncelleyebilir veya silebilir.
      allow update, delete: if request.auth != null && resource.data.senderId == request.auth.uid;
    }
  }
}
```
