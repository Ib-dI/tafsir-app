// functions/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// import { audiosTafsir } from "@/lib/data/audios";

admin.initializeApp();

exports.sendNewAudioNotification = functions.https.onCall(async (data, context) => {
  const audioTitle = data.data?.audioTitle || 'Nouvel audio disponible';
  
  const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
  const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
  
  const message = {
    notification: {
      title: 'Nouveau Tafsir Audio !',
      body: `Un nouvel audio de tafsir sur "${audioTitle}" vient d'être ajouté.`,
    },
    tokens: tokens,
  };
  
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log('Message envoyé avec succès :', response);
  
  return { success: true };
});