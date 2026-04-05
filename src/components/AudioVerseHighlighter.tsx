"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import useSound from "use-sound";
import WaveSurfer from "wavesurfer.js";
import { PauseIcon } from "./icons/PauseIcon";
import { PlayIcon } from "./icons/PlayIcon";
import SpeedControl from "./SpeedControl";
import { useMediaQuery } from "./UseMediaQuery";
import VerseItem, { toArabicNumerals } from "./VerseItem";

import { AudioVerseHighlighterProps, ProgressData, VerseHighlight } from "@/types/types";
import AudioLoadingState from "./AudioLoadingState";
import LoadingSkeleton from "./LoadingSkeleton";
import OverlayVerses from "./OverlayVerses";
import ProgressIndicator from "./ProgressIndicator";
import ProgressRestorationLoader from "./ProgressRestorationLoader";
import SuccessCard from "./SuccessCard";

/** Clé versionnée pour éviter les collisions de schéma (client-localstorage-schema). */
const PROGRESS_KEY = "audioVerseProgress:v1";
const PROGRESS_KEY_LEGACY = "audioVerseProgress";

function readStoredProgressJson(): string | null {
  try {
    const current = localStorage.getItem(PROGRESS_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(PROGRESS_KEY_LEGACY);
    if (legacy) {
      localStorage.setItem(PROGRESS_KEY, legacy);
      localStorage.removeItem(PROGRESS_KEY_LEGACY);
    }
    return legacy;
  } catch {
    return null;
  }
}

function clearStoredProgressKeys() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(PROGRESS_KEY_LEGACY);
  } catch {
    /* quota / privé */
  }
}

VerseItem.displayName = "VerseItem";

const AudioVerseHighlighter = ({
  audioUrl,
  verses,
  infoSourate,
  children,
  onAudioFinished,
  onNextChapter,
  onPreviousChapter,
  hasNextChapter = true,
  hasPreviousChapter = true,
  currentChapterId,
  totalChapters = 114,
  currentPartIndex,
  totalParts,
  onPartChange,
  onNavigateToPart,
  onPlayingChange,
  onAtTopChange,
}: AudioVerseHighlighterProps & {
  currentChapterId: number;
  totalChapters?: number;
}) => {
  const waveformRef = useRef(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const versesRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVerseId, setCurrentVerseId] = useState<number | null>(null);
  const [currentOccurrence, setCurrentOccurrence] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<boolean>(false);

  // États pour la gestion de l'overlay de completion
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);

  // États pour la gestion des interactions tactiles
  const [isDragging, setIsDragging] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);


  const [isRestoringProgress, setIsRestoringProgress] = useState(false);
const [pendingRestoration, setPendingRestoration] = useState<{
  partIndex: number;
  time: number;
} | null>(null);
const [hasManualNavigation, setHasManualNavigation] = useState(false);

  // Références pour la gestion des événements
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const wasPlayingRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const isDragModeRef = useRef(false);
  const isProcessingTouchRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const finishHandledRef = useRef(false);

  // Type-guard pour vérifier la présence de isPlaying sans utiliser `any`
  const hasIsPlaying = (obj: unknown): obj is { isPlaying: () => boolean } => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      typeof (obj as { [key: string]: unknown })["isPlaying"] === "function"
    );
  };

  const [playSuccessSound] = useSound("/sounds/success.m4a", { volume: 0.5 });
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // ID de la partie actuelle pour la sauvegarde
  const [currentPartId, setCurrentPartId] = useState<string>(() => {
    return `${currentChapterId}-part${currentPartIndex}-${audioUrl}`;
  });

  // Fonction pour sauvegarder la progression
  const saveProgress = useCallback((time: number, partId: string = currentPartId) => {
    try {
      if (time < 0 || !isFinite(time)) {
        console.warn('Temps invalide pour sauvegarde:', time);
        return;
      }
      
      const progressData: ProgressData = {
        chapterId: currentChapterId,
        partId: partId,
        currentTime: Math.max(0, time),
        audioUrl: audioUrl,
        timestamp: Date.now(),
        currentPartIndex: currentPartIndex,
        totalParts: totalParts,
      };
      
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));
      if (localStorage.getItem(PROGRESS_KEY_LEGACY)) {
        localStorage.removeItem(PROGRESS_KEY_LEGACY);
      }

    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la progression:', error);
    }
  }, [currentChapterId, currentPartId, audioUrl, currentPartIndex, totalParts]);

  // Fonction pour charger la progression
  const loadProgress = useCallback((): ProgressData | null => {
    try {
      const saved = readStoredProgressJson();
      if (!saved) return null;
      
      const progressData: ProgressData = JSON.parse(saved);
      
      if (progressData.chapterId !== currentChapterId) {
        return null;
      }
      
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - progressData.timestamp > TWENTY_FOUR_HOURS) {
        return null;
      }
      
      return progressData;
    } catch (error) {
      console.warn('Erreur lors du chargement de la progression:', error);
      return null;
    }
  }, [currentChapterId]);

  // Fonction pour effacer la progression
  const clearProgress = useCallback(() => {
    try {
      clearStoredProgressKeys();
    } catch (error) {
      console.warn('Erreur lors de la suppression de la progression:', error);
    }
  }, []);
  // ✅ FONCTION pour la navigation manuelle (dans AudioVerseHighlighter)
const navigateToPart = useCallback((newPartIndex: number) => {
  // 1. Marquer comme navigation manuelle
  setHasManualNavigation(true);
  
  // 2. Réinitialiser la progression pour cette nouvelle partie
  clearProgress();
  
  // 3. Changer de partie via la prop normale
  if (onPartChange) {
    onPartChange(newPartIndex);
  }
}, [onPartChange, clearProgress]);

// ✅ EXPOSER la fonction au parent (dans AudioVerseHighlighter)
useEffect(() => {
    if (onNavigateToPart) {
      onNavigateToPart(navigateToPart);
    }
  }, [onNavigateToPart, navigateToPart]);

  // Gestion de la restauration de progression lors du changement de partie
  // ✅ EFFET DE RESTAURATION CORRIGÉ (remplacez l'effet actuel)
useEffect(() => {
  // Ne pas restaurer si navigation manuelle ou déjà en cours de restauration
  if (hasManualNavigation || isRestoringProgress) {
    return;
  }

  const progress = loadProgress();
  
  if (!progress) {
    return;
  }

  // Définir immédiatement l'état de restauration
  if (progress.currentPartIndex !== currentPartIndex) {
    setIsRestoringProgress(true);
    setPendingRestoration({
      partIndex: progress.currentPartIndex,
      time: progress.currentTime
    });
    
    // Changer la partie directement
    if (onPartChange) {
      onPartChange(progress.currentPartIndex);
    }
  } else {
    // Si nous sommes déjà sur la bonne partie, restaurer juste la position
    setPendingRestoration({
      partIndex: currentPartIndex,
      time: progress.currentTime
    });
  }

  // Réinitialiser l'état de restauration après un délai
  const timer = setTimeout(() => {
    setIsRestoringProgress(false);
  }, 100);

  return () => clearTimeout(timer);
}, [currentPartIndex, loadProgress, onPartChange, hasManualNavigation, isRestoringProgress]);


// Fonction pour trouver le verset correspondant à un temps donné
  const findVerseAtTime = useCallback(
    (time: number): VerseHighlight | null => {
      for (const verse of verses) {
        if (verse.noAudio) continue;
        const match = verse.occurrences.find(
          (occ) => time >= occ.startTime && time <= occ.endTime,
        );
        if (match) {
          return verse;
        }
      }
      return null;
    },
    [verses],
  );

// Fonction pour mettre à jour le verset actuel
const updateCurrentVerse = useCallback(
  (time: number) => {
    const foundVerse = findVerseAtTime(time);
    if (foundVerse) {
      setCurrentVerseId(foundVerse.id);
    } else {
      setCurrentVerseId(null);
    }
  },
  [findVerseAtTime],
);
// ✅ EFFET POUR LA RESTAURATION AUDIO (ajoutez-le)
useEffect(() => {
  if (pendingRestoration && wavesurferRef.current && wavesurferRef.current.getDuration() > 0) {
    console.log('🎵 Restauration audio pour partie:', pendingRestoration.partIndex);
    
    const duration = wavesurferRef.current.getDuration();
    if (pendingRestoration.time > 0 && pendingRestoration.time < duration - 2) {
      const seekPosition = pendingRestoration.time / duration;
      wavesurferRef.current.seekTo(seekPosition);
      setCurrentTime(pendingRestoration.time);
      updateCurrentVerseRef.current(pendingRestoration.time);

      console.log('✅ Position audio restaurée:', pendingRestoration.time);
    }

    setPendingRestoration(null);
  }
}, [pendingRestoration]);
  
  


  // Mise à jour de l'ID de la partie lors des changements
  useEffect(() => {
    if (!wavesurferRef.current || !audioUrl || isRestoringProgress) return;

    const newPartId = `${currentChapterId}-part${currentPartIndex}-${audioUrl}`;
    setCurrentPartId(newPartId);
  
    // Sauvegarder la progression actuelle
    if (!isRestoringProgress) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      saveProgress(currentTime, newPartId);

    }
  }, [currentPartIndex, currentChapterId, audioUrl, saveProgress, isRestoringProgress]);

  // Sauvegarde régulière pendant la lecture
  useEffect(() => {
    if (!wavesurferRef.current || !isPlaying || isRestoringProgress) return;

    const interval = setInterval(() => {
      if (wavesurferRef.current && isPlaying) {
        const currentTime = wavesurferRef.current.getCurrentTime();
        saveProgress(currentTime);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, saveProgress, isRestoringProgress]);

  // Sauvegarde lors des interactions utilisateur
  useEffect(() => {
    if (!wavesurferRef.current || isDragging || isRestoringProgress) return;

    const debounceTimer = setTimeout(() => {
      if (wavesurferRef.current) {
        const currentTime = wavesurferRef.current.getCurrentTime();
        saveProgress(currentTime);
      }
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [currentTime, isDragging, saveProgress, isRestoringProgress]);

  // Fonction pour effacer manuellement la progression
  const clearProgressManually = () => {
    clearProgress();
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      setCurrentTime(0);
      setCurrentVerseId(null);
    }
    alert('Progression effacée !');
  };

  // Fonction pour lancer les confettis
  const launchConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 1000,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    setTimeout(() => {
      fire(0.15, { spread: 80, startVelocity: 30 });
    }, 500);
  }, []);

  // Fonctions de navigation entre chapitres
  const goToPreviousChapter = () => {
    if (wavesurferRef.current) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      saveProgress(currentTime);
    }
    
    if (onPreviousChapter) {
      onPreviousChapter();
    } else {
      const prevChapterId = currentChapterId === 1 ? totalChapters : currentChapterId - 1;
      router.push(`/sourates/${prevChapterId}`);
    }
  };

  const goToNextChapter = () => {
    if (wavesurferRef.current) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      saveProgress(currentTime);
    }
    
    if (onNextChapter) {
      onNextChapter();
    } else {
      const nextChapterId = currentChapterId === totalChapters ? 1 : currentChapterId + 1;
      router.push(`/sourates/${nextChapterId}`);
    }
  };

  // Réinitialisation lors du changement de chapitre
  useEffect(() => {
    setShowCompletionOverlay(false);
    setCompletionVisible(false);
    setHasAudioFinished(false);
    finishHandledRef.current = false;
  }, [currentChapterId, currentPartIndex, audioUrl]);

  const closeOverlay = () => {
    setCompletionVisible(false);
    setShowCompletionOverlay(false);
    setHasAudioFinished(false);
    finishHandledRef.current = false;
  };

  // ── Refs useLatest : mises à jour dans le corps du rendu pour éviter les
  //    closures périmées dans les handlers WaveSurfer/touch, sans déclencher
  //    de réinitialisation de WaveSurfer à chaque changement de valeur.
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const pendingRestorationLatestRef = useRef(pendingRestoration);
  pendingRestorationLatestRef.current = pendingRestoration;

  const onAudioFinishedRef = useRef(onAudioFinished);
  onAudioFinishedRef.current = onAudioFinished;

  const onPartChangeRef = useRef(onPartChange);
  onPartChangeRef.current = onPartChange;

  const totalPartsRef = useRef(totalParts);
  totalPartsRef.current = totalParts;

  const clearProgressRef = useRef(clearProgress);
  clearProgressRef.current = clearProgress;

  const isMobileWsRef = useRef(isMobile);
  isMobileWsRef.current = isMobile;

  const updateCurrentVerseRef = useRef(updateCurrentVerse);
  updateCurrentVerseRef.current = updateCurrentVerse;

  // Initialisation de WaveSurfer
  useEffect(() => {
    if (!audioUrl) {
      setIsLoading(false);
      return;
    }

    if (wavesurferRef.current) {
      // Ne pas détruire si c'est juste un changement de mode responsive
      if (wavesurferRef.current.getMediaElement()?.src === audioUrl) {
        return;
      }
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Réinitialisation des états
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setCurrentVerseId(null);
    setCurrentOccurrence(null);
    setDragTime(null);

    if (!audioUrl) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#e2e8f0",
      progressColor: "#1961fc",
      cursorColor: "#ff611dff",
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 3,
      height: 40,
      barGap: 2,
      interact: !isMobileWsRef.current,
      dragToSeek: !isMobileWsRef.current,
      hideScrollbar: true,
      normalize: true,
    });

    wavesurfer.load(audioUrl).catch((err) => {
      if (err.name !== "AbortError") {
        setAudioError(true);
        setIsLoading(false);
      }
    });

    wavesurfer.on("ready", () => {
      wavesurferRef.current = wavesurfer;
      setDuration(wavesurfer.getDuration());
      setIsLoading(false);
      
      // Restaurer la progression
      const progress = loadProgress();
      const pending = pendingRestorationLatestRef.current;
      const shouldRestore = pending || (progress && progress.currentPartIndex === currentPartIndex);

      if (shouldRestore) {
        const timeToRestore = pending ? pending.time : progress?.currentTime;
        const dur = wavesurfer.getDuration();

        if (timeToRestore && timeToRestore > 0 && timeToRestore < dur - 2) {
          const seekPosition = timeToRestore / dur;
          wavesurfer.seekTo(seekPosition);
          setCurrentTime(timeToRestore);
          updateCurrentVerseRef.current(timeToRestore);
        }
      }

      // Réinitialiser pendingRestoration après utilisation
      if (pending) {
        setPendingRestoration(null);
      }
    });

    wavesurfer.on("error", (err) => {
      if (err instanceof Error && err.name === "AbortError") {
        // Ignore les erreurs d'annulation
      } else {
        setAudioError(true);
        setIsLoading(false);
        setIsPlaying(false);
      }
    });

    // Gestionnaires d'événements pour desktop
    if (!isMobileWsRef.current) {
      wavesurfer.on("interaction", () => {
        setIsDragging(true);
      });

      wavesurfer.on("seeking", (time: number) => {
        setCurrentTime(time);
        updateCurrentVerseRef.current(time);

        setTimeout(() => {
          setIsDragging(false);
          const currentTime = wavesurfer.getCurrentTime();
          setCurrentTime(currentTime);
          updateCurrentVerseRef.current(currentTime);
        }, 10);
      });

      wavesurfer.on("click", () => {
        setTimeout(() => {
          const currentTime = wavesurfer.getCurrentTime();
          setCurrentTime(currentTime);
          updateCurrentVerseRef.current(currentTime);
        }, 10);
      });
    }

    // Gestionnaires d'événements généraux
    wavesurfer.on("audioprocess", () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
      updateCurrentVerseRef.current(time);
    });

    wavesurfer.on("timeupdate", () => {
      if (!isDraggingRef.current) {
        const time = wavesurfer.getCurrentTime();
        setCurrentTime(time);
        updateCurrentVerseRef.current(time);
      }
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));

    wavesurfer.on("finish", () => {
      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        setIsPlaying(false);
        setCurrentVerseId(null);
        setCurrentOccurrence(null);

        const tp = totalPartsRef.current;
        const isLastPart = !tp || currentPartIndex >= tp - 1;

        // Marquer la complétion dans le parent (Firebase) pour toutes les parties
        onAudioFinishedRef.current?.();

        if (isLastPart) {
          // Dernière partie : afficher la modal de complétion du chapitre
          setHasAudioFinished(true);
        } else {
          // Partie intermédiaire : passer à la suivante sans modal
          clearProgressRef.current();
          setTimeout(() => {
            onPartChangeRef.current?.(currentPartIndex + 1);
          }, 500);
        }
      }
    });

    return () => {
      try {
        wavesurfer.destroy();
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          // Ignore les erreurs d'annulation
        } else {
          console.error(e);
        }
      }
      wavesurferRef.current = null;
    };
  }, [audioUrl, loadProgress, currentPartIndex]);

  // Effet séparé pour adapter l'interactivité
useEffect(() => {
  if (!wavesurferRef.current) return;
  
  wavesurferRef.current.setOptions({
    interact: !isMobile,
    dragToSeek: !isMobile
  });
}, [isMobile]);

  // Effacer la progression quand l'audio est terminé
  useEffect(() => {
    if (hasAudioFinished) {
      clearProgress();

    }
  }, [hasAudioFinished, clearProgress]);

  // Gestion de l'affichage de l'overlay de completion
  useEffect(() => {
    if (hasAudioFinished && !showCompletionOverlay && wavesurferRef.current) {
      setShowCompletionOverlay(true);
      setCompletionVisible(true);

      launchConfetti();
      playSuccessSound();
    }
  }, [hasAudioFinished, showCompletionOverlay, launchConfetti, playSuccessSound]);

  // Fonction pour rejouer le chapitre
  const replayChapter = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
      clearStoredProgressKeys();

      setHasAudioFinished(false);
      setShowCompletionOverlay(false);
      setCompletionVisible(false);
      finishHandledRef.current = false;
      setCurrentVerseId(null);
      setCurrentOccurrence(null);
    }
  };

  // Refs useLatest pour les callbacks du keyboard handler
  const closeOverlayRef = useRef(closeOverlay);
  closeOverlayRef.current = closeOverlay;
  const goToPreviousChapterRef = useRef(goToPreviousChapter);
  goToPreviousChapterRef.current = goToPreviousChapter;
  const goToNextChapterRef = useRef(goToNextChapter);
  goToNextChapterRef.current = goToNextChapter;
  const replayChapterRef = useRef(replayChapter);
  replayChapterRef.current = replayChapter;

  // Gestion de la navigation au clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (completionVisible) {
        switch (e.key) {
          case "Escape":
            closeOverlayRef.current();
            break;
          case "ArrowLeft":
            if (hasPreviousChapter) {
              goToPreviousChapterRef.current();
            }
            break;
          case "ArrowRight":
            if (hasNextChapter) {
              goToNextChapterRef.current();
            }
            break;
          case "Enter":
            replayChapterRef.current();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [completionVisible, hasPreviousChapter, hasNextChapter]);

  // Gestion du défilement automatique vers le verset actuel
  useEffect(() => {
    if (currentVerseId === null || !versesRef.current) return;

    const verseElement = document.getElementById(`verse-${currentVerseId}`);
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentVerseId]);

  // Gestion du Wake Lock pour empêcher la mise en veille
  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          wakeLockRef.current.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        } catch (err) {
          if (err instanceof Error) {
            console.error(`Erreur Wake Lock: ${err.name}, ${err.message}`);
          } else {
            console.error("Erreur Wake Lock inconnue", err);
          }
          wakeLockRef.current = null;
        }
      } else {
        console.warn("API Wake Lock non supportée par ce navigateur.");
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (isPlaying && audioUrl && !audioError) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isPlaying, audioUrl, audioError]);

  // Défilement vers le haut lors du changement d'URL audio
  useEffect(() => {
    if (versesRef.current) {
      versesRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [audioUrl]);

  // Mise à jour du taux de lecture
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  // Fonction pour basculer lecture/pause
  const togglePlayPause = () => {
    if (wavesurferRef.current && !audioError) {
      wavesurferRef.current.playPause();
    }
  };

  // Fonction pour naviguer vers un verset spécifique
  const seekToVerse = (verse: VerseHighlight) => {
    if (verse.noAudio || verse.occurrences.length === 0) return;

    if (wavesurferRef.current) {
      const firstOccurrence = verse.occurrences[0];
      const seekTime = Math.max(0, firstOccurrence.startTime);
      const seekPosition = duration > 0 ? seekTime / duration : 0;

      wavesurferRef.current.seekTo(seekPosition);
      setCurrentTime(seekTime);
      setCurrentVerseId(verse.id);

      setTimeout(() => {
        const currentTime = wavesurferRef.current?.getCurrentTime() || 0;
        setCurrentTime(currentTime);
        updateCurrentVerse(currentTime);
      }, 50);
    }
  };


  // Fonction pour formater le temps
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Gestionnaires d'événements tactiles pour mobile
  useEffect(() => {
    if (!isMobile || !waveformContainerRef.current) return;

    const container = waveformContainerRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobile) return;
      
      e.preventDefault();
      e.stopPropagation();

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      isProcessingTouchRef.current = true;
      setIsTouching(true);
      setDragTime(null);

      touchStartXRef.current = e.touches[0].clientX;
      touchStartTimeRef.current = Date.now();
      isDragModeRef.current = false;
      lastUpdateTimeRef.current = 0;

      // Vérification et sauvegarde de l'état de lecture
      if (wavesurferRef.current) {
        // wavesurfer.isPlaying() can sometimes be unreliable after reconfigurations
        // (ex: responsive switch). Prefer vérifier aussi l'élément média
        // (getMediaElement().paused) comme fallback, et enfin l'état local `isPlaying`.
        const mediaEl =
          typeof wavesurferRef.current.getMediaElement === "function"
            ? (wavesurferRef.current.getMediaElement() as HTMLMediaElement | null)
            : null;

        const playingViaMedia = !!mediaEl && !mediaEl.paused;
        const playingViaWs = hasIsPlaying(wavesurferRef.current)
          ? wavesurferRef.current.isPlaying()
          : false;

        wasPlayingRef.current = Boolean(playingViaWs || playingViaMedia || isPlayingRef.current);

        const currentTime = wavesurferRef.current.getCurrentTime();
        setDragTime(currentTime);

        if (wasPlayingRef.current) {
          try {
            wavesurferRef.current.pause();
          } catch (err) {
            // Ne pas casser si pause échoue
            console.log(err)
          }
        }
      }
    };

    const updateDragPosition = (clientX: number) => {
      if (!wavesurferRef.current || !isProcessingTouchRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const relativeX = Math.max(
        0,
        Math.min(containerRect.width, clientX - containerRect.left),
      );
      const seekPosition =
        containerRect.width > 0 ? relativeX / containerRect.width : 0;
      const duration = wavesurferRef.current.getDuration() || 0;
      const newTime = duration * seekPosition;

      setDragTime(newTime);
      setCurrentTime(newTime);
      updateCurrentVerse(newTime);

      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 16) {
        wavesurferRef.current.seekTo(seekPosition);
        lastUpdateTimeRef.current = now;
      }

      return newTime;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobile || !isProcessingTouchRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const currentX = e.touches[0].clientX;
      const deltaX = Math.abs(currentX - touchStartXRef.current);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Utiliser une seule animation frame pour toutes les opérations
      rafIdRef.current = requestAnimationFrame(() => {
        if (!isDragModeRef.current && deltaX > 5) {
          isDragModeRef.current = true;
          setIsDragging(true);
          
          // S'assurer que l'audio est complètement arrêté
          if (wavesurferRef.current) {
            wavesurferRef.current.pause();
            wavesurferRef.current.setVolume(0); // Couper le son pendant le drag

          }
        }

        // Mettre à jour la position sans déclencher de son
        const newTime = updateDragPosition(currentX);
        if (newTime !== undefined && wavesurferRef.current) {
          wavesurferRef.current.setTime(newTime);
        }
      });
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isMobile || !isProcessingTouchRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const shouldResumePlaying = wasPlayingRef.current;


      if (wavesurferRef.current) {
        const finalTime = wavesurferRef.current.getCurrentTime();
        
        // Réinitialiser les états immédiatement
        setIsTouching(false);
        setIsDragging(false);
        setCurrentTime(finalTime);
        setDragTime(null);
        updateCurrentVerse(finalTime);
        isProcessingTouchRef.current = false;

        // Séquence de reprise de lecture optimisée
        if (shouldResumePlaying) {
          try {
            // Rétablir le volume progressivement
            wavesurferRef.current.setVolume(0);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (wavesurferRef.current && hasIsPlaying(wavesurferRef.current) && !wavesurferRef.current.isPlaying()) {
              // Démarrer la lecture avec volume à 0
              await wavesurferRef.current.play();
              
              // Augmenter progressivement le volume
              const fadeIn = () => {
                if (!wavesurferRef.current) return;
                let vol = 0;
                const fadeInterval = setInterval(() => {
                  if (!wavesurferRef.current) {
                    clearInterval(fadeInterval);
                    return;
                  }
                  vol = Math.min(1, vol + 0.1);
                  wavesurferRef.current.setVolume(vol);
                  if (vol >= 1) {
                    clearInterval(fadeInterval);

                  }
                }, 20);
              };
              fadeIn();
            }
          } catch (error) {
            console.error('Erreur lors de la reprise de la lecture:', error);
            // En cas d'erreur, s'assurer que le volume est rétabli
            if (wavesurferRef.current) {
              wavesurferRef.current.setVolume(1);
            }
          }
        } else {
          // Si on ne reprend pas la lecture, rétablir quand même le volume
          wavesurferRef.current.setVolume(1);
        }
      }

      wasPlayingRef.current = false;
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      setIsTouching(false);
      setIsDragging(false);
      setDragTime(null);
      isProcessingTouchRef.current = false;

      if (wavesurferRef.current) {
        const actualTime = wavesurferRef.current.getCurrentTime();
        setCurrentTime(actualTime);
        updateCurrentVerse(actualTime);
      }
    };

    const eventOptions = { passive: false, capture: true };

    container.addEventListener("touchstart", handleTouchStart, eventOptions);
    container.addEventListener("touchmove", handleTouchMove, eventOptions);
    container.addEventListener("touchend", handleTouchEnd, eventOptions);
    container.addEventListener("touchcancel", handleTouchCancel, eventOptions);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      container.removeEventListener("touchstart", handleTouchStart, eventOptions);
      container.removeEventListener("touchmove", handleTouchMove, eventOptions);
      container.removeEventListener("touchend", handleTouchEnd, eventOptions);
      container.removeEventListener("touchcancel", handleTouchCancel, eventOptions);
    };
  }, [isMobile, updateCurrentVerse]);

  return (
    <div
      className="relative mx-auto flex w-full max-w-4xl flex-col overflow-visible rounded-lg bg-white p-1 shadow sm:p-4"
      style={{ height: "100vh", maxHeight: "100dvh" }}
    >
      {/* Loader de restauration de progression */}
      <ProgressRestorationLoader isRestoring={isRestoringProgress} />
      <ProgressIndicator
      loadProgress={loadProgress}
      clearProgressManually={clearProgressManually}
      currentChapterId={currentChapterId}
      currentPartIndex={currentPartIndex}
      audioUrl={audioUrl}
      isRestoringProgress={isRestoringProgress}
      isMobile={isMobile}

      />
      
      {/* Overlay de completion */}
      {completionVisible && (
        <SuccessCard
          replayChapter ={replayChapter}
          hasNextChapter={hasNextChapter}
          hasPreviousChapter={hasPreviousChapter}
          infoSourate={infoSourate}
          closeOverlay={closeOverlay}
          goToPreviousChapter={goToPreviousChapter}
          goToNextChapter={goToNextChapter}
          isMobile={isMobile}
          />
      )}
      
      {/* Overlay pour les versets longs */}
      {
      <OverlayVerses
        currentVerseId={currentVerseId}
        verses={verses}
        isMobile={isMobile}
        audioUrl={audioUrl}
        toArabicNumerals={toArabicNumerals}
      />
      }

      {/* Section des contrôles audio */}
      <div className="relative mt-3 flex flex-shrink-0 flex-col md:mt-6">
        {audioUrl && (
          <div
            ref={waveformContainerRef}
            className={`relative w-full transition-opacity duration-300 ${
              isDragging || isTouching ? "cursor-grabbing" : "cursor-grab"
            } hover:opacity-80`}
            style={{
              minHeight: 50,
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
              WebkitTouchCallout: "none",
              WebkitTapHighlightColor: "transparent",
              msContentZooming: "none",
              msTouchAction: "none",
            }}
            title={
              isMobile
                ? "Touchez ou glissez pour naviguer"
                : "Cliquez ou glissez pour naviguer dans l'audio"
            }
          >
            <div
              ref={waveformRef}
              className="h-full w-full"
              style={{
                pointerEvents:
                  isMobile && (isDragging || isTouching) ? "none" : "auto",
              }}
            />
            {/* Indicateur visuel avec mise à jour en temps réel */}
            {isMobile && (isDragging || isTouching) && dragTime !== null && (
              <div className="pointer-events-none absolute inset-0 z-50 -mt-[1px] flex h-[42px] items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-400/25">
                <div className="rounded-lg bg-blue-600 px-2 py-1 font-mono text-base font-bold text-white shadow-xl">
                  {formatTime(dragTime)}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* État de chargement amélioré */}
        <AudioLoadingState
          isLoading={isLoading}
          audioError={audioError}
        />

        {/* Contrôles audio */}
        {audioUrl && (
          <div
            className={`flex w-full items-center justify-between transition-opacity duration-300 ${
              isLoading || audioError ? "pointer-events-none opacity-0" : ""
            }`}
          >
            <button
              onClick={togglePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 cursor-pointer text-white hover:bg-blue-700"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="flex items-center text-gray-600 gap-2">
              <span
                className="font-sura -mt-1 text-xl"
              >surah{Number(infoSourate[0]) < 10 ? "00" : Number(infoSourate[0]) < 100 ? "0" : ""}{infoSourate[0]}</span>
              <span>|</span>
              <div className="spacing-[0.86px] font-mono text-xs whitespace-nowrap md:text-sm">
                {infoSourate[0]}.{infoSourate[1]}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="font-mono text-xs whitespace-nowrap text-gray-600 md:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <SpeedControl
                playbackRate={playbackRate}
                onChange={setPlaybackRate}
              />
            </div>
          </div>
        )}
        
        {/* Message quand pas d'audio */}
        {!audioUrl && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 10,
              delay: 0.1,
            }}
            className="-mt-3 flex h-[60px] w-full items-center justify-center"
          >
            <div className="relative mx-auto inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-[#2563eb]/30 bg-blue-50/80 px-3 py-1 font-medium text-gray-900 shadow-lg ring-1 shadow-blue-400/20 ring-black/10 filter backdrop-blur-[1px] transition-colors hover:bg-blue-100/80 focus:outline-hidden sm:text-sm">
              <Info className="mr-2 h-5 w-5 flex-shrink-0 text-[#2563eb] drop-shadow" />
              <p className="inline-block w-full truncate text-center text-[#2563eb]">
                Tafsir audio non disponible !
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Titre du chapitre */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 140,
            damping: 10,
            delay: 0.4,
          }}
          className="pointer-events-none absolute -bottom-7 left-1/2 z-10 w-fit -translate-x-1/2 -translate-y-1/2 rounded-sm bg-yellow-50/40 px-4 text-sm font-medium text-nowrap text-red-800 uppercase shadow"
        >
          {infoSourate[0]}. {infoSourate[2]}
        </motion.div> */}
      </div>
      
      {/* Section des versets */}
      <div
        ref={versesRef}
        className="relative z-20 mt-1 flex-1 overflow-y-auto rounded-lg border border-gray-200 p-2"
        style={{ minHeight: 0 }}
        onScroll={(e) => onAtTopChange?.((e.currentTarget.scrollTop) < 10)}
      >
        {/* Skeleton loader pendant le chargement initial */}
        {isLoading && !children && (
          <LoadingSkeleton count={5} />
        )}
        
        {children}
        {/* Bismillah pour les sourates qui en ont besoin */}
        {Number(infoSourate[0]) !== 1 &&
          Number(infoSourate[0]) !== 9 &&
          verses[0]?.id === 1 && (
            <div className="mt-2 flex w-full justify-center">
              <p className="font-sura-colors mt-4 text-center text-xl text-gray-900 md:text-[32px] leading-relaxed" style={{ direction: "rtl" }}>
              ﲪﲫﲮﲴ
              </p>
            </div>
          )}

        {/* Liste des versets */}
        {verses.map((verse: VerseHighlight) => (
          <VerseItem
            key={`verse-${verse.id}`}
            verse={verse}
            currentVerseId={currentVerseId}
            currentOccurrence={currentOccurrence}
            audioUrl={audioUrl}
            seekToVerse={seekToVerse}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioVerseHighlighter;