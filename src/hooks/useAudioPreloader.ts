"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseAudioPreloaderProps {
  audioUrl: string | null;
  preloadNext?: boolean;
  nextAudioUrl?: string | null;
}

export function useAudioPreloader({
  audioUrl,
  preloadNext = true,
  nextAudioUrl
}: UseAudioPreloaderProps) {
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction pour précharger un audio
  const preloadAudio = useCallback((url: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const handleCanPlayThrough = () => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        resolve(audio);
      };

      const handleError = () => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        reject(new Error('Failed to preload audio'));
      };

      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('error', handleError);
      
      // Configuration pour le préchargement
      audio.preload = 'auto';
      audio.src = url;
      
      // Démarrer le chargement
      audio.load();
    });
  }, []);

  // Préchargement de l'audio suivant avec délai
  useEffect(() => {
    if (!preloadNext || !nextAudioUrl) return;

    // Annuler le préchargement précédent
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Précharger avec un délai pour éviter de surcharger le réseau
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        const preloadedAudio = await preloadAudio(nextAudioUrl);
        preloadedAudioRef.current = preloadedAudio;
        console.log('🎵 Audio suivant préchargé:', nextAudioUrl);
      } catch (error) {
        console.warn('Erreur lors du préchargement:', error);
      }
    }, 2000); // 2 secondes de délai

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      if (preloadedAudioRef.current) {
        preloadedAudioRef.current = null;
      }
    };
  }, [nextAudioUrl, preloadNext, preloadAudio]);

  // Nettoyage lors du changement d'audio principal
  useEffect(() => {
    return () => {
      if (preloadedAudioRef.current) {
        preloadedAudioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Fonction pour obtenir l'audio préchargé
  const getPreloadedAudio = useCallback(() => {
    return preloadedAudioRef.current;
  }, []);

  // Fonction pour vérifier si l'audio suivant est préchargé
  const isNextAudioPreloaded = useCallback(() => {
    return preloadedAudioRef.current !== null;
  }, []);

  return {
    getPreloadedAudio,
    isNextAudioPreloaded,
    preloadAudio
  };
}
