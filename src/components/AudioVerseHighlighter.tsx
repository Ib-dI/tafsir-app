"use client";

import { motion } from "framer-motion";
import {
  Info,
  CheckCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import WaveSurfer from "wavesurfer.js";
import confetti from "canvas-confetti";
import useSound from "use-sound";
import { useMediaQuery } from "./UseMediaQuery";
import SpeedControl from "./SpeedControl";
import { useRouter } from "next/navigation";
import { PauseIcon } from "./icons/PauseIcon";
import { PlayIcon } from "./icons/PlayIcon";
import VerseItem, { toArabicNumerals } from "./VerseItem";

import { VerseHighlight, AudioVerseHighlighterProps, ProgressData } from "@/types/types";
import SuccessCard from "./SuccessCard";
import ProgressIndicator from "./ProgressIndicator";
import OverlayVerses from "./OverlayVerses";

// Clé pour le localStorage
const PROGRESS_KEY = 'audioVerseProgress';

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

  // États pour garder le statut de lecture
  const [wasPlayingBeforePartChange, setWasPlayingBeforePartChange] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

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
      console.log('💾 Progression sauvegardée:', { 
        partIndex: currentPartIndex, 
        time: Math.round(time * 100) / 100
      });
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la progression:', error);
    }
  }, [currentChapterId, audioUrl, currentPartIndex, totalParts]); // Retirer currentPartId

  // Fonction pour charger la progression
  const loadProgress = useCallback((): ProgressData | null => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (!saved) return null;
      
      const progressData: ProgressData = JSON.parse(saved);
      
      if (progressData.chapterId !== currentChapterId) {
        console.log('Progression ignorée - mauvais chapitre');
        return null;
      }
      
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - progressData.timestamp > TWENTY_FOUR_HOURS) {
        console.log('Progression ignorée - trop ancienne');
        return null;
      }
      
      console.log('📦 Progression trouvée:', progressData);
      return progressData;
    } catch (error) {
      console.warn('Erreur lors du chargement de la progression:', error);
      return null;
    }
  }, [currentChapterId]);

  // Fonction pour effacer la progression
  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch (error) {
      console.warn('Erreur lors de la suppression de la progression:', error);
    }
  }, []);

  // ✅ FONCTION pour la navigation manuelle (dans AudioVerseHighlighter)
  const navigateToPart = useCallback((newPartIndex: number) => {
    console.log('🧭 Navigation MANUELLE dans AudioVerseHighlighter:', newPartIndex);
    
    // Sauvegarder l'état de lecture avant changement
    setWasPlayingBeforePartChange(isPlaying);
    if (isPlaying) {
      setShouldAutoPlay(true);
    }
    
    // 1. Marquer comme navigation manuelle
    setHasManualNavigation(true);
    
    // 2. Réinitialiser la progression pour cette nouvelle partie
    clearProgress();
    
    // 3. Changer de partie via la prop normale
    if (onPartChange) {
      onPartChange(newPartIndex);
    }
  }, [onPartChange, clearProgress, isPlaying]);

  // ✅ EXPOSER la fonction au parent (dans AudioVerseHighlighter)
  useEffect(() => {
    if (onNavigateToPart) {
      console.log('📞 Exposition de navigateToPart au parent');
      onNavigateToPart(navigateToPart);
    }
  }, [onNavigateToPart]); // Retirer navigateToPart pour éviter la boucle

  // Gestion de la restauration de progression lors du changement de partie
  // ✅ EFFET DE RESTAURATION CORRIGÉ (remplacez l'effet actuel)
  useEffect(() => {
    // Si l'utilisateur a déjà navigué manuellement, ne pas restaurer automatiquement
    if (hasManualNavigation) {
      console.log('⏸️ Restauration ignorée - navigation manuelle détectée');
      return;
    }
    const progress = loadProgress();
    
    if (progress && progress.currentPartIndex !== currentPartIndex) {
      console.log('📦 Restauration de partie nécessaire:', {
        sauvegardé: progress.currentPartIndex,
        actuel: currentPartIndex
      });
      
      if (!isRestoringProgress) {
        setIsRestoringProgress(true);
        
        setTimeout(() => {
          if (onPartChange) {
            console.log('🔄 Demande de changement vers partie:', progress.currentPartIndex);
            onPartChange(progress.currentPartIndex);
          }
          setIsRestoringProgress(false);
        }, 150);
      }
    }
  }, [currentPartIndex, loadProgress, onPartChange, isRestoringProgress, hasManualNavigation]);

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
        updateCurrentVerse(pendingRestoration.time);
        
        console.log('✅ Position audio restaurée:', pendingRestoration.time);
      }
      
      setPendingRestoration(null);
    }
  }, [pendingRestoration, updateCurrentVerse]);

  // Mise à jour de l'ID de la partie lors des changements
  useEffect(() => {
    const newPartId = `${currentChapterId}-part${currentPartIndex}-${audioUrl}`;
    setCurrentPartId(newPartId);
  }, [currentPartIndex, currentChapterId, audioUrl]);

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

  // Sauvegarde lors des interactions utilisateur avec debounce plus strict
  useEffect(() => {
    if (!wavesurferRef.current || isDragging || isRestoringProgress || !currentTime) return;

    const debounceTimer = setTimeout(() => {
      if (wavesurferRef.current && !isDragging && !isRestoringProgress) {
        const time = wavesurferRef.current.getCurrentTime();
        if (time > 0 && isFinite(time)) {
          const newPartId = `${currentChapterId}-part${currentPartIndex}-${audioUrl}`;
          saveProgress(time, newPartId);
        }
      }
    }, 2000); // Augmenter le délai à 2 secondes

    return () => clearTimeout(debounceTimer);
  }, [currentTime, isDragging, isRestoringProgress, saveProgress, currentChapterId, currentPartIndex, audioUrl]);

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
    // Sauvegarder l'état de lecture
    setWasPlayingBeforePartChange(isPlaying);
    if (isPlaying) {
      setShouldAutoPlay(true);
    }
    
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
    // Sauvegarder l'état de lecture
    setWasPlayingBeforePartChange(isPlaying);
    if (isPlaying) {
      setShouldAutoPlay(true);
    }
    
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
  }, [currentChapterId]);

  const closeOverlay = () => {
    setCompletionVisible(false);
    setShowCompletionOverlay(false);
    setHasAudioFinished(false);
    finishHandledRef.current = false;
  };

  // ✅ INITIALISATION DE WAVESURFER SANS isMobile dans les dépendances
  useEffect(() => {
    if (wavesurferRef.current) {
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

    // ✅ Utiliser isMobile directement ici au lieu de dans les dépendances
    const currentIsMobile = window.innerWidth <= 768;

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
      interact: !currentIsMobile,
      dragToSeek: !currentIsMobile,
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

      console.log('🎵 WaveSurfer prêt, durée:', wavesurfer.getDuration());
      
      // Restaurer la progression si disponible pour la même partie
      const progress = loadProgress();
      if (progress && progress.currentPartIndex === currentPartIndex) {
        if (progress.currentTime > 0) {
          const duration = wavesurfer.getDuration();
          if (progress.currentTime < duration - 2) {
            setTimeout(() => {
              const seekPosition = progress.currentTime / duration;
              wavesurfer.seekTo(seekPosition);
              setCurrentTime(progress.currentTime);
              updateCurrentVerse(progress.currentTime);
              console.log('🔄 Position restaurée:', progress.currentTime);
            }, 300);
          }
        }
      }

      // Reprendre la lecture automatiquement si nécessaire
      if (shouldAutoPlay || wasPlayingBeforePartChange) {
        setTimeout(() => {
          wavesurfer.play();
          setShouldAutoPlay(false);
          setWasPlayingBeforePartChange(false);
        }, 500);
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
    if (!currentIsMobile) {
      wavesurfer.on("interaction", () => {
        setIsDragging(true);
      });

      wavesurfer.on("seeking", (time: number) => {
        setCurrentTime(time);
        updateCurrentVerse(time);

        setTimeout(() => {
          setIsDragging(false);
          const currentTime = wavesurfer.getCurrentTime();
          setCurrentTime(currentTime);
          updateCurrentVerse(currentTime);
        }, 10);
      });

      wavesurfer.on("click", () => {
        setTimeout(() => {
          const currentTime = wavesurfer.getCurrentTime();
          setCurrentTime(currentTime);
          updateCurrentVerse(currentTime);
        }, 10);
      });
    }

    // Gestionnaires d'événements généraux
    wavesurfer.on("audioprocess", () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
      updateCurrentVerse(time);
    });

    wavesurfer.on("timeupdate", () => {
      if (!isDragging) {
        const time = wavesurfer.getCurrentTime();
        setCurrentTime(time);
        updateCurrentVerse(time);
      }
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));

    wavesurfer.on("finish", () => {
      console.log("Audio finished, finishHandledRef.current:", finishHandledRef.current);

      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        setIsPlaying(false);
        setCurrentVerseId(null);
        setCurrentOccurrence(null);
        setHasAudioFinished(true);

        onAudioFinished?.();
        console.log("Audio finish handled, setting hasAudioFinished to true");
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
  }, [audioUrl, loadProgress, currentPartIndex, updateCurrentVerse]); // ✅ Retirer isMobile d'ici

  // ✅ EFFET SÉPARÉ POUR ADAPTER L'INTERACTIVITÉ SELON isMobile
  useEffect(() => {
    if (!wavesurferRef.current) return;
    
    wavesurferRef.current.setOptions({
      interact: !isMobile,
      dragToSeek: !isMobile
    });
  }, [isMobile]); // ✅ Maintenant isMobile est dans son propre effet

  // Effacer la progression quand l'audio est terminé
  useEffect(() => {
    if (hasAudioFinished) {
      clearProgress();
      console.log('🧹 Progression effacée - chapitre terminé');
    }
  }, [hasAudioFinished, clearProgress]);

  // Gestion de l'affichage de l'overlay de completion
  useEffect(() => {
    console.log("hasAudioFinished changed:", hasAudioFinished, "showCompletionOverlay:", showCompletionOverlay);

    if (hasAudioFinished && !showCompletionOverlay && wavesurferRef.current) {
      console.log("Showing completion overlay");
      setShowCompletionOverlay(true);
      setCompletionVisible(true);

      launchConfetti();
      playSuccessSound();
    }
  }, [hasAudioFinished, showCompletionOverlay, launchConfetti, playSuccessSound]);

  // Gestion de la navigation au clavier
  useEffect(() => {
    if (!completionVisible) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeOverlay();
          break;
        case "ArrowLeft":
          if (hasPreviousChapter) {
            goToPreviousChapter();
          }
          break;
        case "ArrowRight":
          if (hasNextChapter) {
            goToNextChapter();
          }
          break;
        case "Enter":
          replayChapter();
          break;
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

  // Fonction pour rejouer le chapitre
  const replayChapter = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
      localStorage.removeItem(PROGRESS_KEY);

      setHasAudioFinished(false);
      setShowCompletionOverlay(false);
      setCompletionVisible(false);
      finishHandledRef.current = false;
      setCurrentVerseId(null);
      setCurrentOccurrence(null);
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

      if (wavesurferRef.current) {
        const currentTime = wavesurferRef.current.getCurrentTime();
        setDragTime(currentTime);
        wasPlayingRef.current = wavesurferRef.current.isPlaying();
        if (wasPlayingRef.current) {
          wavesurferRef.current.pause();
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
      if (!isProcessingTouchRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const currentX = e.touches[0].clientX;
      const deltaX = Math.abs(currentX - touchStartXRef.current);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        updateDragPosition(currentX);
      });

      if (!isDragModeRef.current && deltaX > 5) {
        isDragModeRef.current = true;
        setIsDragging(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isProcessingTouchRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (wavesurferRef.current) {
        const finalTime = wavesurferRef.current.getCurrentTime();
        setCurrentTime(finalTime);
        setDragTime(null);
        updateCurrentVerse(finalTime);
      }

      setIsTouching(false);
      setIsDragging(false);

      setTimeout(() => {
        if (wavesurferRef.current && wasPlayingRef.current) {
          wavesurferRef.current.play();
        }
        isProcessingTouchRef.current = false;
        wasPlayingRef.current = false;
      }, 50);
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

      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [isMobile, updateCurrentVerse]);

  return (
    <div
      className="relative mx-auto flex w-full max-w-4xl flex-col overflow-visible rounded-lg bg-white p-1 shadow sm:p-4"
      style={{ height: "100vh", maxHeight: "100dvh" }}
    >
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
          replayChapter={replayChapter}
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
        
        {/* État de chargement */}
        {isLoading && audioUrl && (
          <div className="absolute top-0 left-0 z-10 flex h-[50px] w-full flex-col items-center justify-center rounded bg-transparent md:h-[60px]">
            <p className="mb-2 text-sm text-blue-500">
              Chargement de l&apos;audio...
            </p>
            <div className="h-5 w-5 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
          </div>
        )}
        
        {/* État d'erreur */}
        {audioError && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 10,
              delay: 0.1,
            }}
            className="absolute top-0 left-0 z-10 flex h-[50px] w-full flex-col items-center justify-center rounded border border-red-200 bg-red-50/80"
          >
            <p className="font-semibold text-red-700">
              Erreur de chargement audio.
            </p>
            <p className="text-sm text-red-600">
              Veuillez réessayer plus tard.
            </p>
          </motion.div>
        )}

        {/* Contrôles audio */}
        {audioUrl && (
          <div
            className={`flex w-full items-center justify-between ${
              isLoading || audioError ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <button
              onClick={togglePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="spacing-[0.86px] font-mono text-xs whitespace-nowrap text-gray-600 md:text-sm">
              {infoSourate[0]} {infoSourate[1]}
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
        <motion.div
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
        </motion.div>
      </div>
      
      {/* Section des versets */}
      <div
        ref={versesRef}
        className="relative z-20 mt-5 flex-1 overflow-y-auto rounded-lg border border-gray-200 p-2"
        style={{ minHeight: 0 }}
      >
        {children}
        {/* Bismillah pour les sourates qui en ont besoin */}
        {Number(infoSourate[0]) !== 1 &&
          Number(infoSourate[0]) !== 9 &&
          verses[0]?.id === 1 && (
            <div className="mt-2 flex w-full justify-center">
              <p className="font-quran-common py-2 text-center text-3xl font-[300] text-gray-700 md:text-5xl">
                ﷽
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
          />
        ))}
      </div>
    </div>
  );
};

export default AudioVerseHighlighter;