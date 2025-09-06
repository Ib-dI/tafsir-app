// hooks/use-fcm-token.ts
'use client'; 

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getToken, onMessage, getMessaging } from 'firebase/messaging';
import { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';

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

    const initializeFCM = async () => {
      try {
        // 1. Vérifier le support du navigateur
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
          throw new Error('Service Worker non supporté');
        }

        // 2. Vérifier/Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permission de notification refusée');
        }

        // 3. Enregistrer le service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        if (registration.installing) {
          await new Promise<void>((resolve) => {
            registration.installing?.addEventListener('statechange', () => {
              if (registration.active) resolve();
            });
          });
        }

        // 4. Initialiser l'instance de messaging
        const messagingInstance = getMessaging(getApp());

        // 5. Obtenir le token FCM
        const vapidKey = "BJQfmDAJlKEZrsAV9PHDp0NXkCAjp8mY94OD2ZG_-Xvpo6sqvhyfusnXPu2TM4YVNoXIAnp7BjVu8nEyTC3JSFY";
        const currentToken = await getToken(messagingInstance, {
          vapidKey,
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
        setTimeout(() => { initializeFCM(); }, 5000);
      }
    };

    initializeFCM();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { token, notification, error };
}