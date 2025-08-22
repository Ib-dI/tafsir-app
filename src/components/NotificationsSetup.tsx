// src/components/NotificationsSetup.tsx
'use client';

import { saveMessagingToken, testFirebaseConfig } from '@/lib/notifications';
import { auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function NotificationsSetup() {
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    const setupNotifications = async (user: User) => {
      console.log('🔔 Configuration notifications...');
      console.log('Utilisateur authentifié:', user.uid);

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
        setStatus('registering');

        // Enregistrement des notifications
        await saveMessagingToken(user.uid);
        
        setStatus('success');
        console.log('🎉 Notifications configurées avec succès!');

      } catch (error) {
        console.error('💥 Erreur configuration:', error);
        setStatus('error');
        
        // Gestion spécifique des erreurs
        if (error instanceof Error) {
          console.error('Message erreur:', error.message);
        }
      }
    };

    // Observer l'état de l'authentification de l'utilisateur
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setupNotifications(user);
      } else {
        console.log('L\'utilisateur n\'est pas connecté, pas de configuration des notifications.');
        setStatus('not-authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ display: 'none' }}>
      Statut: {status}
    </div>
  );
}