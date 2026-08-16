"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  clearPlaybackPosition,
  loadPlaybackPosition,
  savePlaybackPosition,
} from "@/lib/data/playbackPosition";
import { PlaybackPosition, VerseHighlight } from "@/types/types";

interface UseAudioPlaybackOptions {
  audioUrl: string;
  verses: VerseHighlight[];
  currentChapterId: number;
  currentPartIndex: number;
  isMobile: boolean;
  /** Appelé une fois, sans distinction de partie, quand la lecture atteint la fin. */
  onFinished?: () => void;
}

function hasIsPlaying(obj: unknown): obj is { isPlaying: () => boolean } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as { [key: string]: unknown })["isPlaying"] === "function"
  );
}

export function useAudioPlayback({
  audioUrl,
  verses,
  currentChapterId,
  currentPartIndex,
  isMobile,
  onFinished,
}: UseAudioPlaybackOptions) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVerseId, setCurrentVerseId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const [restoredPosition, setRestoredPosition] =
    useState<PlaybackPosition | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const partId = `${currentChapterId}-part${currentPartIndex}-${audioUrl}`;

  const finishHandledRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const touchStartXRef = useRef(0);
  const isDragModeRef = useRef(false);
  const isProcessingTouchRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const findVerseAtTime = useCallback(
    (time: number): VerseHighlight | null => {
      for (const verse of verses) {
        if (verse.noAudio) continue;
        const match = verse.occurrences.find(
          (occ) => time >= occ.startTime && time <= occ.endTime,
        );
        if (match) return verse;
      }
      return null;
    },
    [verses],
  );

  const updateCurrentVerse = useCallback(
    (time: number) => {
      const foundVerse = findVerseAtTime(time);
      setCurrentVerseId(foundVerse ? foundVerse.id : null);
    },
    [findVerseAtTime],
  );

  // ── Latest refs : le container/waveform et les handlers WaveSurfer sont
  //    câblés une seule fois par instance audio (effet ci-dessous). Ces refs
  //    leur donnent accès aux valeurs courantes sans réinitialiser WaveSurfer
  //    à chaque re-render.
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const updateCurrentVerseRef = useRef(updateCurrentVerse);
  updateCurrentVerseRef.current = updateCurrentVerse;

  const resetPlaybackPosition = useCallback(() => {
    clearPlaybackPosition();
    setRestoredPosition(null);
  }, []);

  const resetFinishGuard = useCallback(() => {
    finishHandledRef.current = false;
  }, []);

  // Initialisation / destruction de WaveSurfer pour cette partie audio.
  useEffect(() => {
    if (!audioUrl) {
      setIsLoading(false);
      return;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setCurrentVerseId(null);
    setDragTime(null);
    setRestoredPosition(null);
    finishHandledRef.current = false;
    setIsLoading(true);

    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#cbb694",
      progressColor: "#d28820",
      cursorColor: "#3D3226",
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 3,
      height: 40,
      barGap: 2,
      interact: !isMobileRef.current,
      dragToSeek: !isMobileRef.current,
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
      // Affecté seulement ici (pas juste après create()) : tant que
      // wavesurferRef.current est null, les autres effets (sauvegarde
      // debounce/périodique, etc.) savent que l'instance n'est pas encore
      // prête et n'agissent pas dessus — sinon la sauvegarde debounce peut
      // écraser la position restaurée par un currentTime=0 avant que la
      // restauration ci-dessous n'ait eu lieu (getCurrentTime() vaut 0
      // tant que l'audio n'est pas chargé).
      wavesurferRef.current = wavesurfer;
      setDuration(wavesurfer.getDuration());
      setIsLoading(false);

      const position = loadPlaybackPosition(currentChapterId);
      if (position && position.currentPartIndex === currentPartIndex) {
        const dur = wavesurfer.getDuration();
        if (position.currentTime > 0 && position.currentTime < dur - 2) {
          const seekPosition = position.currentTime / dur;
          wavesurfer.seekTo(seekPosition);
          setCurrentTime(position.currentTime);
          updateCurrentVerseRef.current(position.currentTime);
        }
        setRestoredPosition(position);
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

    if (!isMobileRef.current) {
      wavesurfer.on("interaction", () => {
        setIsDragging(true);
      });

      wavesurfer.on("seeking", (time: number) => {
        setCurrentTime(time);
        updateCurrentVerseRef.current(time);

        setTimeout(() => {
          setIsDragging(false);
          const t = wavesurfer.getCurrentTime();
          setCurrentTime(t);
          updateCurrentVerseRef.current(t);
        }, 10);
      });

      wavesurfer.on("click", () => {
        setTimeout(() => {
          const t = wavesurfer.getCurrentTime();
          setCurrentTime(t);
          updateCurrentVerseRef.current(t);
        }, 10);
      });
    }

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
        onFinishedRef.current?.();
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
  }, [audioUrl, currentChapterId, currentPartIndex]);

  // Adapter l'interactivité au responsive sans réinitialiser WaveSurfer.
  useEffect(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.setOptions({
      interact: !isMobile,
      dragToSeek: !isMobile,
    });
  }, [isMobile]);

  useEffect(() => {
    wavesurferRef.current?.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  // Sauvegarde régulière de la position de lecture pendant la lecture.
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (wavesurferRef.current) {
        savePlaybackPosition({
          chapterId: currentChapterId,
          partId,
          currentTime: Math.max(0, wavesurferRef.current.getCurrentTime()),
          audioUrl,
          timestamp: Date.now(),
          currentPartIndex,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, currentChapterId, partId, audioUrl, currentPartIndex]);

  // Sauvegarde de la position de lecture après une interaction (debounce).
  useEffect(() => {
    if (isDragging) return;
    const debounceTimer = setTimeout(() => {
      if (wavesurferRef.current) {
        savePlaybackPosition({
          chapterId: currentChapterId,
          partId,
          currentTime: Math.max(0, wavesurferRef.current.getCurrentTime()),
          audioUrl,
          timestamp: Date.now(),
          currentPartIndex,
        });
      }
    }, 1500);
    return () => clearTimeout(debounceTimer);
  }, [
    currentTime,
    isDragging,
    currentChapterId,
    partId,
    audioUrl,
    currentPartIndex,
  ]);

  const togglePlayPause = useCallback(() => {
    if (wavesurferRef.current && !audioError) {
      wavesurferRef.current.playPause();
    }
  }, [audioError]);

  const pause = useCallback(() => {
    wavesurferRef.current?.pause();
  }, []);

  const replay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      ws.seekTo(0);
      ws.play();
    }
  }, []);

  const seekToVerse = useCallback(
    (verse: VerseHighlight) => {
      if (verse.noAudio || verse.occurrences.length === 0) return;
      const ws = wavesurferRef.current;
      if (!ws) return;

      const firstOccurrence = verse.occurrences[0];
      const seekTime = Math.max(0, firstOccurrence.startTime);
      const seekPosition = duration > 0 ? seekTime / duration : 0;

      ws.seekTo(seekPosition);
      setCurrentTime(seekTime);
      setCurrentVerseId(verse.id);

      setTimeout(() => {
        const t = wavesurferRef.current?.getCurrentTime() || 0;
        setCurrentTime(t);
        updateCurrentVerse(t);
      }, 50);
    },
    [duration, updateCurrentVerse],
  );

  // Gestionnaires d'événements tactiles pour le glisser-déposer mobile.
  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const container = containerRef.current;

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
      isDragModeRef.current = false;
      lastUpdateTimeRef.current = 0;

      const ws = wavesurferRef.current;
      if (ws) {
        // wavesurfer.isPlaying() peut être peu fiable après une
        // reconfiguration (ex: bascule responsive). On vérifie aussi
        // l'élément média (paused) comme repli, puis l'état local.
        const mediaEl =
          typeof ws.getMediaElement === "function"
            ? (ws.getMediaElement() as HTMLMediaElement | null)
            : null;

        const playingViaMedia = !!mediaEl && !mediaEl.paused;
        const playingViaWs = hasIsPlaying(ws) ? ws.isPlaying() : false;

        wasPlayingRef.current = Boolean(
          playingViaWs || playingViaMedia || isPlayingRef.current,
        );

        const t = ws.getCurrentTime();
        setDragTime(t);

        if (wasPlayingRef.current) {
          try {
            ws.pause();
          } catch (err) {
            console.log(err);
          }
        }
      }
    };

    const updateDragPosition = (clientX: number) => {
      const ws = wavesurferRef.current;
      if (!ws || !isProcessingTouchRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const relativeX = Math.max(
        0,
        Math.min(containerRect.width, clientX - containerRect.left),
      );
      const seekPosition =
        containerRect.width > 0 ? relativeX / containerRect.width : 0;
      const dur = ws.getDuration() || 0;
      const newTime = dur * seekPosition;

      setDragTime(newTime);
      setCurrentTime(newTime);
      updateCurrentVerse(newTime);

      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 16) {
        ws.seekTo(seekPosition);
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
        const ws = wavesurferRef.current;
        if (!isDragModeRef.current && deltaX > 5) {
          isDragModeRef.current = true;
          setIsDragging(true);

          if (ws) {
            ws.pause();
            ws.setVolume(0);
          }
        }

        const newTime = updateDragPosition(currentX);
        if (newTime !== undefined && ws) {
          ws.setTime(newTime);
        }
      });
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isProcessingTouchRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const shouldResumePlaying = wasPlayingRef.current;
      const ws = wavesurferRef.current;

      if (ws) {
        const finalTime = ws.getCurrentTime();

        setIsTouching(false);
        setIsDragging(false);
        setCurrentTime(finalTime);
        setDragTime(null);
        updateCurrentVerse(finalTime);
        isProcessingTouchRef.current = false;

        if (shouldResumePlaying) {
          try {
            ws.setVolume(0);
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (
              wavesurferRef.current &&
              hasIsPlaying(wavesurferRef.current) &&
              !wavesurferRef.current.isPlaying()
            ) {
              await wavesurferRef.current.play();

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
                  if (vol >= 1) clearInterval(fadeInterval);
                }, 20);
              };
              fadeIn();
            }
          } catch (error) {
            console.error("Erreur lors de la reprise de la lecture:", error);
            wavesurferRef.current?.setVolume(1);
          }
        } else {
          ws.setVolume(1);
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

      const ws = wavesurferRef.current;
      if (ws) {
        const t = ws.getCurrentTime();
        setCurrentTime(t);
        updateCurrentVerse(t);
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
      container.removeEventListener(
        "touchstart",
        handleTouchStart,
        eventOptions,
      );
      container.removeEventListener("touchmove", handleTouchMove, eventOptions);
      container.removeEventListener("touchend", handleTouchEnd, eventOptions);
      container.removeEventListener(
        "touchcancel",
        handleTouchCancel,
        eventOptions,
      );
    };
  }, [isMobile, updateCurrentVerse]);

  return {
    containerRef,
    waveformRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    audioError,
    isLoading,
    currentVerseId,
    restoredPosition,
    drag: { isDragging, isTouching, dragTime },
    togglePlayPause,
    pause,
    replay,
    seekToVerse,
    setPlaybackRate,
    resetPlaybackPosition,
    resetFinishGuard,
  };
}
