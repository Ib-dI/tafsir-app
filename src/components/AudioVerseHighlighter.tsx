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

type Verse = {
  id: number;
  text: string;
  verset: string;
  transliteration: string;
  translation: string;
  noAudio?: boolean;
  occurrences: { startTime: number; endTime: number }[];
};

type AudioVerseHighlighterProps = {
  audioUrl: string;
  verses: Verse[];
  infoSourate: string[];
  children?: ReactNode;
  onAudioFinished?: () => void;
  onNextChapter?: () => void;
  onPreviousChapter?: () => void;
  hasNextChapter?: boolean;
  hasPreviousChapter?: boolean;
  currentChapterId: number;
  totalChapters?: number;
  showOnlyWithAudio?: boolean;
};

const toArabicNumerals = (n: number): string => {
  if (n < 0) return String(n);
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return n
    .toString()
    .split("")
    .map((digit) => arabicNumerals[parseInt(digit)])
    .join("");
};

const VerseItem = React.memo(
  ({
    verse,
    currentVerseId,
    audioUrl,
    seekToVerse,
  }: {
    verse: Verse;
    currentVerseId: number | null;
    currentOccurrence: number | null;
    audioUrl: string;
    seekToVerse: (verse: Verse) => void;
  }) => {
    const isActive = verse.id === currentVerseId;

    return (
      <motion.div
        key={`verse-${verse.id}`}
        id={`verse-${verse.id}`}
        onClick={() => !verse.noAudio && seekToVerse(verse)}
        className={`my-1 cursor-pointer rounded-lg p-3 ${
          !verse.noAudio ? "hover:bg-gray-50" : ""
        } ${
          verse.noAudio
            ? "border-[0.7px] border-l-4 border-blue-200 bg-gray-50/50"
            : ""
        }`}
        animate={{
          backgroundColor: verse.noAudio
            ? "rgba(249, 250, 251, 0.5)"
            : isActive && audioUrl
              ? "rgba(255, 255, 204, 0.4)"
              : "rgba(255, 255, 255, 0)",
          borderColor: verse.noAudio
            ? "rgba(186, 230, 253, 1)"
            : isActive && audioUrl
              ? "#F59E0B"
              : "rgba(0, 0, 0, 0)",
          borderWidth: isActive && audioUrl ? "0.7px" : "0px",
          borderLeftWidth:
            verse.noAudio || (isActive && audioUrl) ? "4px" : "0px",
          boxShadow:
            isActive && audioUrl
              ? "0 0 10px 5px rgba(255, 193, 7, 0.5)"
              : "none",
          scale: isActive && audioUrl ? 1.02 : 1,
        }}
        transition={{
          default: {
            type: "tween",
            duration: 0.25,
            ease: "easeInOut",
          },
          scale: {
            type: "spring",
            stiffness: 250,
            damping: 25,
            mass: 1.2,
          },
        }}
      >
        <div className="flex flex-col items-end justify-end gap-2">
          {verse.noAudio && (
            <span className="mb-1 self-start text-xs font-medium text-blue-500">
              Verset sans audio
            </span>
          )}
          <div
            className="font-uthmanic mt-2 flex items-center text-right text-[23.5px] leading-relaxed text-gray-800 md:gap-1 md:text-3xl"
            style={{ direction: "rtl" }}
          >
            <span style={{ direction: "rtl" }}>
              {verse.text} {toArabicNumerals(verse.id)}
            </span>
          </div>
          <p className="text-md mt-[-8px] text-right font-medium text-gray-500">
            {verse.transliteration}
          </p>
          <p className="-mt-2 self-start text-gray-700">
            {verse.id}. {verse.translation}
          </p>
        </div>
      </motion.div>
    );
  },
);
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
  const [currentOccurrence, setCurrentOccurrence] = useState<number | null>(
    null,
  );
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<boolean>(false);

  // ✅ États séparés pour une meilleure gestion
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const wasPlayingRef = useRef(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const isDragModeRef = useRef(false);
  const isProcessingTouchRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // ✅ Référence pour éviter les doubles déclenchements
  const finishHandledRef = useRef(false);

  const [playSuccessSound] = useSound("/sounds/success.m4a", { volume: 0.5 });
  const router = useRouter();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // ✅ Fonction pour lancer les confettis
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

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    setTimeout(() => {
      fire(0.15, {
        spread: 80,
        startVelocity: 30,
      });
    }, 500);
  }, []);

  // ✅ Fonctions de navigation
  const goToPreviousChapter = () => {
    if (onPreviousChapter) {
      onPreviousChapter();
    } else {
      const prevChapterId =
        currentChapterId === 1 ? totalChapters : currentChapterId - 1;
      router.push(`/sourates/${prevChapterId}`);
    }
  };

  const goToNextChapter = () => {
    if (onNextChapter) {
      onNextChapter();
    } else {
      const nextChapterId =
        currentChapterId === totalChapters ? 1 : currentChapterId + 1;
      router.push(`/sourates/${nextChapterId}`);
    }
  };

  // ✅ Réinitialisation lors du changement de chapitre
  useEffect(() => {
    setShowCompletionOverlay(false);
    setCompletionVisible(false);
    setShowCompletionAnimation(false);
    setHasAudioFinished(false);
    finishHandledRef.current = false;
  }, [currentChapterId]);

  const closeOverlay = () => {
    setCompletionVisible(false);
    setShowCompletionAnimation(false);
    setShowCompletionOverlay(false);
    setHasAudioFinished(false);
    finishHandledRef.current = false;
  };

  // ✅ Fonction pour trouver le verset correspondant à un temps donné
  const findVerseAtTime = useCallback(
    (time: number): Verse | null => {
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

  // ✅ Fonction pour mettre à jour le verset actuel
  // 3. Stabiliser la fonction updateCurrentVerse avec useCallback :
  const updateCurrentVerse = useCallback(
    (time: number) => {
      const foundVerse = findVerseAtTime(time);
      if (foundVerse) {
        setCurrentVerseId(foundVerse.id);
      } else {
        setCurrentVerseId(null);
      }
    },
    [findVerseAtTime], // ✅ Dépendance stable
  );

  // 4. Stabiliser onAudioFinished avec useCallback si nécessaire :
  const stableOnAudioFinished = useCallback(() => {
    onAudioFinished?.();
  }, [onAudioFinished]);

  // ✅ Initialisation de WaveSurfer - NE PAS réinitialiser hasAudioFinished ici
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

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
      interact: !isMobile,
      dragToSeek: !isMobile,
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
    });

    wavesurfer.on("error", (err) => {
      if (
        err instanceof Error &&
        (err as Error & { name?: string }).name === "AbortError"
      ) {
        // Ignore
      } else {
        setAudioError(true);
        setIsLoading(false);
        setIsPlaying(false);
      }
    });

    if (!isMobile) {
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

    // ✅ Gestion de l'événement finish avec protection contre les doubles déclenchements
    wavesurfer.on("finish", () => {
      console.log(
        "Audio finished, finishHandledRef.current:",
        finishHandledRef.current,
      );

      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        setIsPlaying(false);
        setCurrentVerseId(null);
        setCurrentOccurrence(null);
        setHasAudioFinished(true);

        // Appeler la callback si elle existe
        onAudioFinished?.();

        console.log("Audio finish handled, setting hasAudioFinished to true");
      }
    });

    return () => {
      try {
        wavesurfer.destroy();
      } catch (e) {
        if (
          e instanceof Error &&
          (e as Error & { name?: string }).name === "AbortError"
        ) {
          // Ignore
        } else {
          console.error(e);
        }
      }
      wavesurferRef.current = null;
    };
  }, [audioUrl, isMobile]);

  // ✅ Effet séparé pour gérer l'affichage de l'overlay
  useEffect(() => {
    console.log(
      "hasAudioFinished changed:",
      hasAudioFinished,
      "showCompletionOverlay:",
      showCompletionOverlay,
    );

    if (hasAudioFinished && !showCompletionOverlay && wavesurferRef.current) {
      console.log("Showing completion overlay");
      setShowCompletionOverlay(true);
      setShowCompletionAnimation(true);
      setCompletionVisible(true);

      // Lancer les effets visuels et sonores
      launchConfetti();
      playSuccessSound();
    }
  }, [
    hasAudioFinished,
    showCompletionOverlay,
    launchConfetti,
    playSuccessSound,
  ]);

  // Gestion de la navigation au clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (completionVisible) {
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
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [completionVisible, hasPreviousChapter, hasNextChapter]);

  // Gestion du défilement
  useEffect(() => {
    if (currentVerseId === null || !versesRef.current) return;

    const verseElement = document.getElementById(`verse-${currentVerseId}`);
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentVerseId]);

  // Gestion du Wake Lock
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

  useEffect(() => {
    if (versesRef.current) {
      versesRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  const togglePlayPause = () => {
    if (wavesurferRef.current && !audioError) {
      wavesurferRef.current.playPause();
    }
  };

  const seekToVerse = (verse: Verse) => {
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

  const replayChapter = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();

      // ✅ Réinitialisation complète des états
      setHasAudioFinished(false);
      setShowCompletionOverlay(false);
      setCompletionVisible(false);
      setShowCompletionAnimation(false);
      finishHandledRef.current = false;
      setCurrentVerseId(null);
      setCurrentOccurrence(null);
    }
  };
  useEffect(() => {
    if (!wavesurferRef.current) return;

    const wavesurfer = wavesurferRef.current;

    // Gestionnaire pour l'événement finish
    const handleFinish = () => {
      console.log(
        "Audio finished, finishHandledRef.current:",
        finishHandledRef.current,
      );

      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        setIsPlaying(false);
        setCurrentVerseId(null);
        setCurrentOccurrence(null);
        setHasAudioFinished(true);

        // Appeler la callback si elle existe
        onAudioFinished?.();

        console.log("Audio finish handled, setting hasAudioFinished to true");
      }
    };

    // Gestionnaire pour timeupdate
    const handleTimeUpdate = () => {
      if (!isDragging) {
        const time = wavesurfer.getCurrentTime();
        setCurrentTime(time);
        updateCurrentVerse(time);
      }
    };

    // Gestionnaire pour audioprocess
    const handleAudioProcess = () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
      updateCurrentVerse(time);
    };

    // Ajouter les écouteurs
    wavesurfer.on("finish", handleFinish);
    wavesurfer.on("timeupdate", handleTimeUpdate);
    wavesurfer.on("audioprocess", handleAudioProcess);

    // Nettoyer les écouteurs
    return () => {
      wavesurfer.un("finish", handleFinish);
      wavesurfer.un("timeupdate", handleTimeUpdate);
      wavesurfer.un("audioprocess", handleAudioProcess);
    };
  }, [isDragging, updateCurrentVerse, onAudioFinished]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // ✅ Gestionnaires d'événements tactiles optimisés
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
      {/* Overlay de completion */}
      {completionVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[900] flex items-center justify-center bg-black/10 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: 0.2,
            }}
            className="relative flex w-full max-w-md flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 p-8 shadow-2xl"
          >
            {/* Bouton de fermeture */}
            <button
              onClick={closeOverlay}
              className="absolute top-4 right-4 rounded-full p-1 transition-colors hover:bg-green-200"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Icône de succès */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 15,
                delay: 0.4,
              }}
              className="mb-4 md:mb-6"
            >
              <CheckCircle
                className="h-14 w-14 text-green-500 md:h-20 md:w-20"
                strokeWidth={1.5}
              />
            </motion.div>

            {/* Message de félicitations */}
            <motion.h3
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-2 text-center text-2xl font-bold text-gray-800"
            >
              Chapitre terminé !
            </motion.h3>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mb-6 text-center text-gray-600"
            >
              Vous avez complété{" "}
              <span className="font-semibold">
                {infoSourate[0]}. {infoSourate[2]}
              </span>
            </motion.p>

            {/* Conteneur des boutons d'action */}

            {/* Conteneur des boutons d'action */}
            <div className="flex w-full flex-col gap-3">
              {/* Bouton de rejouer */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                onClick={replayChapter}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 font-semibold text-white transition-all hover:bg-green-600 hover:shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="h-5 w-5" fill="currentColor" />
                Réécouter ce chapitre
              </motion.button>

              {/* Navigation entre chapitres */}
              <div className="flex w-full gap-3">
                {/* Bouton chapitre précédent */}
                <motion.button
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  onClick={goToPreviousChapter}
                  disabled={!hasPreviousChapter}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 font-medium transition-all ${
                    hasPreviousChapter
                      ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg"
                      : "cursor-not-allowed bg-gray-300 text-gray-500"
                  }`}
                  whileHover={hasPreviousChapter ? { scale: 1.02 } : {}}
                  whileTap={hasPreviousChapter ? { scale: 0.98 } : {}}
                >
                  <ChevronLeft className="h-5 w-5" />
                  Précédent
                </motion.button>

                {/* Bouton chapitre suivant */}
                <motion.button
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  onClick={goToNextChapter}
                  disabled={!hasNextChapter}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 font-medium transition-all ${
                    hasNextChapter
                      ? "bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-lg"
                      : "cursor-not-allowed bg-gray-300 text-gray-500"
                  }`}
                  whileHover={hasNextChapter ? { scale: 1.02 } : {}}
                  whileTap={hasNextChapter ? { scale: 0.98 } : {}}
                >
                  Suivant
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            {/* Indicateur de progression */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                className="mt-6 text-center text-xs text-gray-500"
              >
                Appuyez sur Échap pour fermer
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {(() => {
        const currentVerse = verses.find((v) => v.id === currentVerseId);
        const overlayThreshold = isMobile ? 290 : 410;

        if (
          currentVerse &&
          currentVerse.text.length > overlayThreshold &&
          audioUrl
        ) {
          const overlayVariants = {
            hidden: {
              opacity: 0,
              y: isMobile ? 35 : -30,
            },
            visible: {
              opacity: 1,
              y: 0,
            },
          };

          return (
            <>
              <div className="pointer-events-none fixed inset-0 z-[90] bg-black/10" />
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={overlayVariants}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
                className={`pointer-events-none fixed z-[100] flex w-full justify-center overflow-y-auto ${
                  isMobile
                    ? "bottom-[20px] left-0"
                    : "top-[265px] left-1/2 -translate-x-1/2"
                }`}
                style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
              >
                <div
                  className="animate-fade-in mx-2 flex max-h-fit w-full max-w-2xl flex-col items-end rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3 shadow-lg"
                  style={{ direction: "rtl" }}
                >
                  <div className="font-uthmanic flex items-center gap-1 text-right text-[24px] leading-relaxed text-gray-800 md:text-3xl">
                    <span>
                      {currentVerse.text} {toArabicNumerals(currentVerse.id)}
                    </span>
                  </div>
                  {currentVerse.transliteration.length <
                    (isMobile ? 350 : 400) && (
                    <p
                      className="text-md mt-[-5px] self-end font-medium text-gray-500"
                      style={{ direction: "ltr" }}
                    >
                      {currentVerse.transliteration}
                    </p>
                  )}
                  <p
                    className="self-start text-gray-700"
                    style={{ direction: "ltr" }}
                  >
                    {currentVerse.id}. {currentVerse.translation}
                  </p>
                </div>
              </motion.div>
            </>
          );
        }
        return null;
      })()}

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
            {/* ✅ Indicateur visuel avec mise à jour en temps réel */}
            {isMobile && (isDragging || isTouching) && dragTime !== null && (
              <div className="pointer-events-none absolute inset-0 z-50 -mt-[1px] flex h-[42px] items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-400/25">
                <div className="rounded-lg bg-blue-600 px-2 py-1 font-mono text-base font-bold text-white shadow-xl">
                  {formatTime(dragTime)}
                </div>
              </div>
            )}
          </div>
        )}
        {isLoading && audioUrl && (
          <div className="absolute top-0 left-0 z-10 flex h-[50px] w-full flex-col items-center justify-center rounded bg-transparent md:h-[60px]">
            <p className="mb-2 text-sm text-blue-500">
              Chargement de l&apos;audio...
            </p>
            <div className="h-5 w-5 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
          </div>
        )}
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
      <div
        ref={versesRef}
        className="relative z-20 mt-5 flex-1 overflow-y-auto rounded-lg border border-gray-200 p-2"
        style={{ minHeight: 0 }}
      >
        {children}
        {Number(infoSourate[0]) !== 1 &&
          Number(infoSourate[0]) !== 9 &&
          verses[0]?.id === 1 && (
            <div className="mt-2 flex w-full justify-center">
              <p className="font-quran-common py-2 text-center text-3xl font-[300] text-gray-700 md:text-5xl">
                ﷽
              </p>
            </div>
          )}

        {verses.map((verse: Verse) => (
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
