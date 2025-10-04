// app/admin/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithGoogle } from '@/lib/auth';

export default function AdminNotificationsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Gérer l'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (mounted && !loading) {
      if (!user) {
        console.log('Utilisateur non connecté');
        // Ne pas rediriger immédiatement, afficher le bouton de connexion
      } else if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        console.log('Utilisateur non autorisé:', user.email);
        alert('Accès refusé : vous n\'êtes pas administrateur');
        router.push('/login');
      } else {
        console.log('Utilisateur admin autorisé:', user.email);
      }
    }
  }, [user, loading, router, mounted]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      alert(error.message || 'Erreur lors de la connexion');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Afficher le même contenu pendant l'hydratation et le chargement
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher le bouton de connexion
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Administration
          </h1>
          <p className="text-gray-600 mb-6">
            Vous devez vous connecter en tant qu'administrateur pour accéder à cette page.
          </p>
          <button
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connexion en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Se connecter avec Google
              </>
            )}
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-gray-600 text-sm hover:text-gray-900"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Ne pas afficher la page si l'utilisateur n'est pas admin
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirection...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body: message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        setTitle('');
        setMessage('');
      } else {
        setResult({ success: false, message: data.error || 'Erreur inconnue' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Erreur de connexion au serveur' });
    } finally {
      setIsSending(false);
    }
  };

  // Templates prédéfinis
  const templates = [
    {
      title: 'Nouvel audio disponible',
      message: 'Un nouveau contenu audio vient d\'être ajouté. Écoutez-le dès maintenant !',
    },
    {
      title: 'Nouvelle série complète',
      message: 'Une nouvelle série d\'audios est maintenant disponible dans l\'application.',
    },
    {
      title: 'Mise à jour hebdomadaire',
      message: 'Cette semaine, découvrez de nouveaux contenus passionnants.',
    },
  ];

  const useTemplate = (template: typeof templates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Envoyer une notification
          </h1>

          {/* Templates */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Templates rapides
            </label>
            <div className="grid gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => useTemplate(template)}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm text-gray-900">{template.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{template.message}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre de la notification *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouvel audio disponible"
                required
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/50 caractères</p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez le contenu disponible..."
                required
                maxLength={150}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/150 caractères</p>
            </div>

            {/* Aperçu */}
            {(title || message) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Aperçu de la notification</p>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-semibold text-sm text-gray-900">{title || 'Titre'}</p>
                  <p className="text-sm text-gray-600 mt-1">{message || 'Message'}</p>
                </div>
              </div>
            )}

            {/* Résultat */}
            {result && (
              <div
                className={`rounded-lg p-4 ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p
                  className={`text-sm ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.success ? '✓' : '✗'} {result.message}
                </p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSending || !title || !message}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? 'Envoi en cours...' : 'Envoyer la notification'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}