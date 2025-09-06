// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      caches.open('firebase-messaging-cache').then((cache) => {
        return cache.addAll([
          '/bismillah.png',
          '/fingerprint.webp'
        ]);
      })
    ])
  );
  console.log('Service Worker: Installation réussie');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== 'firebase-messaging-cache') {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
  console.log('Service Worker: Activation réussie');
});

// Initialisation de Firebase avec la configuration minimale requise pour FCM
firebase.initializeApp({
  apiKey: "AIzaSyAL-GlEdsrJqHnGIT0tyL7FoIKQMqllexU",
  projectId: "tafsir-app-3b154",
  messagingSenderId: "452609641286",
  appId: "1:452609641286:web:7554de9163bb7a47d83347"
});

const messaging = firebase.messaging();
console.log('Service Worker: Firebase Messaging initialisé avec succès');

// Configuration des options de notification par défaut
const notificationDefaults = {
  icon: '/bismillah.png',
  badge: '/fingerprint.webp',
  vibrate: [100, 50, 100],
  requireInteraction: true,
  silent: false
};
messaging.onBackgroundMessage(async (payload) => {
  console.log('Message reçu en arrière-plan:', payload);

  try {
    const notificationOptions = {
      ...notificationDefaults,
      title: payload.notification?.title || 'Nouveau Contenu Audio',
      body: payload.notification?.body || 'Nouveau contenu disponible !',
      data: payload.data || {},
      timestamp: Date.now(),
      actions: [
        {
          action: 'open',
          title: 'Écouter maintenant',
        },
        {
          action: 'close',
          title: 'Plus tard',
        }
      ],
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(notificationOptions.title, notificationOptions)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// --- Gestion du clic sur la notif ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const fcmLink = event.notification.data?.fcmLink;

  event.waitUntil(clients.openWindow(fcmLink || "/"));
});
