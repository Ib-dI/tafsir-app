// src/components/NotificationsSetup.tsx
'use client';

import { saveMessagingToken, testFirebaseConfig } from '@/lib/notifications';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function NotificationsSetup() {
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    const setupNotifications = async () => {
      console.log('🔔 Configuration notifications...');

      // Vérifications basiques
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.log('❌ Fonctionnalités non supportées');
        return;
      }

      // Diagnostic
      await testFirebaseConfig();

      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('❌ Permission refusée');
        return;
      }

      try {
        setStatus('authenticating');

        // Authentification anonyme
        const auth = getAuth();
        console.log('🔑 Tentative d\'authentification anonyme...');
        
        const userCredential = await signInAnonymously(auth);
        const anonymousUserId = userCredential.user.uid;

        console.log('✅ Authentifié anonymement:', anonymousUserId);

        setStatus('registering');

        // Petit délai pour stabilisation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Enregistrement des notifications
        await saveMessagingToken(anonymousUserId);
        
        setStatus('success');
        console.log('🎉 Notifications configurées avec succès!');

      } catch (error: any) {
        console.error('💥 Erreur configuration:', error);
        setStatus('error');
        
        // Gestion spécifique des erreurs d'authentification
        if (error.code) {
          console.error('Code erreur:', error.code);
          console.error('Message erreur:', error.message);
          
          if (error.code === 'auth/api-key-not-valid') {
            console.error('❌ Clé API Firebase invalide');
            console.error('Vérifiez vos variables d\'environnement');
          }
        }
      }
    };

    setupNotifications();
  }, []);

  return (
    <div style={{ display: 'none' }}>
      Statut: {status}
    </div>
  );
}