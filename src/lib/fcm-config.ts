// lib/fcm-config.ts
export const FCM_VAPID_KEY = "BJQfmDAJlKEZrsAV9PHDp0NXkCAjp8mY94OD2ZG_-Xvpo6sqvhyfusnXPu2TM4YVNoXIAnp7BjVu8nEyTC3JSFY";

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
      scope: '/'
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
