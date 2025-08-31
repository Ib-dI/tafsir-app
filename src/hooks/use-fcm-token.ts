// hooks/use-fcm-token.ts
'use client'; 

import { useEffect, useState } from 'react';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase'; // Assurez-vous que le chemin est correct

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

  useEffect(() => {
    const initializeFCM = async () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          // Attendre que messaging soit disponible
          const messagingInstance = typeof messaging === 'function' ? await messaging() : messaging;
          
          if (!messagingInstance) {
            console.warn('Firebase Messaging non disponible');
            return;
          }

          // Enregistrement du service worker pour FCM
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker enregistré avec succès:', registration);
          
          // Demander la permission de notification
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            console.log('Permission de notification accordée.');
            
            try {
              // Générer le token FCM
              const currentToken = await getToken(messagingInstance, { 
                serviceWorkerRegistration: registration, 
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Remplacez par votre clé VAPID
              });
              
              if (currentToken) {
                console.log('FCM Token:', currentToken);
                setToken(currentToken);
                
                // Stockez le token dans Firestore
                const tokenDocRef = doc(db, 'fcmTokens', currentToken);
                await setDoc(tokenDocRef, { 
                  token: currentToken, 
                  timestamp: Date.now() 
                }, { merge: true });
                
                console.log('Token enregistré dans Firestore.');
              } else {
                console.warn('Aucun token d\'enregistrement disponible. Demandez la permission de notification.');
              }
            } catch (err) {
              console.error('Erreur lors de l\'obtention du token FCM:', err);
            }
          } else {
            console.warn('Permission de notification refusée.');
          }

          // Gérer les messages reçus lorsque l'application est au premier plan
          const unsubscribe = onMessage(messagingInstance, (payload) => {
            console.log('Message reçu au premier plan :', payload);
            setNotification({
              notification: {
                title: payload.notification?.title || 'Nouveau message',
                body: payload.notification?.body || '',
              },
              data: payload.data,
            });
          });

          // Retourner la fonction de nettoyage
          return unsubscribe;
          
        } catch (error) {
          console.error('Erreur lors de l\'initialisation FCM:', error);
        }
      }
    };

    let unsubscribe: (() => void) | undefined;
    
    initializeFCM().then((cleanup) => {
      unsubscribe = cleanup;
    });

    // Fonction de nettoyage
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { token, notification };
};