// hooks/use-fcm-token.ts
'use client'; 

import { FCM_VAPID_KEY, initializeFCM } from '@/lib/fcm-config';
import { db } from '@/lib/firebase';
import { getApp } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { useEffect, useState } from 'react';

interface NotificationPayload {
  notification?: {
    title: string;
    body: string;
  };
  data?: {
    [key: string]: string;
  };
}

export const useFcmToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const boot = async () => {
      try {
        // Pré-vérifications environnement
        if (typeof window === 'undefined') {
          throw new Error('Environnement non navigateur');
        }
        const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        if (!isSecureContext) {
          throw new Error('Le site doit être en HTTPS (ou localhost) pour FCM');
        }

        if (!FCM_VAPID_KEY) {
          throw new Error('VAPID key manquante (NEXT_PUBLIC_FIREBASE_VAPID_KEY)');
        }
        if (!FCM_VAPID_KEY.startsWith('B')) {
          throw new Error('VAPID key invalide (doit commencer par B)');
        }

        const supported = await isSupported().catch(() => false);
        if (!supported) {
          throw new Error('Firebase Messaging non supporté dans ce navigateur');
        }

        // 1. Initialiser/obtenir l'enregistrement du service worker partagé
        const registration = await initializeFCM();
        if (!registration) {
          throw new Error('Service Worker non initialisé');
        }

        // 2. Initialiser l'instance de messaging
        const messagingInstance = getMessaging(getApp());

        // 3. Obtenir le token FCM avec VAPID de l'environnement
        const currentToken = await getToken(messagingInstance, {
          vapidKey: FCM_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        if (!currentToken) throw new Error('Impossible d\'obtenir le token FCM');
        setToken(currentToken);

        // 6. Enregistrer le token dans Firestore
        try {
          const tokenDocRef = doc(db, 'fcmTokens', currentToken);
          await setDoc(tokenDocRef, {
            token: currentToken,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            active: true
          });
        } catch (firestoreError) {
          setError('Erreur lors de l\'enregistrement du token dans Firestore');
          console.log(firestoreError)
        }

        // 7. Ecouter les messages entrants
        unsubscribe = onMessage(messagingInstance, (payload) => {
          if (currentToken) {
            const tokenDocRef = doc(db, 'fcmTokens', currentToken);
            setDoc(tokenDocRef, { lastUsed: Date.now() }, { merge: true });
          }
          setNotification({
            notification: {
              title: payload.notification?.title ?? '',
              body: payload.notification?.body ?? ''
            },
            data: payload.data
          });
        });

      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erreur inconnue lors de l\'initialisation FCM');
        setTimeout(() => { boot(); }, 5000);
      }
    };

    boot();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { token, notification, error };
}