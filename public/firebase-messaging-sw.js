// public/firebase-messaging-sw.js
// Ce fichier est le Service Worker Firebase Cloud Messaging.
// Il doit être placé à la racine du dossier 'public' de votre projet Next.js.

// Importez les SDK Firebase nécessaires pour le Service Worker via importScripts.
// Ces versions (compat) sont nécessaires pour les Service Workers qui n'utilisent pas de bundlers ES modules.
// Mettez à jour les versions si vous utilisez une version plus récente du SDK Firebase dans votre application.
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js');

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
  appId: "1:452609641286:web:7554de9163bb7a47d83347"
};

// Initialisez l'application Firebase dans le Service Worker
firebase.initializeApp(firebaseConfig);

// Récupérez une instance de Firebase Messaging afin qu'elle puisse gérer les messages d'arrière-plan.
const messaging = firebase.messaging();

// --- GESTION DES MESSAGES D'ARRIÈRE-PLAN ---
// Cette fonction est appelée lorsqu'un message FCM est reçu
// et que votre application web N'EST PAS au premier plan (ou est fermée).
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message d\'arrière-plan reçu :', payload);

  // Personnalisez la notification ici.
  // Les données sont généralement dans `payload.notification` pour le contenu visible
  // et `payload.data` pour les données personnalisées qui peuvent être lues par votre app.
  const notificationTitle = payload.notification?.title || 'Nouvelle notification de Tafsir App';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || '/firebase-logo.png', // Un chemin vers une icône dans votre dossier 'public'
    badge: payload.notification?.badge || '/firebase-badge.png', // Une petite icône sur Android
    data: payload.data, // Données personnalisées que vous pouvez récupérer au clic
    // Définit l'URL qui sera ouverte lorsque l'utilisateur clique sur la notification.
    // Par défaut, ouvre la racine de votre application.
    click_action: payload.data?.click_action || self.location.origin,
  };

  // Affichez la notification à l'utilisateur.
  // `self.registration` est une référence au ServiceWorkerRegistration.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- GESTION DES CLICS SUR LES NOTIFICATIONS ---
// Cet écouteur d'événement est appelé lorsque l'utilisateur clique sur une notification affichée par le Service Worker.
self.addEventListener('notificationclick', (event) => {
  // Ferme la notification après le clic.
  event.notification.close();

  // Récupère l'URL à ouvrir, si spécifiée dans les données de la notification.
  const clickAction = event.notification.data?.click_action || self.location.origin;

  // Ouvre une nouvelle fenêtre ou fait passer une fenêtre existante au premier plan.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true // Inclut les clients qui ne sont pas contrôlés par ce service worker
    }).then((clientList) => {
      // Tente de trouver un client (onglet/fenêtre) existant avec l'URL de destination.
      for (const client of clientList) {
        if (client.url === clickAction && 'focus' in client) {
          return client.focus(); // Met l'onglet existant au premier plan
        }
      }
      // Si aucun onglet existant n'est trouvé, ouvre une nouvelle fenêtre.
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
