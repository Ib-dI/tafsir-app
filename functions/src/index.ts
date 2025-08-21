/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import { HttpsOptions, onCall } from "firebase-functions/v2/https";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Initialiser l'application admin
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
    // Récupérer tous les tokens FCM
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('Aucun token FCM trouvé');
      return { success: false, error: 'Aucun destinataire trouvé' };
    }

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
    };

    // Envoyer la notification à tous les tokens
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    const response = await admin.messaging().sendMulticast({
      tokens,
      ...message,
    });

    console.log('Résultat de l\'envoi:', response);
    return { success: true, results: response.responses };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    throw new Error('Échec de l\'envoi des notifications');
  }
});
