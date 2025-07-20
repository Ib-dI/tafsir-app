// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Ces variables doivent être définies dans votre fichier .env.local
// et préfixées par NEXT_PUBLIC_
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Décommentez si Analytics est activé
};

// Vérifie si Firebase a déjà été initialisé pour éviter les erreurs en mode dev
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Obtient les instances des services Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Exporte les instances pour qu'elles puissent être importées et utilisées ailleurs
export { app, auth, db };

console.log("Firebase initialized in src/lib/firebase.ts");
console.log("Firebase Config (from .env.local):", firebaseConfig.projectId); // Log pour vérifier le projectId
