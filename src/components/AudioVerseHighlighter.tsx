"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";
import { useMediaQuery } from "./UseMediaQuery";


type Verse = {
  id: number;
  text: string;
  verset: string;
  startTime: number; // en secondes
  endTime: number; // en secondes
  transliteration: string;
  translation: string;
  noAudio?: boolean; // nouveau flag
};

type AudioVerseHighlighterProps = {
  audioUrl: string;
  verses: Verse[];
  infoSourate: string[];
  children?: ReactNode;
  onAudioFinished?: () => void;
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

// --- NOUVEAU COMPOSANT MEMOÏSÉ POUR LES VERSETS ---
const VerseItem = React.memo(
  ({
    verse,
    currentVerseId,
    audioUrl,
    seekToVerse,
  }: {
    verse: Verse;
    currentVerseId: number | null;
    audioUrl: string;
    seekToVerse: (verse: Verse) => void;
  }) => {
    return (
      <motion.div
        key={verse.id}
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
            : currentVerseId === verse.id && audioUrl
              ? "rgba(255, 255, 204, 0.4)"
              : "rgba(255, 255, 255, 0)",
          borderColor: verse.noAudio
            ? "rgba(186, 230, 253, 1)"
            : currentVerseId === verse.id && audioUrl
              ? "#F59E0B"
              : "rgba(0, 0, 0, 0)",
          borderWidth:
            currentVerseId === verse.id && audioUrl ? "0.7px" : "0px",
          borderLeftWidth:
            verse.noAudio || (currentVerseId === verse.id && audioUrl)
              ? "4px"
              : "0px",
          boxShadow: currentVerseId === verse.id && audioUrl 
					? "0 0 10px 5px rgba(255, 193, 7, 0.5)" // Lueur jaune douce
					: "none",
          scale: currentVerseId === verse.id && audioUrl ? 1.02 : 1,
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
			// 	whileHover={{
			// 		boxShadow: "0 0 10px 3px rgba(255, 193, 7, 0.3)",
			// 		scale: 1.015,
			// }}
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
}: AudioVerseHighlighterProps) => {
  const waveformRef = useRef(null);
  const versesRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVerseId, setCurrentVerseId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Initialisation de WaveSurfer et gestion du chargement
  useEffect(() => {
    setHasFinished(false);
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setCurrentVerseId(null);

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
      cursorColor: "#7ca7fc",
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 50,
      barGap: 2,
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

    wavesurfer.on("audioprocess", () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);

      const currentVerse = verses.find(
        (v) => time >= v.startTime && time <= v.endTime,
      );
      // Met à jour l'état du verset actif, ce qui déclenchera l'animation et le défilement
      setCurrentVerseId(currentVerse?.id || null);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => {
      if (!hasFinished) {
        setHasFinished(true);
        setIsPlaying(false);
        setCurrentVerseId(null);
        onAudioFinished?.();
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
  }, [audioUrl, verses]);

  // --- NOUVEAU: GESTION DU DÉFILEMENT SÉPARÉMENT ---

  useEffect(() => {
    // Ne rien faire si aucun verset n'est actif ou si la référence n'est pas prête
    if (currentVerseId === null || !versesRef.current) {
      return;
    }

    // Trouver l'élément du verset actif
    const verseElement = document.getElementById(`verse-${currentVerseId}`);

    if (verseElement) {
      // La logique de défilement est simplifiée pour toujours centrer le verset actif
      // Cela garantit qu'il n'est jamais coupé ou partiellement visible
      verseElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentVerseId]); // Ce hook s'exécute uniquement lorsque l'ID du verset change

  // NOUVEAU HOOK POUR GÉRER LE WAKE LOCK
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
  const isIOS = () => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const seekToVerse = (verse: Verse) => {
    if (verse.noAudio) {
      return;
    }

    if (wavesurferRef.current) {
      // Applique un décalage de -0.2 seconde pour les appareils iOS
      const offset = isIOS() ? 1.05 : 0;

      // Calcul de la position de départ avec le décalage
      const seekTime = Math.max(0, verse.startTime + offset);

      // Convertir le temps en pourcentage de la durée totale
      const seekPosition = duration > 0 ? seekTime / duration : 0;

      wavesurferRef.current.seekTo(seekPosition);
      setCurrentVerseId(verse.id);
    } else {
      console.warn(
        `Verset ${verse.id} n'a pas de timing audio ou audio non chargé.`,
      );
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div
      className="relative mx-auto flex w-full max-w-4xl flex-col overflow-visible rounded-lg bg-white p-1 shadow sm:p-4"
      style={{ height: "100vh", maxHeight: "100dvh" }}
    >
      {(() => {
        const currentVerse = verses.find((v) => v.id === currentVerseId);

        // Définir le seuil en fonction de l'appareil
        const overlayThreshold = isMobile ? 290 : 410; // Seuil plus bas pour les PC

        if (
          currentVerse &&
          currentVerse.text.length > overlayThreshold &&
          audioUrl
        ) {
          // Définir les animations en fonction de l'appareil
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
                  {currentVerse.transliteration.length < (isMobile ? 350 : 400) && (
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
            ref={waveformRef}
            className="relative w-full transition-opacity duration-300"
            style={{ minHeight: 60 }}
          />
        )}
        {isLoading && audioUrl && (
          <div className="absolute top-0 left-0 z-10 flex h-[60px] w-full flex-col items-center justify-center rounded bg-transparent md:h-[80px]">
            <p className="mb-2 text-sm text-blue-500">
              Chargement de l’audio...
            </p>
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
            className="absolute top-0 left-0 z-10 flex h-[80px] w-full flex-col items-center justify-center rounded border border-red-200 bg-red-50/80"
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
            
            <div className="flex w-full mt-2 justify-center">
              <p className="font-quran-common text-center py-2 text-3xl md:text-5xl text-gray-800">
                ﷽
              </p>
            </div>
          )}

        {verses.map((verse: Verse) => (
          <VerseItem
            key={verse.id}
            verse={verse}
            currentVerseId={currentVerseId}
            audioUrl={audioUrl}
            seekToVerse={seekToVerse}
          />
        ))}
      </div>
    </div>
  );
};

// Composants d'icônes et contrôles
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6"
  >
    <path
      fillRule="evenodd"
      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
      clipRule="evenodd"
    />
  </svg>
);

const PauseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6"
  >
    <path
      fillRule="evenodd"
      d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
      clipRule="evenodd"
    />
  </svg>
);

const SpeedControl = ({
  playbackRate,
  onChange,
}: {
  playbackRate: number;
  onChange: (rate: number) => void;
}) => {
  const speeds = [1, 1.25, 1.5, 2];
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectSpeed = (speed: number) => {
    onChange(speed);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
      >
        x{playbackRate}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mb-2 rounded-md bg-white p-1 shadow-lg">
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSelectSpeed(speed)}
              className={`block w-full rounded-md px-2 py-1 text-left text-sm ${
                speed === playbackRate
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100"
              }`}
            >
              x{speed}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioVerseHighlighter;
