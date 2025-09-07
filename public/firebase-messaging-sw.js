// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAL-GlEdsrJqHnGIT0tyL7FoIKQMqllexU",
  projectId: "tafsir-app-3b154",
  messagingSenderId: "452609641286",
  appId: "1:452609641286:web:7554de9163bb7a47d83347"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez reçu une nouvelle notification.',
    icon: '/bismillah.png',
    badge: '/fingerprint.webp',
    data: payload.data || {},
    actions: [
      {
        action: 'listen',
        title: 'Écouter maintenant'
      }
    ]
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
