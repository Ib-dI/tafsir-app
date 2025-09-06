// lib/firebase.ts
'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from "firebase/messaging";
import { FCM_VAPID_KEY, initializeFCM } from './fcm-config';

const firebaseConfig = {
  apiKey: "AIzaSyAL-GlEdsrJqHnGIT0tyL7FoIKQMqllexU",
  authDomain: "tafsir-app-3b154.firebaseapp.com",
  projectId: "tafsir-app-3b154",
  storageBucket: "tafsir-app-3b154.appspot.com",
  messagingSenderId: "452609641286",
  appId: "1:452609641286:web:7554de9163bb7a47d83347"
};

// Initialisation de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Configuration de la messagerie Firebase
const initializeMessaging = async () => {
  try {
    // 1. Initialiser le service worker
    const registration = await initializeFCM();
    if (!registration) {
      throw new Error('Service Worker non initialisé');
    }

    // 2. Obtenir l'instance de messaging
    const messagingInstance = getMessaging(app);

    // 3. Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission refusée');
    }

    // 4. Obtenir le token
    const currentToken = await getToken(messagingInstance, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return currentToken;
  } catch (error) {
    console.error('Erreur d\'initialisation FCM:', error);
    return null;
  }
};

export { app, auth, db, initializeMessaging };

