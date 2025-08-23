// src/lib/notifications.ts
import { doc, setDoc } from 'firebase/firestore';
// import { getFunctions, httpsCallable } from 'firebase/functions';
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
    
    // Le SDK gère l'enregistrement du Service Worker
    const messaging = getMessaging();
    
    // Obtenir le token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
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
    const url = 'https://us-central1-tafsir-app-3b154.cloudfunctions.net/sendNewAudioNotification';
    const body = { audioTitle };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(`Notification manuelle envoyée avec succès pour le titre : "${audioTitle}"`);
    } else {
      console.error("Échec de l'envoi de la notification. Statut :", response.status);
    }

  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification :", error);
  }
};

export const debugServiceWorker = async (): Promise<void> => {
  console.log('=== DEBUG SERVICE WORKER ===');
  
  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('SW ready:', registration);
    
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