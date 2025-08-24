// components/NotificationManager.tsx
"use client";

// Importez les modules nécessaires
import { useState, useEffect } from 'react';
// Import getMessaging here, NOT in the firebase.ts file
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
// Importez les icônes Lucide React
import { Bell, CheckCircle, XCircle, Loader2, MessageCircle } from 'lucide-react';

// Importez vos instances Firebase (maintenant sans `messaging`)
import { db, auth, serverTimestamp } from '../lib/firebase';

const FIREBASE_PROJECT_ID = "tafsir-app-3b154";

function NotificationManager() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
  const [user, authLoading, authError] = useAuthState(auth);

  useEffect(() => {
    // Only run this code on the client
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      isSupported().then(supported => {
        if (!supported) {
          setError("Votre navigateur ne supporte pas les notifications.");
          return;
        }

        const messagingInstance = getMessaging(); // Initialize messaging instance here

        if (typeof Notification !== 'undefined') {
          setPermissionStatus(Notification.permission);
        }

        // Écouter les messages lorsque l'application est au premier plan
        if (messagingInstance && Notification.permission === 'granted') {
          const unsubscribe = onMessage(messagingInstance, (payload) => {
            console.log('Message reçu en premier plan :', payload);
            setIncomingMessage({
              title: payload.notification?.title || null,
              body: payload.notification?.body || null,
            });
          });
          return () => unsubscribe();
        }
      }).catch(err => {
        console.error("Erreur lors de la vérification de la compatibilité de Firebase Messaging", err);
        setError("Erreur de compatibilité.");
      });
    }
  }, []); // Exécuté une seule fois au montage

  const handleActivateNotifications = async () => {
    setLoading(true);
    setError(null);
    
    if (!user) {
      setError('Utilisateur non connecté. Veuillez patienter.');
      setLoading(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        console.log('Permission de notification accordée.');

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            setError("Clé VAPID manquante. Vérifiez vos variables d'environnement.");
            setLoading(false);
            return;
        }

        const currentToken = await getToken(messaging, {
          vapidKey,
        });

        if (currentToken) {
          console.log('Token FCM obtenu :', currentToken);
          setToken(currentToken);

          const userTokenDocRef = doc(db, 'artifacts', FIREBASE_PROJECT_ID, 'users', user.uid, 'progress', 'fcmToken');
          await setDoc(userTokenDocRef, {
            token: currentToken,
            timestamp: serverTimestamp(),
          }, { merge: true });

          console.log('Token FCM stocké avec succès dans Firestore pour l\'utilisateur :', user.uid);
        } else {
          setError('Aucun token FCM n\'a pu être généré. Assurez-vous que le Service Worker est enregistré et que la clé VAPID est correcte.');
        }
      } else {
        setError('Permission de notification refusée par l\'utilisateur.');
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'activation des notifications :', err);
      setError(`Une erreur est survenue : ${err.message || 'Vérifiez la console pour plus de détails.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMessage = () => {
    setIncomingMessage(null);
  };

  return (
    <div className="p-6 border border-gray-200 rounded-xl shadow-lg bg-white m-4 md:m-8 max-w-xl mx-auto space-y-4 font-sans">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Bell className="w-6 h-6 text-indigo-600" />
        Gérer les notifications Tafsir App
      </h2>
      
      {/* Affichage de la notification entrante */}
      {incomingMessage && (
        <div 
          className="relative bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded shadow-md" 
          role="alert"
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <p className="font-semibold">{incomingMessage.title || 'Nouvelle notification'}</p>
          </div>
          <p className="text-sm">{incomingMessage.body || 'Contenu vide.'}</p>
          <button 
            onClick={handleClearMessage}
            className="absolute top-2 right-2 text-blue-500 hover:text-blue-700 transition-colors"
            aria-label="Fermer la notification"
          >
            &times;
          </button>
        </div>
      )}

      <p className="text-gray-700 text-sm">
        Statut actuel des permissions :{' '}
        <span className={`font-semibold ${permissionStatus === 'granted' ? 'text-green-600' : permissionStatus === 'denied' ? 'text-red-600' : 'text-yellow-600'}`}>
          {permissionStatus === 'granted' ? 'Activé' : permissionStatus === 'denied' ? 'Bloqué' : 'Demande non faite'}
        </span>
      </p>

      {authLoading && (
        <p className="text-blue-600 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de l'état d'authentification...
        </p>
      )}
      {authError && (
        <p className="text-red-600 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Erreur d'authentification : {authError.message}
        </p>
      )}
      {!user && !authLoading && (
        <p className="text-yellow-600 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Veuillez patienter pendant la connexion de l'utilisateur pour activer les notifications.
        </p>
      )}

      <button
        onClick={handleActivateNotifications}
        disabled={loading || permissionStatus === 'granted' || !user}
        className={`
          w-full px-6 py-3 rounded-lg font-medium transition-colors duration-200
          flex items-center justify-center gap-2
          ${
            loading || permissionStatus === 'granted' || !user
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
          }
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Activation...
          </>
        ) : permissionStatus === 'granted' ? (
          <>
            <CheckCircle className="w-5 h-5" /> Notifications activées
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" /> Activer les notifications
          </>
        )}
      </button>

      {token && (
        <p className="text-green-600 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Token FCM généré (partiel) :{' '}
          <code className="bg-gray-100 p-1 rounded text-xs text-gray-800 break-all">{token.substring(0, 20)}...</code>
        </p>
      )}

      {error && (
        <p className="text-red-600 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  );
}

export default NotificationManager;
