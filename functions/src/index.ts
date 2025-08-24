// functions/src/index.ts

// Importez les modules nécessaires
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialisez le SDK Firebase Admin.
admin.initializeApp();

// Obtenez une référence à Firestore pour l'accès aux données.
const db = admin.firestore();

// Votre Project ID (pour la construction des chemins Firestore).
// C'est le même que votre `projectId` dans firebase.json ou dans la console Firebase.
const FIREBASE_PROJECT_ID = "tafsir-app-3b154";

// --- Définitions de types pour les données d'entrée des fonctions ---
interface NotificationData {
  title: string;
  body: string;
  payloadData?: { [key: string]: string }; // Données personnalisées, string key, string value
}

interface SpecificTokenNotificationData extends NotificationData {
  fcmToken: string;
}

interface MultipleUsersNotificationData extends NotificationData {
  targetUserIds?: string[]; // UID des utilisateurs cibles (optionnel)
}

// --- Optimisation : Mise en cache pour le chargement des paramètres ---
let cachedAppSettings: admin.firestore.DocumentData | undefined;
let lastFetchTime: number = 0;
const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes en millisecondes

/**
 * Récupère les paramètres de l'application depuis Firestore, avec un mécanisme de mise en cache.
 * Cet appel n'est pas bloquant au démarrage de la fonction, car il est appelé à la demande.
 * @returns {Promise<admin.firestore.DocumentData>} Les paramètres de l'application.
 */
async function getAppSettings(): Promise<admin.firestore.DocumentData> {
  const now = Date.now();
  // Vérifiez si les données sont déjà en cache et toujours valides
  if (cachedAppSettings && (now - lastFetchTime < CACHE_LIFETIME)) {
    console.log('Paramètres de l\'application récupérés depuis le cache.');
    return cachedAppSettings;
  }

  // Si non en cache ou expiré, chargez-les depuis Firestore
  console.log('Chargement des paramètres de l\'application depuis Firestore...');
  try {
    const settingsDoc = await db.collection('config').doc('appSettings').get();
    if (!settingsDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Les paramètres de l\'application sont introuvables dans Firestore.');
    }
    cachedAppSettings = settingsDoc.data();
    lastFetchTime = now;
    return cachedAppSettings!; // Le '!' affirme que ce n'est pas undefined
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres de l\'application:', error);
    throw new functions.https.HttpsError('internal', 'Impossible de charger les paramètres de l\'application.', (error as Error).message);
  }
}

// --- Cloud Function pour envoyer une notification à un token spécifique ---

/**
 * Cloud Function HTTPS Callable pour envoyer une notification FCM à un token d'appareil spécifique.
 * Cette fonction est conçue pour être appelée depuis votre application client.
 */
export const sendNotificationToSpecificToken = functions.https.onCall(
  async (request: functions.https.CallableRequest<SpecificTokenNotificationData>, context: functions.https.CallableContext) => {
    // 1. Vérification de l'authentification (TRÈS RECOMMANDÉ)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Seuls les utilisateurs authentifiés peuvent appeler cette fonction.');
    }

    // 2. Récupération et validation des données d'entrée
    const { fcmToken, title, body, payloadData } = request.data;

    if (!fcmToken || !title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Les arguments "fcmToken", "title" et "body" sont requis.');
    }

    // 3. Construction du message FCM
    const message: admin.messaging.Message = {
      notification: {
        title: title,
        body: body,
      },
      data: payloadData,
      token: fcmToken, // Cible le token spécifique
    };

    // 4. Envoi du message via Firebase Cloud Messaging
    try {
      const response = await admin.messaging().send(message);
      console.log('Notification envoyée avec succès au token:', fcmToken, 'Réponse FCM:', response);
      return { success: true, messageId: response };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la notification au token:', fcmToken, 'Erreur:', error);

      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/not-found') {
        console.warn(`Le token '${fcmToken}' n'est plus valide ou n'est pas enregistré. Il devrait être supprimé de Firestore.`);
      }
      throw new functions.https.HttpsError('internal', 'Échec de l\'envoi de la notification.', error.message);
    }
  }
);

// --- Cloud Function pour envoyer une notification à un groupe d'utilisateurs ---

/**
 * Cloud Function HTTPS Callable pour envoyer une notification FCM à un groupe d'utilisateurs.
 * Elle récupère les tokens des utilisateurs ciblés depuis Cloud Firestore.
 */
export const sendNotificationToMultipleUsers = functions.https.onCall(
  async (request: functions.https.CallableRequest<MultipleUsersNotificationData>, context: functions.https.CallableContext) => {
    // 1. Vérification de l'authentification (TRÈS RECOMMANDÉ)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Seuls les utilisateurs authentifiés peuvent appeler cette fonction.');
    }

    // 2. Récupération et validation des données d'entrée
    const { title, body, targetUserIds, payloadData } = request.data;

    if (!title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Les arguments "title" et "body" sont requis.');
    }

    // 3. Récupération des tokens d'enregistrement depuis Cloud Firestore
    let querySnapshot: admin.firestore.QuerySnapshot;

    if (targetUserIds && targetUserIds.length > 0) {
      const fcmTokenDocsPromises = targetUserIds.map(uid =>
        db.collection('artifacts').doc(FIREBASE_PROJECT_ID)
          .collection('users').doc(uid).collection('progress').doc('fcmToken').get()
      );
      const docs = await Promise.all(fcmTokenDocsPromises);
      querySnapshot = { docs: docs.filter(doc => doc.exists) } as admin.firestore.QuerySnapshot;
    } else {
      querySnapshot = await db.collectionGroup('progress')
                            .where(admin.firestore.FieldPath.documentId(), '==', 'fcmToken')
                            .get();
    }

    const registrationTokens: string[] = [];
    querySnapshot.forEach(docSnapshot => {
      const docData = docSnapshot.data();
      if (docData && typeof docData.token === 'string') {
        registrationTokens.push(docData.token);
      }
    });

    if (registrationTokens.length === 0) {
      console.log('Aucun token d\'enregistrement trouvé pour l\'envoi multicast.');
      return { success: true, message: 'Aucun token trouvé pour l\'envoi.' };
    }

    // 4. Construction du message multicast FCM
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: title,
        body: body,
      },
      data: payloadData,
      tokens: registrationTokens,
    };

    // 5. Envoi du message en mode multicast (jusqu'à 500 tokens par appel)
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Notifications envoyées en multicast. Succès:', response.successCount, 'Échecs:', response.failureCount);

      // 6. Nettoyage des tokens invalides (TRÈS IMPORTANT)
      const tokensToDelete: string[] = [];
      response.responses.forEach((resp, idx) => { // <-- CORRECTION ICI : 'resp.exception' devient 'resp.error'
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code; // Accède directement à 'code' sur l'objet 'FirebaseError'
          if (errorCode === 'messaging/invalid-argument' ||
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/not-found') {
            tokensToDelete.push(registrationTokens[idx]);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        console.warn(`Tentative de suppression de ${tokensToDelete.length} tokens invalides.`);
        const deletePromises = tokensToDelete.map(async (token) => {
          const tokenDocs = await db.collectionGroup('progress')
                                    .where(admin.firestore.FieldPath.documentId(), '==', 'fcmToken')
                                    .where('token', '==', token)
                                    .limit(1)
                                    .get();
          if (!tokenDocs.empty) {
            const docRef = tokenDocs.docs[0].ref;
            await docRef.delete();
            console.log(`Token supprimé : ${token} (référence: ${docRef.path})`);
          } else {
            console.warn(`Token invalide '${token}' non trouvé dans Firestore pour suppression.`);
          }
        });
        await Promise.all(deletePromises);
      }

      return { success: true, message: `Notifications envoyées. Succès: ${response.successCount}, Échecs: ${response.failureCount}. ${tokensToDelete.length} tokens nettoyés.` };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi multicast:', error);
      throw new functions.https.HttpsError('internal', 'Échec de l\'envoi multicast.', error.message);
    }
  }
);
