const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onNewMatch = functions.firestore
  .document("users/{userId}/social/matches/{matchId}")
  .onCreate(async (snap, context) => {
    const matchData = snap.data();
    const userId = context.params.userId;
    const matchedUserId = matchData.matchedUserId;

    // Get the two users' data
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const matchedUserDoc = await admin
      .firestore()
      .doc(`users/${matchedUserId}`)
      .get();

    const userData = userDoc.data();
    const matchedUserData = matchedUserDoc.data();

    // Send a notification to the user who was liked
    if (matchedUserData.pushToken) {
      await admin.messaging().send({
        token: matchedUserData.pushToken,
        notification: {
          title: "You have a new match! 🎉",
          body: `${userData.firstName} liked you back!`,
        },
      });
    }
  });

exports.onNewMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const senderId = messageData.senderId;
    const receiverId = messageData.receiverId;
    const messageText = messageData.text;

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
  });
