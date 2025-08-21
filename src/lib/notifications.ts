// src/lib/notifications.ts
import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { db } from './firebase';

export const testFirebaseConfig = async (): Promise<void> => {
  console.log('=== DIAGNOSTIC FIREBASE ===');
  
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  console.log('VAPID Key présente:', !!vapidKey);
  console.log('VAPID Key valide:', vapidKey?.startsWith('B') ? 'OUI' : 'NON');
  console.log('Longueur VAPID:', vapidKey?.length);
  
  try {
    const supported = await isSupported();
    console.log('Messaging supporté:', supported);
  } catch (error) {
    console.error('Erreur support:', error);
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Nombre de SW:', registrations.length);
  }

  console.log('Permission:', Notification.permission);
  console.log('=== FIN DIAGNOSTIC ===');
};

export const saveMessagingToken = async (anonymousUserId: string): Promise<void> => {
  console.log('🚀 Démarrage saveMessagingToken');

  try {
    // Vérifications rapides
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') {
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      throw new Error('VAPID key manquante');
    }

    console.log('✅ VAPID key OK');

    // Enregistrement du Service Worker avec configuration
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    // Attendre que le Service Worker soit actif
    await registration.update();
    if (registration.active) {
      registration.active.postMessage({ 
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig 
      });
    }

    console.log('✅ Service Worker enregistré');

    // Attendre que le SW soit prêt
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker)?.state === 'activated') {
            resolve();
          }
        });
      });
    }

    const messaging = getMessaging();
    
    // Obtenir le token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ Token FCM obtenu');
      
      // Sauvegarder le token
      const tokenDocRef = doc(db, 'fcmTokens', anonymousUserId);
      await setDoc(tokenDocRef, { 
        token, 
        userId: anonymousUserId,
        timestamp: new Date()
      }, { merge: true });
      
      console.log('💾 Token sauvegardé');
    }

  } catch (error) {
    console.error('❌ Erreur saveMessagingToken:', error);
    throw error;
  }
};

export const sendManualNotification = async (audioTitle: string): Promise<void> => {
  try {
    const functions = getFunctions(undefined, 'us-central1');
    const sendNotification = httpsCallable(functions, 'sendNewAudioNotification');
    await sendNotification({ audioTitle });
    console.log('📨 Notification envoyée');
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
  }
};
// Ajoutez cette fonction dans notifications.ts
export const debugServiceWorker = async (): Promise<void> => {
  console.log('=== DEBUG SERVICE WORKER ===');
  
  try {
    // Essayer de récupérer le SW existant
    const registration = await navigator.serviceWorker.ready;
    console.log('SW ready:', registration);
    
    // Essayer sans spécifier le serviceWorkerRegistration
    const messaging = getMessaging();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    
    if (vapidKey) {
      const token = await getToken(messaging, { vapidKey });
      console.log('Token sans SW registration:', token);
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
};