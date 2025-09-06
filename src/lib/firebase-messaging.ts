// lib/firebase-messaging.ts
import { getApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

let messagingInstance: any = null;

export const initializeMessaging = async () => {
  try {
    if (!messagingInstance) {
      messagingInstance = getMessaging(getApp());
    }
    return messagingInstance;
  } catch (error) {
    console.error('Erreur d\'initialisation de messaging:', error);
    return null;
  }
};

export const getMessagingToken = async (registration: ServiceWorkerRegistration) => {
  try {
    const messaging = await initializeMessaging();
    if (!messaging) {
      throw new Error('Messaging non initialisé');
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      throw new Error('Clé VAPID manquante');
    }

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      throw new Error('Token non généré');
    }

    return currentToken;
  } catch (error) {
    console.error('Erreur d\'obtention du token:', error);
    throw error;
  }
};
