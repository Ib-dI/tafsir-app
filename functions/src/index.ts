// functions/src/index.ts

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialisation simple de Firebase Admin
initializeApp();

const db = getFirestore();
const messaging = getMessaging();

const FIREBASE_PROJECT_ID = "tafsir-app-3b154";

// Types pour les données
interface NotificationData {
  title: string;
  body: string;
  payloadData?: { [key: string]: string };
}

interface MultipleUsersNotificationData extends NotificationData {
  targetUserIds?: string[];
}

// Function 2: Envoyer une notification à plusieurs utilisateurs
export const sendNotificationToMultipleUsers = onCall(
  { timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    // Vérification de l'authentification
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const data = request.data as MultipleUsersNotificationData;
    const { title, body, targetUserIds, payloadData } = data;

    // Validation des données
    if (!title || !body) {
      throw new HttpsError('invalid-argument', 'title and body are required');
    }

    try {
      // Récupération des tokens
      let tokens: string[] = [];

      if (targetUserIds && targetUserIds.length > 0) {
        // Récupération ciblée
        const promises = targetUserIds.map(uid =>
          db.collection('artifacts').doc(FIREBASE_PROJECT_ID)
            .collection('users').doc(uid).collection('progress').doc('fcmToken').get()
        );
        
        const docs = await Promise.all(promises);
        tokens = docs
          .filter(doc => doc.exists)
          .map(doc => doc.data()?.token)
          .filter(token => typeof token === 'string');
      } else {
        // Récupération de tous les tokens (limitée)
        const snapshot = await db.collectionGroup('progress')
          .where('__name__', '==', 'fcmToken')
          .limit(500)
          .get();

        tokens = snapshot.docs
          .map(doc => doc.data().token)
          .filter(token => typeof token === 'string');
      }

      if (tokens.length === 0) {
        return { success: true, message: 'No tokens found' };
      }

      // Envoi des notifications
      const message = {
        notification: { title, body },
        data: payloadData || {},
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`Sent ${response.successCount}/${tokens.length} notifications`);

      // Nettoyage simple des tokens invalides
      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (!result.success && result.error) {
          const errorCode = result.error.code;
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      // Suppression asynchrone (sans attendre)
      if (invalidTokens.length > 0) {
        console.log(`Scheduling cleanup of ${invalidTokens.length} invalid tokens`);
        
        // Exécution en arrière-plan
        setTimeout(async () => {
          try {
            for (const token of invalidTokens) {
              const tokenQuery = await db.collectionGroup('progress')
                .where('__name__', '==', 'fcmToken')
                .where('token', '==', token)
                .limit(1)
                .get();
              
              if (!tokenQuery.empty) {
                await tokenQuery.docs[0].ref.delete();
              }
            }
            console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
          } catch (error) {
            console.error('Cleanup error:', error);
          }
        }, 100);
      }

      return {
        success: true,
        message: `Sent ${response.successCount} notifications`,
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length
      };

    } catch (error: any) {
      console.error('Error sending multicast:', error);
      throw new HttpsError('internal', 'Failed to send notifications', error.message);
    }
  }
);