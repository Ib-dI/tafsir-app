// src/lib/data/notifyNewAudio.ts
import { sendNewAudioNotification } from '../notifications';

interface AudioPart {
  id: string;
  title: string;
  url: string;
  timings: Array<{ id: number; startTime: number; endTime: number }>;
}

interface AudioSurah {
  id: number;
  name_simple: string;
  parts: AudioPart[];
}

export async function notifyForNewAudio(audio: AudioSurah | AudioPart) {
  try {
    let title: string;
    let url: string;

    if ('parts' in audio) {
      // C'est une sourate complète
      title = `Nouvelle Sourate : ${audio.name_simple}`;
      url = audio.parts[0].url; // URL de la première partie
    } else {
      // C'est une partie d'une sourate
      title = audio.title;
      url = audio.url;
    }

    await sendNewAudioNotification(title, url);
    console.log('✅ Notification envoyée pour le nouvel audio:', title);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification pour le nouvel audio:', error);
  }
}
