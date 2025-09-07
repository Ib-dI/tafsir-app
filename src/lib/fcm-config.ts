// lib/fcm-config.ts
export const FCM_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY as string;

export const initializeFCM = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // 1. Vérifier si un service worker existe déjà
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (existingRegistration?.active) {
      return existingRegistration;
    }

    // 2. Si non, enregistrer un nouveau service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    // 3. Attendre l'activation
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener('statechange', () => {
          if (registration.active) {
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du service worker:', error);
    return null;
  }
};
