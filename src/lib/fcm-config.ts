// lib/fcm-config.ts
const rawVapid = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();
export const FCM_VAPID_KEY = rawVapid.replace(/^"|"$/g, '');

export const initializeFCM = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[FCM] SW non supporté dans cet environnement');
    return null;
  }

  try {
    // 1. Vérifier si un service worker existe déjà
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!FCM_VAPID_KEY) {
      console.warn('[FCM] VAPID absente (NEXT_PUBLIC_FIREBASE_VAPID_KEY)');
    } else {
      console.log('[FCM] VAPID présente, prefix:', FCM_VAPID_KEY.substring(0, 1));
    }
    
    if (existingRegistration?.active) {
      console.log('[FCM] SW existant actif détecté:', existingRegistration.scope);
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
            console.log('[FCM] SW activé');
            resolve();
          }
        });
      });
    }

    console.log('[FCM] SW enregistré avec succès:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du service worker:', error);
    return null;
  }
};
