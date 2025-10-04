// lib/fcm-config.ts
'use client';

export const FCM_VAPID_KEY = "BCf9C1oFQIL59fnJT9cM4e9VAIhLdH87Bsdw-LuicluBLr4JxiNw6asfbCUfvf5HHEizPaDmLyMJrO2v77W7zNY"; // À remplacer par votre clé VAPID

export const initializeFCM = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('❌ Service Worker non supporté par ce navigateur');
    return null;
  }

  try {
    console.log('🔵 Enregistrement du Service Worker...');
    
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    
    console.log('✅ Service Worker enregistré:', registration);
    
    // Attendre que le SW soit prêt
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker prêt');
    
    return registration;
  } catch (error) {
    console.error('❌ Erreur d\'enregistrement du Service Worker:', error);
    return null;
  }
};