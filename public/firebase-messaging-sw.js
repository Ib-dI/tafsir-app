// public/firebase-messaging-sw.js
// Ce fichier est le Service Worker Firebase Cloud Messaging.
// Il doit être placé à la racine du dossier 'public' de votre projet Next.js.

// Importez les SDK Firebase nécessaires pour le Service Worker via importScripts.
// Ces versions (compat) sont nécessaires pour les Service Workers qui n'utilisent pas de bundlers ES modules.
// Mettez à jour les versions si vous utilisez une version plus récente du SDK Firebase dans votre application.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');


// --- VOTRE CONFIGURATION FIREBASE ---
// Cette configuration DOIT CORRESPONDRE à celle que vous utilisez côté client.
// Elle doit être "en dur" ici car les variables d'environnement Next.js (process.env.NEXT_PUBLIC_...)
// ne sont PAS accessibles dans ce contexte de Service Worker.
const firebaseConfig = {
  apiKey: "AIzaSyAL-GlEdsrJqHnGIT0tyL7FoIKQMqllexU",
  authDomain: "tafsir-app-3b154.firebaseapp.com",
  projectId: "tafsir-app-3b154",
  storageBucket: "tafsir-app-3b154.firebasestorage.app",
  messagingSenderId: "452609641286",
  appId: "1:452609641286:web:7554de9163bb7a47d83347",
  measurementId: "G-W1KZYL9D0B"
};

// Initialise l'application Firebase DANS le service worker.
// On vérifie si elle n'est pas déjà initialisée pour éviter les erreurs.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Obtient l'instance du service de messagerie Firebase.
const messaging = firebase.messaging();

// --- Gestion des messages en arrière-plan ---
// Cette fonction est appelée lorsqu'un message FCM est reçu ET que l'application N'EST PAS au premier plan.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Reçu un message en arrière-plan ', payload);

  // Extrait les informations de la notification (titre, corps)
  const notificationTitle = payload.notification?.title || 'Nouveau Contenu Audio !';
  const notificationOptions = {
    body: payload.notification?.body || 'Cliquez pour écouter le dernier audio.',
    icon: '/firebase-logo.png', // Assurez-vous que cette image existe dans votre dossier public
    data: payload.data, // Permet de passer des données personnalisées à la notification
  };

  // Si le message contient un lien (défini par le backend dans webpush.fcm_options.link)
  // on l'ajoute aux données de la notification pour le gérer au clic.
  if (payload.fcmOptions && payload.fcmOptions.link) {
    notificationOptions.data = { ...notificationOptions.data, fcmLink: payload.fcmOptions.link };
  }

  // Affiche la notification à l'utilisateur.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- Gestion du clic sur la notification ---
// Cette fonction est appelée lorsque l'utilisateur clique sur la notification affichée par le service worker.
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Ferme la notification après le clic.

  const fcmLink = event.notification.data?.fcmLink;

  if (fcmLink) {
    // Si un lien FCM est présent, ouvre l'URL spécifiée.
    event.waitUntil(clients.openWindow(fcmLink));
  } else {
    // Sinon, ouvre la page d'accueil de votre application par défaut.
    event.waitUntil(clients.openWindow('/'));
  }
});