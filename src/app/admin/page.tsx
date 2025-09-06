'use client';

import { useFcmToken } from '@/hooks/use-fcm-token';
import { sendNewAudioNotification } from '@/lib/notifications';
import { Bell, Send, Users } from 'lucide-react';
import { useState } from 'react';

export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const { token, notification } = useFcmToken();
  const [audioTitle, setAudioTitle] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          audioUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: 'Notification envoyée avec succès !',
        });
        setTitle('');
        setAudioUrl('');
      } else {
        throw new Error(data.message || 'Erreur lors de l\'envoi de la notification');
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    } finally {
      setLoading(false);
    }
  };
  

  const handleAddAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      // Ici tu ajouterais l'audio à ta base (Firestore, etc.)
      // ...
      // Ensuite, envoie la notification à tous les utilisateurs
      await sendNewAudioNotification(audioTitle, audioUrl);
      setStatus('Notification envoyée à tous les utilisateurs !');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
      setStatus(errorMessage || 'Erreur lors de l\'envoi de la notification');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Panneau d&apos;administration des notifications
            </h1>
          </div>

          {token ? (
            <div className="bg-green-50 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <p className="text-green-700">
                Notifications activées - Token FCM : {token.substring(0, 10)}...
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-700">
                Les notifications ne sont pas encore activées
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Titre de la notification
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Entrez le titre..."
                required
              />
            </div>

            <div>
              <label
                htmlFor="audioUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                URL de l&apos;audio
              </label>
              <input
                type="url"
                id="audioUrl"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="https://tafsir-app.web.app/audios/..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Send className="w-5 h-5" />
              {loading ? 'Envoi en cours...' : 'Envoyer la notification'}
            </button>
          </form>

          {feedback.message && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {notification && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Dernière notification reçue :
              </h3>
              <div className="space-y-2 text-gray-600">
                <p>
                  <span className="font-medium">Titre :</span>{' '}
                  {notification.notification?.title}
                </p>
                <p>
                  <span className="font-medium">Message :</span>{' '}
                  {notification.notification?.body}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Ajouter un nouvel audio
          </h2>

          <form
            onSubmit={handleAddAudio}
            className="flex flex-col gap-4"
          >
            <div>
              <label
                htmlFor="audioTitle"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Titre de l&apos;audio
              </label>
              <input
                type="text"
                id="audioTitle"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Entrez le titre de l'audio..."
                required
              />
            </div>

            <div>
              <label
                htmlFor="audioUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                URL de l&apos;audio
              </label>
              <input
                type="url"
                id="audioUrl"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="https://tafsir-app.web.app/audios/..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium transition-colors hover:bg-indigo-700"
            >
              <Send className="w-5 h-5" />
              Ajouter et notifier
            </button>
          </form>

          {status && (
            <p className="mt-4 text-center text-gray-600">
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
