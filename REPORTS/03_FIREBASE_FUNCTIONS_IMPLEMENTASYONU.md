# 🔥 WMatch - Firebase Functions Implementasyon Rehberi

**Tarih:** 2025-11-08

---

## 1. Genel Bakış

Bu belge, WMatch uygulamasının backend iş mantığını sunucu tarafına taşımak için Firebase Functions'ın nasıl kullanılacağını detaylandırmaktadır. İstemci tarafında (client-side) yapılan ve güvenlik, performans, veri tutarlılığı açısından riskler barındıran işlemler, sunucuda (server-side) çalışan, olay-tetiklemeli (event-triggered) fonksiyonlara dönüştürülecektir.

Bu rehber, iki ana fonksiyonun implementasyonuna odaklanacaktır:
1.  **`onNewMessage`**: Yeni bir mesaj gönderildiğinde tetiklenerek denormalize edilmiş verileri (son mesaj, okunmamış mesaj sayısı vb.) günceller ve push notification gönderir.
2.  **`onNewMatch`**: Yeni bir eşleşme oluştuğunda tetiklenerek kullanıcılara push notification gönderir.

---

## 2. Kurulum ve Yapılandırma

### Gerekli Araçlar:

-   Node.js (LTS versiyonu önerilir)
-   Firebase CLI: `npm install -g firebase-tools`

### Proje Kurulumu:

1.  **Firebase Projesine Giriş Yap:**
    ```bash
    firebase login
    ```

2.  **Functions Başlatma (Eğer mevcut değilse):** Proje kök dizininde, aşağıdaki komutu çalıştırın ve `TypeScript` seçeneğini seçin. `functions` klasörü ve temel dosyalar oluşturulacaktır.
    ```bash
    firebase init functions
    ```
    *Not: Projede `functions` klasörü zaten mevcut, bu nedenle bu adım atlanabilir. Sadece `package.json` bağımlılıklarını kontrol edin.*

3.  **Gerekli Bağımlılıkları Yükle:** `functions` klasörüne gidin ve `firebase-admin` ile `firebase-functions`'ın en güncel versiyonlarının yüklü olduğundan emin olun.
    ```bash
    cd functions
    npm install firebase-admin firebase-functions
    ```

---

## 3. `onNewMessage` Fonksiyonunun Implementasyonu

Bu fonksiyon, `/chats/{chatId}/messages/{messageId}` yoluna yeni bir döküman eklendiğinde tetiklenir.

**Amaç:**
-   Eşleşen kullanıcıların dökümanlarındaki `lastMessage` ve `lastMessageAt` alanlarını atomik olarak güncellemek.
-   Mesajı alan kullanıcıya bir push notification göndermek.

**`functions/index.js` Kodu:**

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.onNewMessage = functions.region("europe-west1").firestore // Örnek: Bölge seçimi
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const { senderId, receiverId, text, createdAt } = messageData;
    const { chatId } = context.params;

    // 1. "Son Mesaj" bilgilerini `matches` koleksiyonunda güncelle
    const matchRef = db.collection("matches").doc(chatId);

    try {
        await matchRef.update({
            lastMessage: text,
            lastMessageAt: createdAt,
            lastMessageSenderId: senderId,
            // Okunmamış mesaj sayacını artır (atomik işlem)
            [`unreadCount.${receiverId}`]: admin.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error(`Failed to update match document ${chatId}:`, error);
    }

    // 2. Alıcıya Push Notification gönder
    const receiverDoc = await db.collection("users").doc(receiverId).get();
    const senderDoc = await db.collection("users").doc(senderId).get();

    if (!receiverDoc.exists || !senderDoc.exists) {
        console.error("Sender or receiver not found.");
        return;
    }

    const receiverData = receiverDoc.data();
    const senderData = senderDoc.data();

    // Alıcının push token'ı varsa ve bildirim ayarları açıksa...
    if (receiverData.pushToken && receiverData.settings?.notifications) {
      const payload = {
        notification: {
          title: `Yeni mesajınız var: ${senderData.firstName || senderData.username}`,
          body: text.length > 100 ? `${text.substring(0, 97)}...` : text,
        },
        token: receiverData.pushToken,
        data: {
            chatId: chatId,
            senderId: senderId
        }
      };

      try {
        await admin.messaging().send(payload);
      } catch (error) {
          console.error("Failed to send push notification:", error);
      }
    }
  });
```

---

## 4. `onNewMatch` Fonksiyonunun Implementasyonu

Bu fonksiyon, `/matches/{matchId}` yoluna yeni bir döküman eklendiğinde tetiklenir.

**Amaç:**
-   Eşleşen her iki kullanıcıya da yeni bir eşleşmeleri olduğuna dair push notification göndermek.

**`functions/index.js` Kodu:**

```javascript
// ... (mevcut kodun devamı)

exports.onNewMatch = functions.region("europe-west1").firestore
  .document("matches/{matchId}")
  .onCreate(async (snap, context) => {
    const matchData = snap.data();
    const [userId1, userId2] = matchData.users;

    // Her iki kullanıcının da verilerini al
    const user1Doc = await db.collection("users").doc(userId1).get();
    const user2Doc = await db.collection("users").doc(userId2).get();

    if (!user1Doc.exists || !user2Doc.exists) {
        console.error("One or both users in the match not found.");
        return;
    }

    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();

    // Kullanıcı 1'e bildirim gönder
    if (user1Data.pushToken) {
        await admin.messaging().send({
            token: user1Data.pushToken,
            notification: {
                title: "Yeni bir eşleşmen var! 🎉",
                body: `${user2Data.firstName || user2Data.username} ile eşleştin.`,
            },
            data: {
                matchId: context.params.matchId,
                matchedUserId: userId2
            }
        });
    }

    // Kullanıcı 2'ye bildirim gönder
    if (user2Data.pushToken) {
        await admin.messaging().send({
            token: user2Data.pushToken,
            notification: {
                title: "Yeni bir eşleşmen var! 🎉",
                body: `${user1Data.firstName || user1Data.username} ile eşleştin.`,
            },
            data: {
                matchId: context.params.matchId,
                matchedUserId: userId1
            }
        });
    }
  });
```

---

## 5. Deployment (Yayınlama)

1.  **Kodun Doğruluğunu Kontrol Et:** `functions` klasöründeyken, lint komutuyla kodunuzu kontrol edin.
    ```bash
    npm run lint
    ```

2.  **Fonksiyonları Deploy Et:**
    ```bash
    firebase deploy --only functions
    ```

**Önemli Not:** Production ortamına deploy etmeden önce, `Firebase Emulators` kullanarak fonksiyonlarınızı lokalde test etmeniz şiddetle tavsiye edilir. Bu, canlı veriyi etkilemeden hataları ayıklamanızı sağlar.
