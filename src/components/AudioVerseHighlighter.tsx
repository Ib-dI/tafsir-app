"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tooltip } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import useSound from "use-sound";
import { PauseIcon } from "./icons/PauseIcon";
import { PlayIcon } from "./icons/PlayIcon";
import SettingsDrawer from "./SettingsDrawer";
import { useMediaQuery } from "./UseMediaQuery";
import VerseItem from "./VerseItem";

import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  clearPlaybackPosition,
  savePlaybackPosition,
} from "@/lib/data/playbackPosition";
import { AudioVerseHighlighterProps, VerseHighlight } from "@/types/types";
import AudioLoadingState from "./AudioLoadingState";
import LoadingSkeleton from "./LoadingSkeleton";
import ProgressIndicator from "./ProgressIndicator";
import SuccessCard from "./SuccessCard";

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
  onPlayingChange,
  onAtTopChange,
  onRegisterAudioControls,
}: AudioVerseHighlighterProps & {
  currentChapterId: number;
  totalChapters?: number;
}) => {
  const versesRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [playSuccessSound] = useSound("/sounds/success.m4a", { volume: 0.5 });

  // États pour la gestion de l'overlay de complétion du chapitre. Ne touchent
  // jamais l'instance WaveSurfer : ils réagissent au fait que la lecture est
  // terminée, ils ne pilotent pas la lecture elle-même.
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);

  const isLastPart = !totalParts || currentPartIndex >= totalParts - 1;

  // Appelé par useAudioPlayback, sans distinction de partie, quand la
  // lecture se termine. C'est ici — pas dans le hook — que "dernière partie
  // du chapitre" vs "partie intermédiaire" est décidé.
  const handleFinished = useCallback(() => {
    onAudioFinished?.();

    if (isLastPart) {
      setHasAudioFinished(true);
    } else {
      clearPlaybackPosition();
      setTimeout(() => {
        onPartChange?.(currentPartIndex + 1);
      }, 500);
    }
  }, [isLastPart, onAudioFinished, onPartChange, currentPartIndex]);

  const audioPlayback = useAudioPlayback({
    audioUrl,
    verses,
    currentChapterId,
    currentPartIndex,
    isMobile,
    onFinished: handleFinished,
  });

  useWakeLock(
    audioPlayback.isPlaying && !!audioUrl && !audioPlayback.audioError,
  );

  useEffect(() => {
    onPlayingChange?.(audioPlayback.isPlaying);
  }, [audioPlayback.isPlaying, onPlayingChange]);

  const { pause, resetFinishGuard } = audioPlayback;
  useEffect(() => {
    if (onRegisterAudioControls) {
      onRegisterAudioControls({
        pause,
        resetFinishState: () => {
          resetFinishGuard();
          setHasAudioFinished(false);
        },
      });
    }
  }, [onRegisterAudioControls, pause, resetFinishGuard]);

  const launchConfetti = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
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
    savePlaybackPosition({
      chapterId: currentChapterId,
      partId: `${currentChapterId}-part${currentPartIndex}-${audioUrl}`,
      currentTime: audioPlayback.currentTime,
      audioUrl,
      timestamp: Date.now(),
      currentPartIndex,
    });

    if (onPreviousChapter) {
      onPreviousChapter();
    } else {
      const prevChapterId =
        currentChapterId === 1 ? totalChapters : currentChapterId - 1;
      router.push(`/sourates/${prevChapterId}`);
    }
  };

  const goToNextChapter = () => {
    savePlaybackPosition({
      chapterId: currentChapterId,
      partId: `${currentChapterId}-part${currentPartIndex}-${audioUrl}`,
      currentTime: audioPlayback.currentTime,
      audioUrl,
      timestamp: Date.now(),
      currentPartIndex,
    });

    if (onNextChapter) {
      onNextChapter();
    } else {
      const nextChapterId =
        currentChapterId === totalChapters ? 1 : currentChapterId + 1;
      router.push(`/sourates/${nextChapterId}`);
    }
  };

  // Réinitialisation de l'overlay lors du changement de chapitre/partie
  useEffect(() => {
    setShowCompletionOverlay(false);
    setCompletionVisible(false);
    setHasAudioFinished(false);
  }, [currentChapterId, currentPartIndex, audioUrl]);

  const closeOverlay = () => {
    setCompletionVisible(false);
    setShowCompletionOverlay(false);
    setHasAudioFinished(false);
  };

  // Effacer la position de lecture quand le chapitre est entièrement terminé
  useEffect(() => {
    if (hasAudioFinished) {
      clearPlaybackPosition();
    }
  }, [hasAudioFinished]);

  // Gestion de l'affichage de l'overlay de completion
  useEffect(() => {
    if (hasAudioFinished && !showCompletionOverlay) {
      setShowCompletionOverlay(true);
      setCompletionVisible(true);

      launchConfetti();
      playSuccessSound();
    }
  }, [
    hasAudioFinished,
    showCompletionOverlay,
    launchConfetti,
    playSuccessSound,
  ]);

  // Fonction pour rejouer le chapitre
  const replayChapter = () => {
    audioPlayback.replay();
    audioPlayback.resetPlaybackPosition();
    audioPlayback.resetFinishGuard();

    setHasAudioFinished(false);
    setShowCompletionOverlay(false);
    setCompletionVisible(false);
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
    if (audioPlayback.currentVerseId === null || !versesRef.current) return;

    const verseElement = document.getElementById(
      `verse-${audioPlayback.currentVerseId}`,
    );
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [audioPlayback.currentVerseId]);

  // Défilement vers le haut lors du changement d'URL audio
  useEffect(() => {
    if (versesRef.current) {
      versesRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [audioUrl]);

  // Fonction pour formater le temps
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div
        className="relative mx-auto flex w-full max-w-4xl flex-col overflow-visible bg-[#FBF3E4] p-1 sm:p-4"
        style={{ height: "100vh", maxHeight: "100dvh" }}
      >
        <ProgressIndicator
          restoredPosition={audioPlayback.restoredPosition}
          resetPlaybackPosition={audioPlayback.resetPlaybackPosition}
          audioUrl={audioUrl}
          isMobile={isMobile}
        />

        {/* Overlay de completion */}
        <AnimatePresence>
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
        </AnimatePresence>


        {/* Section des contrôles audio */}
        <div className="relative mt-3 flex shrink-0 flex-col md:mt-6">
          {audioUrl && (
            <div
              ref={audioPlayback.containerRef}
              className={`relative w-full transition-opacity duration-300 ${
                audioPlayback.drag.isDragging || audioPlayback.drag.isTouching
                  ? "cursor-grabbing"
                  : "cursor-grab"
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
                ref={audioPlayback.waveformRef}
                className="h-full w-full"
                style={{
                  pointerEvents:
                    isMobile &&
                    (audioPlayback.drag.isDragging ||
                      audioPlayback.drag.isTouching)
                      ? "none"
                      : "auto",
                }}
              />
              {/* Indicateur visuel avec mise à jour en temps réel */}
              {isMobile &&
                (audioPlayback.drag.isDragging ||
                  audioPlayback.drag.isTouching) &&
                audioPlayback.drag.dragTime !== null && (
                  <div className="pointer-events-none absolute inset-0 z-50 -mt-px flex h-10.5 items-center justify-center rounded-lg border-2 border-[#d28820]/50 bg-[#d28820]/20">
                    <div className="rounded-lg bg-[#d28820] px-2 py-1 font-mono text-base font-bold text-white shadow-xl">
                      {formatTime(audioPlayback.drag.dragTime)}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* État de chargement amélioré */}
          <AudioLoadingState
            isLoading={audioPlayback.isLoading}
            audioError={audioPlayback.audioError}
          />

          {/* Contrôles audio */}
          {audioUrl && (
            <div
              className={`flex w-full items-center justify-between transition-opacity duration-300 ${
                audioPlayback.isLoading || audioPlayback.audioError
                  ? "pointer-events-none opacity-0"
                  : ""
              }`}
            >
              <button
                onClick={audioPlayback.togglePlayPause}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#d28820] text-white hover:bg-[#d28820]/90"
              >
                {audioPlayback.isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <div className="flex items-center gap-2 text-[#3D3226]/70">
                <span className="font-sura -mt-1 text-xl">
                  surah
                  {Number(infoSourate[0]) < 10
                    ? "00"
                    : Number(infoSourate[0]) < 100
                      ? "0"
                      : ""}
                  {infoSourate[0]}
                </span>
                <span>|</span>
                <div className="spacing-[0.86px] font-mono text-xs whitespace-nowrap md:text-sm">
                  {infoSourate[0]}.{infoSourate[1]}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="font-mono text-xs whitespace-nowrap text-[#3D3226]/70 md:text-sm">
                  {formatTime(audioPlayback.currentTime)} /{" "}
                  {formatTime(audioPlayback.duration)}
                </div>
                <SettingsDrawer
                  playbackRate={audioPlayback.playbackRate}
                  onPlaybackRateChange={audioPlayback.setPlaybackRate}
                  previewVerse={verses.find((v) => v.words.length > 0)}
                />
              </div>
            </div>
          )}

          {/* Message quand pas d'audio */}
          {!audioUrl && !audioPlayback.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 10,
                delay: 0.1,
              }}
              className="-mt-3 flex h-15 w-full items-center justify-center"
            >
              <div className="relative mx-auto inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-[#2563eb]/30 bg-blue-50/80 px-3 py-1 font-medium text-gray-900 shadow-lg ring-1 shadow-blue-400/20 ring-black/10 filter backdrop-blur-[1px] transition-colors hover:bg-blue-100/80 focus:outline-hidden sm:text-sm">
                <Info className="mr-2 h-5 w-5 shrink-0 text-[#2563eb] drop-shadow" />
                <p className="inline-block w-full truncate text-center text-[#2563eb]">
                  Tafsir audio non disponible !
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Section des versets */}
        <div
          ref={versesRef}
          className="verses-scroll relative z-20 mt-1 flex-1 overflow-y-auto p-2"
          style={{ minHeight: 0 }}
          onScroll={(e) => onAtTopChange?.(e.currentTarget.scrollTop < 10)}
        >
          {/* Skeleton loader pendant le chargement initial */}
          {audioPlayback.isLoading && !children && (
            <LoadingSkeleton count={5} />
          )}

          {children}
          {/* Bismillah pour les sourates qui en ont besoin */}
          {Number(infoSourate[0]) !== 1 &&
            Number(infoSourate[0]) !== 9 &&
            verses[0]?.id === 1 && (
              <div className="mt-2 flex w-full justify-center">
                <p
                  className="font-sura-colors mt-4 text-center text-xl leading-relaxed text-gray-900 md:text-[32px]"
                  style={{ direction: "rtl" }}
                >
                  ﲪﲫﲮﲴ
                </p>
              </div>
            )}

          {/* Liste des versets */}
          {verses.map((verse: VerseHighlight) => (
            <VerseItem
              key={`verse-${verse.id}`}
              verse={verse}
              isActive={verse.id === audioPlayback.currentVerseId}
              audioUrl={audioUrl}
              seekToVerse={audioPlayback.seekToVerse}
            />
          ))}
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export default AudioVerseHighlighter;
