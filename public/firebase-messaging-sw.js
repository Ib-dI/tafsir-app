// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAL-GlEdsrJqHnGIT0tyL7FoIKQMqllexU",
  authDomain: "tafsir-app-3b154.firebaseapp.com",
  projectId: "tafsir-app-3b154",
  storageBucket: "tafsir-app-3b154.appspot.com",
  messagingSenderId: "452609641286",
  appId: "1:452609641286:web:7554de9163bb7a47d83347"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Gestion des notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Message reçu en arrière-plan:', payload);

  const notificationTitle = payload.notification?.title || 'Nouveau contenu';
  const notificationOptions = {
    body: payload.notification?.body || 'Un nouveau contenu audio est disponible',
    icon: '/icon-192x192.png', // Ajoutez votre icône
    badge: '/badge-72x72.png',
    tag: 'audio-notification',
    requireInteraction: false,
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('Notification cliquée:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});