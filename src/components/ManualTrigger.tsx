'use client';

import { useState } from 'react';
import { sendManualNotification } from '@/lib/notifications';

export default function ManualTrigger() {
  const [audioTitle, setAudioTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async () => {
    if (!audioTitle) {
      alert("Veuillez entrer un titre audio !");
      return;
    }
    setLoading(true);
    try {
      await sendManualNotification(audioTitle);
      alert("Notification envoyée avec succès !");
      setAudioTitle('');
    } catch (error) {
      alert("Échec de l'envoi de la notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-xl font-bold mb-4">Déclencher une notification manuelle</h2>
      <input
        type="text"
        placeholder="Titre du nouvel audio..."
        value={audioTitle}
        onChange={(e) => setAudioTitle(e.target.value)}
        className="mb-4 p-2 border border-gray-300 rounded"
      />
      <button
        onClick={handleSendNotification}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? "Envoi..." : "Envoyer la notification"}
      </button>
    </div>
  );
}