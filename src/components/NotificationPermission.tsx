// components/NotificationPermission.tsx
'use client';

import { useEffect, useState } from 'react';
import { initializeMessaging } from '@/lib/firebase';
import { saveFCMToken } from '@/lib/fcm-service';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function NotificationPermission() {
  const [user] = useAuthState(auth);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Les notifications ne sont pas supportées par votre navigateur');
      return;
    }

    if (!user) {
      alert('Vous devez être connecté pour activer les notifications');
      return;
    }

    setIsLoading(true);

    try {
      const token = await initializeMessaging();
      
      if (token) {
        // Enregistrer le token avec l'ID utilisateur
        await saveFCMToken(token, user.uid);
        setPermission('granted');
        alert('Notifications activées avec succès !');
      } else {
        alert('Impossible d\'obtenir le token de notification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'activation des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <p className="text-green-800 text-sm">
          ✓ Notifications activées - Vous recevrez les nouveaux contenus audio
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-800 text-sm">
          Les notifications ont été bloquées. Veuillez les activer dans les paramètres de votre navigateur.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          Connectez-vous pour activer les notifications
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p className="text-blue-800 text-sm mb-3">
        Activez les notifications pour être informé des nouveaux contenus audio
      </p>
      <button
        onClick={requestPermission}
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Activation...' : 'Activer les notifications'}
      </button>
    </div>
  );
}