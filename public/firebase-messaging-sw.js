importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = self.firebaseConfig || {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('[SW] Initialisation Firebase Messaging...');

try {
  // Initialiser Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Initialiser Messaging
  const messaging = firebase.messaging();
  console.log('[SW] Firebase Messaging initialisé');

  // Gestion des messages en arrière-plan
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Message reçu:', payload);

    const notificationTitle = payload.notification?.title || 'Nouveau message';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/fingerprint.webp',
      badge: '/fingerprint.webp',
      data: payload.data || {}
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  console.log('[SW] Service Worker configuré');

} catch (error) {
  console.error('[SW] Erreur:', error);
}

// Gestion minimaliste des événements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    self.firebaseConfig = event.data.config;
    console.log('[SW] Configuration Firebase reçue');
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});