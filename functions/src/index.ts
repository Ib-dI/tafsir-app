import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import { HttpsOptions, onCall } from "firebase-functions/v2/https";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

const corsOptions = {
  maxInstances: 10,
  region: 'us-central1',
  cors: true
} satisfies HttpsOptions;

export const sendNewAudioNotification = onCall(corsOptions, async (request) => {
  const { audioTitle } = request.data;

  if (!audioTitle) {
    throw new Error("Le titre de l'audio est requis");
  }

  try {
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('Aucun token FCM trouvé');
      return { success: false, error: 'Aucun destinataire trouvé' };
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    
    const message = {
      notification: {
        title: 'Nouveau contenu disponible !',
        body: `Un nouvel audio "${audioTitle}" est maintenant disponible.`,
      },
      webpush: {
        notification: {
          icon: '/fingerprint.webp',
        },
      },
      tokens: tokens, // The tokens array is included here
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log('Résultat de l\'envoi:', response);
    return { success: true, results: response.responses };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    throw new Error('Échec de l\'envoi des notifications');
  }
});