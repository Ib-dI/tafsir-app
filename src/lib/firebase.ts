// lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services that are safe for both client and server
const auth = getAuth(app);
const db = getFirestore(app);

const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export const fetchToken = async () => {
  try {
    const fcmMessaging = await messaging();
    if (fcmMessaging) {
      // Étape cruciale : enregistrer le service worker avant d'obtenir le token.
      // Le chemin d'accès doit être celui où se trouve votre fichier service worker.
      const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(fcmMessaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        // Passer l'enregistrement du service worker à la fonction getToken.
        serviceWorkerRegistration: serviceWorkerRegistration,
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error("An error occurred while fetching the token:", err);
    return null;
  }
};

// Export serverTimestamp for consistency
export { app, db, auth, serverTimestamp, messaging };

// You must handle getMessaging() in a client-side component like NotificationManager.tsx
