// app/admin/send-audio-notification/page.tsx
'use client'; // Indique que c'est un composant client

import React, { useState } from 'react';
import { useFcmToken } from '@/hooks/use-fcm-token'; // Importez votre hook

export default function SendAudioNotificationPage() {
  const [audioTitle, setAudioTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Vous pouvez utiliser le token ici pour afficher à l'utilisateur s'il est abonné
  const { token, notification } = useFcmToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!audioTitle || !audioUrl) {
      setMessage('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioTitle, audioUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Notification envoyée avec succès !');
        setAudioTitle('');
        setAudioUrl('');
        console.log('API Response:', data);
      } else {
        setMessage(`Erreur lors de l'envoi : ${data.message || 'Quelque chose s\'est mal passé.'}`);
        console.error('API Error:', data);
      }
    } catch (error) {
      console.error('Erreur réseau lors de l\'envoi de la notification:', error);
      setMessage('Erreur réseau. Impossible d\'envoyer la notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Envoyer une Notification de Nouvel Audio</h1>
      
      {/* Afficher l'état de la permission FCM */}
      {token ? (
        <p style={{ color: 'green' }}>Notifications activées. Votre token FCM est: {token.substring(0, 10)}...</p>
      ) : (
        <p style={{ color: 'orange' }}>Les notifications ne sont pas encore activées ou le token n&apos;est pas généré.</p>
      )}

      {/* Afficher la notification reçue au premier plan */}
      {notification && (
        <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', backgroundColor: '#f0f0f0' }}>
          <h3>Notification reçue au premier plan:</h3>
          <p><strong>Titre:</strong> {notification.notification?.title}</p>
          <p><strong>Corps:</strong> {notification.notification?.body}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="audioTitle" style={{ display: 'block', marginBottom: '5px' }}>Titre de l&apos;Audio:</label>
          <input
            type="text"
            id="audioTitle"
            value={audioTitle}
            onChange={(e) => setAudioTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label htmlFor="audioUrl" style={{ display: 'block', marginBottom: '5px' }}>URL de la page Audio (HTTPS):</label>
          <input
            type="url"
            id="audioUrl"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            required
            placeholder="https://tafsir-app.web.app/audios/nouvel-audio-id"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Envoi en cours...' : 'Envoyer Notification'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: '20px', color: message.includes('Erreur') ? 'red' : 'green' }}>{message}</p>
      )}
    </div>
  );
}
