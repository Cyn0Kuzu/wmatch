# 💬 WMatch - Backend ve API Entegrasyon Raporu (Faz 1)

**Tarih:** 2025-11-08
**Öncelik:** 🔴 Kritik

---

## Executive Summary

Bu denetim, WMatch uygulamasının backend altyapısını, özellikle de mesajlaşma özelliği ve Firebase Functions entegrasyonunu analiz etmektedir. Mevcut durumda, mesajlaşma arayüzü (UI) tamamlanmış olmasına rağmen, bu arayüzü destekleyecek güvenilir ve ölçeklenebilir bir backend yapısı eksiktir.

Ana sorun, kritik bir iş mantığı olan "son mesaj" bilgisinin güncellenmesinin, istemci (client) tarafında, güvenli olmayan ve atomik olmayan bir şekilde yapılmaya çalışılmasıdır. Bu, veri tutarsızlığına, performans sorunlarına ve güvenlik risklerine yol açmaktadır.

Bu raporda, mevcut durum analiz edilmekte ve eksik olan mesajlaşma backend'inin **Firebase Functions** kullanılarak nasıl güvenli, verimli ve merkezi bir şekilde implemente edileceğine dair detaylı bir yol haritası sunulmaktadır.

---

## 1. Mevcut Durum Analizi

-   **Frontend (`MessageScreen.tsx`):** Mesajlaşma ekranı, gerçek zamanlı mesaj akışı ve her sohbet için bir "son mesaj" önizlemesi gösterecek şekilde tasarlanmıştır. Bu önizleme, `lastMessage` ve `lastMessageAt` gibi denormalize edilmiş verilere dayanmaktadır.
-   **Client-Side Servis (`MessageService.ts`):** Yeni bir mesaj gönderildiğinde, servis mesajı `chats/{chatId}/messages` subcollection'ına doğru bir şekilde kaydetmektedir.
-   **Backend Boşluğu (`FirestoreService.ts`):** `MessageService`, mesajı kaydettikten sonra `FirestoreService.updateLastMessage` fonksiyonunu çağırmaktadır. Bu fonksiyon, hem gönderenin hem de alıcının kullanıcı dökümanlarındaki `matches` dizisini okumakta, ilgili eşleşmeyi bulup güncellemekte ve ardından bu iki dökümanı ayrı ayrı geri yazmaktadır.

---

## 🔴 P0 - Kritik Sorun: İstemci Taraflı Veri Güncelleme Mantığı

### Sorun Tanımı

`FirestoreService.updateLastMessage` fonksiyonunun istemci tarafında çalışması, ciddi mimari ve güvenlik sorunları yaratmaktadır:

1.  **Güvenlik Riski:** Bu işlemin çalışabilmesi için, bir kullanıcının (mesaj gönderen) başka bir kullanıcının (mesaj alan) dökümanı üzerinde **yazma iznine** sahip olması gerekir. Bu, Firestore güvenlik kurallarında tehlikeli bir gedik açar ve kötü niyetli bir kullanıcının, diğer kullanıcıların verilerini manipüle etmesine olanak tanır.
2.  **Atomik Olmayan İşlemler:** İşlem, birden fazla okuma (iki kullanıcı dökümanı) ve birden fazla yazma işleminden oluşur. Bu adımlardan herhangi birinde bir ağ hatası veya başka bir sorun oluşursa, veri tutarsızlığı meydana gelir. Örneğin, gönderenin dökümanı güncellenip alıcınınki güncellenmeyebilir.
3.  **Performans ve Verimsizlik:** Bu mantık, her mesaj gönderiminde istemcinin birden fazla Firestore okuma/yazma işlemi yapmasını gerektirir. Bu, hem istemci kaynaklarını tüketir hem de Firestore kullanım maliyetlerini artırır.
4.  **Sürdürülebilirlik Zorluğu:** İş mantığı istemciye dağıtıldığı için, gelecekte bu mantığı (örneğin, okunmamış mesaj sayacını eklemek gibi) güncellemek, tüm istemci uygulamalarının güncellenmesini gerektirir ve hataya açıktır.

---

## 2. Önerilen Çözüm: Firebase Functions ile Sunucu Taraflı İş Mantığı

Mevcut `functions/index.js` dosyasında bulunan `onNewMessage` trigger'ı, bu sorunu çözmek için mükemmel bir başlangıç noktasıdır. Bu fonksiyon, her yeni mesaj oluşturulduğunda otomatik olarak tetiklenir.

**Öneri:** `FirestoreService.updateLastMessage` fonksiyonunu **tamamen kaldırın** ve bu iş mantığını `onNewMessage` Firebase Function'ına taşıyın.

### Avantajları:

-   **Güvenlik:** İşlemler, Firebase Admin SDK'sı kullanılarak sunucu tarafında yapılır. Bu, istemcilerin birbirlerinin verilerine yazma izni olmadan işlemin güvenli bir şekilde gerçekleştirilmesini sağlar. Firestore kurallarınız çok daha sıkı ve güvenli hale gelir.
-   **Atomiklik ve Tutarlılık:** Tüm güncelleme işlemleri tek bir sunucu taraflı işlem içinde yönetilebilir. Firestore `batch` veya `transaction` kullanarak, iki kullanıcının dökümanının da atomik olarak güncellenmesi garanti altına alınabilir.
-   **Merkezi Mantık:** İş mantığı tek bir yerde (Firebase Function) bulunur. Gelecekte yapılacak değişiklikler (örneğin, okunmamış mesaj sayısını artırma) sadece bu fonksiyonun güncellenmesiyle kolayca yapılabilir.
-   **Performans:** İstemci, sadece mesajı göndermekle sorumlu olur. Ağır ve maliyetli güncelleme işlemlerini sunucu üstlenir.

---

## 3. Implementasyon Planı

### Adım 1: `FirestoreService.updateLastMessage` Fonksiyonunu Kaldır

-   `src/services/FirestoreService.ts` dosyasından `updateLastMessage` fonksiyonunu silin.
-   `src/services/MessageService.ts` dosyasındaki `sendMessage` fonksiyonundan `this.firestoreService.updateLastMessage(...)` çağrısını kaldırın.

### Adım 2: `onNewMessage` Firebase Function'ını Genişlet

-   `functions/index.js` dosyasındaki `onNewMessage` fonksiyonuna, "son mesaj" güncelleme mantığını ekleyin.

    ```javascript
    // functions/index.js
    const functions = require("firebase-functions");
    const admin = require("firebase-admin");

    admin.initializeApp();

    // ... (diğer fonksiyonlar)

    exports.onNewMessage = functions.firestore
      .document("chats/{chatId}/messages/{messageId}")
      .onCreate(async (snap, context) => {
        const messageData = snap.data();
        const senderId = messageData.senderId;
        const receiverId = messageData.receiverId;
        const messageText = messageData.text;
        const createdAt = messageData.createdAt;

        // 1. Push Notification Gönderme (Mevcut Kod)
        const receiverDoc = await admin.firestore().doc(`users/${receiverId}`).get();
        const senderDoc = await admin.firestore().doc(`users/${senderId}`).get();

        const receiverData = receiverDoc.data();
        const senderData = senderDoc.data();

        if (receiverData.pushToken) {
          await admin.messaging().send({
            token: receiverData.pushToken,
            notification: {
              title: `New message from ${senderData.firstName}`,
              body: messageText,
            },
          });
        }

        // 2. YENİ: "Son Mesaj" Bilgisini Atomik Olarak Güncelle
        const db = admin.firestore();
        const batch = db.batch();

        const senderRef = db.doc(`users/${senderId}`);
        const receiverRef = db.doc(`users/${receiverId}`);

        // Gönderenin dökümanını güncelle
        if (senderData.social && Array.isArray(senderData.social.matches)) {
            const updatedSenderMatches = senderData.social.matches.map(match =>
                match.matchedUserId === receiverId
                    ? { ...match, lastMessage: messageText, lastMessageAt: createdAt }
                    : match
            );
            batch.update(senderRef, { "social.matches": updatedSenderMatches });
        }

        // Alıcının dökümanını güncelle
        if (receiverData.social && Array.isArray(receiverData.social.matches)) {
            const updatedReceiverMatches = receiverData.social.matches.map(match =>
                match.matchedUserId === senderId
                    ? { ...match, lastMessage: messageText, lastMessageAt: createdAt }
                    : match
            );
            batch.update(receiverRef, { "social.matches": updatedReceiverMatches });
        }

        // Batch işlemini tamamla
        await batch.commit();
      });
    ```

### Adım 3: Firebase Functions'ı Deploy Et

-   `firebase-tools` CLI kullanarak güncellenmiş fonksiyonu deploy edin:
    ```bash
    cd functions
    npm install
    firebase deploy --only functions
    ```
