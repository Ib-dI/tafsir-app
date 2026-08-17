"use client";

import React from "react";
// Importez les instances pré-initialisées depuis votre fichier src/lib/firebase.ts
import HeaderRight from "@/components/HeaderRight";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedBackButton from "./AnimatedBackButton";

import { useUserId } from "@/hooks/useUserId";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import {
  markPartCompleted,
  resetChapterProgress as resetChapterProgressInFirestore,
  resetPartProgress as resetPartProgressInFirestore,
} from "@/lib/data/progress";
import {
  clearPlaybackPosition,
  loadPlaybackPosition,
} from "@/lib/data/playbackPosition";
import { computeChapterProgress } from "@/lib/chapterProgress";

import {
  SourateInteractiveContentProps,
  TafsirAudioPart,
  TafsirAudioTiming,
  AudioControls,
} from "@/types/types";
import type { Verse } from "@/types/types";
import { ChevronDown, RotateCcw } from "lucide-react";
import ResetProgressDialog from "@/components/ResetProgressDialog";
import SourateDrawer from "@/components/SourateDrawer";
import { useMediaQuery } from "@/components/UseMediaQuery";
import LongPressPartBadge from "@/components/LongPressPartBadge";
import { useCompletedPartLongPress } from "@/hooks/useCompletedPartLongPress";

const AudioVerseHighlighter = dynamic(
  () => import("@/components/AudioVerseHighlighter"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] w-full items-center justify-center py-12">
        <LoadingSpinner
          size="lg"
          color="gold"
          text="Chargement du lecteur audio…"
          className="gap-4"
        />
      </div>
    ),
  },
);

function buildAudioParts(
  initialAudioParts: TafsirAudioPart[],
  initialVerses: Verse[],
): TafsirAudioPart[] {
  const coveredVerseIds = new Set(
    initialAudioParts.flatMap((part) => part.timings.map((t) => t.id)),
  );
  const remainingVerses = initialVerses.filter(
    (verse) => !coveredVerseIds.has(verse.id),
  );
  if (remainingVerses.length > 0) {
    const newPart: TafsirAudioPart = {
      id: "remaining-verses",
      title: `Partie ${initialAudioParts.length + 1}`,
      url: "",
      timings: remainingVerses.map((verse) => ({
        id: verse.id,
        startTime: 0,
        endTime: 0,
        occurrence: 1,
      })),
    };
    return [...initialAudioParts, newPart];
  }
  return initialAudioParts;
}

interface CompletedSelectItemProps {
  part: TafsirAudioPart;
  index: number;
  hasMultipleOccurrences: boolean;
  onSelect: () => void;
  onResetRequest: () => void;
}

function CompletedSelectItem({
  part,
  index,
  hasMultipleOccurrences,
  onSelect,
  onResetRequest,
}: CompletedSelectItemProps) {
  const { handlers, pressing, onClick } = useCompletedPartLongPress({
    onLongPress: onResetRequest,
    onSelect,
  });

  return (
    <div
      {...handlers}
      onClick={onClick}
      className={`relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm transition-colors outline-none select-none ${
        pressing ? "bg-green-200" : "hover:bg-green-50"
      }`}
    >
      <span className="flex items-center gap-2">
        {part.title || `Partie ${index + 1}`}
        {hasMultipleOccurrences && (
          <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">
            +occurrences
          </span>
        )}
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow">
          <svg width="8" height="8" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 10.5L8.5 14L15 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-xs text-[#3D3226]/40">⟳ Maintenir</span>
      </span>
    </div>
  );
}

export default function SourateInteractiveContent({
  verses: initialVerses,
  audioParts: initialAudioParts,
  infoSourate,
  chapterId,
  allChapters,
}: SourateInteractiveContentProps) {
  const router = useRouter();
  const [audioParts] = useState(() =>
    buildAudioParts(initialAudioParts, initialVerses),
  );
  const [isSourateDrawerOpen, setIsSourateDrawerOpen] = useState(false);

  const [selectedPart, setSelectedPart] = useState<TafsirAudioPart | null>(
    () => {
      const parts = buildAudioParts(initialAudioParts, initialVerses);
      const savedPosition = loadPlaybackPosition(chapterId);
      const savedPart = savedPosition
        ? parts[savedPosition.currentPartIndex]
        : undefined;
      return savedPart ?? parts[0] ?? null;
    },
  );
  const { userId, isAuthReady } = useUserId();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const completedPartIds = useChapterProgress(chapterId, userId);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isVerseContainerAtTop, setIsVerseContainerAtTop] = useState(true);

  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const audioControlsRef = useRef<AudioControls | null>(null);

  const handleRegisterAudioControls = useCallback((controls: AudioControls) => {
    audioControlsRef.current = controls;
  }, []);

  const resetChapterProgress = useCallback(async () => {
    audioControlsRef.current?.pause();
    audioControlsRef.current?.resetFinishState();

    if (!userId) return;
    try {
      await resetChapterProgressInFirestore(chapterId, userId);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation de la progression du chapitre:",
        error,
      );
    }
  }, [userId, chapterId]);

  const resetPartProgress = useCallback(
    async (partId: string) => {
      const isCurrentPart = selectedPart?.id === partId;
      if (isCurrentPart) {
        audioControlsRef.current?.pause();
        audioControlsRef.current?.resetFinishState();
      }
      if (!userId) return;
      try {
        await resetPartProgressInFirestore(partId, userId);
      } catch (error) {
        console.error(
          "Erreur lors de la réinitialisation de la partie:",
          error,
        );
      }
    },
    [selectedPart, userId],
  );

  const [resetDialogPart, setResetDialogPart] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Défilement vers le haut de la page lorsque la partie sélectionnée change
  useEffect(() => {
    if (selectedPart) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedPart]);

  useEffect(() => {
    if (selectedPart) {
      const button = buttonRefs.current.get(selectedPart.id);
      if (button) {
        button.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [selectedPart]);

  // Fonction pour marquer une partie comme complétée
  const markPartAsCompleted = useCallback(
    async (completedChapterId: number, completedPartId: string) => {
      if (!userId) return;
      try {
        await markPartCompleted(completedChapterId, completedPartId, userId);
      } catch (error) {
        console.error(
          "Erreur lors du marquage de la partie comme complétée:",
          error,
        );
      }
    },
    [userId],
  );

  // Setter pur — passé comme onPartChange à AudioVerseHighlighter, utilisé
  // pour l'avancement automatique de partie (fin de lecture). N'efface pas
  // la position de lecture (déjà géré par AudioVerseHighlighter) — voir
  // handlePartChange pour la navigation manuelle.
  const setPartByIndex = useCallback(
    (newPartIndex: number) => {
      if (newPartIndex >= 0 && newPartIndex < audioParts.length) {
        setSelectedPart(audioParts[newPartIndex]);
      }
    },
    [audioParts],
  );

  // Handler complet pour les boutons/select du parent : une navigation
  // manuelle efface la position de lecture sauvegardée, pour qu'elle ne
  // pointe pas vers une autre partie que celle choisie par l'utilisateur.
  const handlePartChange = useCallback(
    (newPartIndex: number) => {
      clearPlaybackPosition();
      setPartByIndex(newPartIndex);
    },
    [setPartByIndex],
  );

  // Modification principale : versesToDisplay pour gérer les multiples occurrences
  const versesToDisplay = selectedPart
    ? (() => {
        if (selectedPart.id === "remaining-verses") {
          // Pour les versets restants sans audio
          const coveredVerseIds = new Set(
            initialAudioParts.flatMap((part) =>
              part.timings.map((timing) => timing.id),
            ),
          );
          return initialVerses
            .filter((verse) => !coveredVerseIds.has(verse.id))
            .map((verse) => ({
              ...verse,
              startTime: 0,
              endTime: 0,
              verset: verse.text,
              noAudio: true,
              occurrences: [], // pas d'audio donc pas d'occurrence
            }));
        } else {
          // 🔑 Grouper par verse.id
          const verseById = new Map(initialVerses.map((v) => [v.id, v]));
          const verseMap = new Map<
            number,
            {
              id: number;
              text: string;
              translation: string;
              transliteration: string;
              words: Verse["words"];
              noAudio: boolean;
              verset: string;
              occurrences: {
                startTime: number;
                endTime: number;
                words?: TafsirAudioTiming["words"];
              }[];
            }
          >();

          selectedPart.timings.forEach((timing) => {
            const originalVerse = verseById.get(timing.id);
            if (!originalVerse) {
              console.warn(`Verset ${timing.id} non trouvé dans initialVerses`);
              return;
            }

            if (!verseMap.has(timing.id)) {
              verseMap.set(timing.id, {
                ...originalVerse,
                noAudio: false,
                verset: originalVerse.text,
                occurrences: [],
              });
            }

            // Ajouter toutes les occurrences au même verset
            verseMap.get(timing.id)!.occurrences.push({
              startTime: timing.startTime,
              endTime: timing.endTime,
              words: timing.words,
            });
          });

          return Array.from(verseMap.values());
        }
      })()
    : initialVerses.map((verse) => ({
        ...verse,
        startTime: 0,
        endTime: 0,
        verset: verse.text,
        occurrences: [],
      }));

  // Déterminer l'URL audio à passer
  const currentAudioUrl = selectedPart?.url || "";

  // Logique de navigation entre les parties audio
  const currentPartIndex = selectedPart
    ? audioParts.findIndex((p) => p.id === selectedPart.id)
    : -1;
  const canGoPrevious = currentPartIndex > 0;
  const canGoNext =
    currentPartIndex !== -1 && currentPartIndex < audioParts.length - 1;

  const chapterProgress = computeChapterProgress(audioParts, completedPartIds);
  const completedAudioPartsCount = chapterProgress.completedParts;

  // Fonctions de navigation CORRIGÉES
  const handleNextPart = useCallback(() => {
    if (canGoNext) {
      handlePartChange(currentPartIndex + 1);
    }
  }, [canGoNext, currentPartIndex, handlePartChange]);

  const handlePreviousPart = useCallback(() => {
    if (canGoPrevious) {
      handlePartChange(currentPartIndex - 1);
    }
  }, [canGoPrevious, currentPartIndex, handlePartChange]);

  // Appelé par AVH à la fin de l'audio — marque uniquement la complétion.
  // La navigation vers la partie suivante est gérée par le handler `finish`
  // interne d'AVH (via onPartChange = setPartByIndex).
  const handleAudioFinished = useCallback(() => {
    if (!selectedPart) return;
    if (!completedPartIds.has(selectedPart.id)) {
      markPartAsCompleted(chapterId, selectedPart.id);
    }
  }, [selectedPart, chapterId, completedPartIds, markPartAsCompleted]);

  const memoizedVersesToDisplay = useMemo(
    () => versesToDisplay.filter(Boolean),
    [versesToDisplay],
  );

  const memoizedInfoSourate = useMemo(
    () => infoSourate.map(String),
    [infoSourate],
  );

  // Définition des couleurs pour HeaderRight
  const headerColors = {
    card: "#F3E5C7", // sepia surface, a shade darker than the page background for contrast
    border: "rgba(61, 50, 38, 0.15)", // #3D3226/15
    text: "#3D3226", // ink
    primary: "#d28820", // gold accent
    textSecondary: "rgba(61, 50, 38, 0.5)", // #3D3226/50
  };

  // Nombre total de chapitres (coran complet)
  const TOTAL_CHAPTERS = 114;

  // Indique s'il existe un chapitre précédent/suivant
  const hasPreviousChapter = chapterId > 1;
  const hasNextChapter = chapterId < TOTAL_CHAPTERS;

  // Navigation entre chapitres depuis le header premium
  const goToPreviousChapter = useCallback(() => {
    if (!hasPreviousChapter) return;
    const prevChapterId = chapterId - 1;
    router.push(`/sourates/${prevChapterId}`);
  }, [chapterId, hasPreviousChapter, router]);

  const goToNextChapter = useCallback(() => {
    if (!hasNextChapter) return;
    const nextChapterId = chapterId + 1;
    router.push(`/sourates/${nextChapterId}`);
  }, [chapterId, hasNextChapter, router]);

  const chapterNumber = Number(infoSourate[0]);
  const chapterName = String(infoSourate[1] ?? "");
  const chapterTranslation = String(infoSourate[2] ?? "");

  return (
    <div className="container mx-auto">
      {!isAuthReady || !userId ? (
        <div className="flex min-h-screen items-center justify-center bg-[#FBF3E4] text-[#3D3226]">
          <LoadingSpinner
            size="lg"
            color="gold"
            text="
        Initialisation de la connexion..."
          />
        </div>
      ) : (
        <>
          {/* Header premium avec navigation entre chapitres */}
          <div className="mb-2 flex flex-col gap-2">
            <div className="hidden sm:inline">
              {/* AnimatedBackButton à gauche */}
              <AnimatedBackButton />
            </div>

            {/* Barre de navigation chapitres - UI premium */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 12,
                delay: 0.15,
              }}
              className="flex items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-orange-400 via-yellow-300 to-amber-400 p-px shadow-xs"
            >
              <div className="flex w-full items-center justify-between rounded-2xl bg-[#FBF3E4]/95 px-2 py-1.5 backdrop-blur md:px-4 md:py-2">
                {/* Bouton chapitre précédent */}
                <button
                  onClick={goToPreviousChapter}
                  disabled={!hasPreviousChapter}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-orange-300 px-3 py-1.5 text-xs font-medium transition-all md:px-4 md:py-2 md:text-sm ${
                    hasPreviousChapter
                      ? "bg-orange-100 text-orange-800 hover:-translate-x-0.5 hover:bg-orange-200"
                      : "cursor-not-allowed bg-orange-50 text-orange-300"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 md:h-5 md:w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                  <span className="hidden sm:inline">Chapitre précédent</span>
                  <span className="sm:hidden">Préc.</span>
                </button>

                {/* Nom du chapitre centré — ouvre le tiroir de navigation des sourates */}
                <div className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setIsSourateDrawerOpen(true)}
                    aria-label="Parcourir toutes les sourates"
                    className="flex flex-col items-center text-center transition-opacity active:scale-95"
                  >
                    <span className="text-[11px] tracking-[0.18em] text-[#3D3226]/70 uppercase">
                      Chapitre {chapterNumber}
                    </span>
                    <div className="flex items-center justify-center gap-1 md:flex-col md:gap-0">
                      <span className="flex items-center gap-0.5 text-sm font-semibold text-[#3D3226] md:text-base">
                        {chapterName || `Sourate ${chapterNumber}`}
                        <ChevronDown size={14} className="text-[#3D3226]/50" />
                      </span>
                      {isMobile && (
                        <span className="text-[#3D3226]/50 md:text-xs">|</span>
                      )}
                      {chapterTranslation && (
                        <span className="text-red-800 md:text-xs">
                          {chapterTranslation}
                        </span>
                      )}
                    </div>
                  </button>
                  {completedAudioPartsCount >= 1 && (
                    <ResetProgressDialog
                      name={chapterName || `Sourate ${chapterNumber}`}
                      onConfirm={resetChapterProgress}
                      trigger={
                        <button
                          title="Réinitialiser la progression"
                          className="mt-1 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-red-200 hover:text-red-700 active:scale-95"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span>Réviser</span>
                        </button>
                      }
                    />
                  )}
                </div>

                {/* Bouton chapitre suivant */}
                <button
                  onClick={goToNextChapter}
                  disabled={!hasNextChapter}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium transition-all md:px-4 md:py-2 md:text-sm ${
                    hasNextChapter
                      ? "bg-amber-100 text-amber-800 hover:translate-x-0.5 hover:bg-amber-200"
                      : "cursor-not-allowed bg-amber-50 text-amber-300"
                  }`}
                >
                  <span className="hidden sm:inline">Chapitre suivant</span>
                  <span className="sm:hidden">Suiv.</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 md:h-5 md:w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Barre de sélection des parties audio - Version Desktop */}
          {!isMobile && audioParts.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 10,
                delay: 0.3,
              }}
              className="mb-2 flex flex-row items-center justify-center gap-2 rounded-lg bg-[#3D3226]/5 p-1 shadow-inner md:p-2"
            >
              {/* Flèche Gauche */}
              <motion.button
                onClick={handlePreviousPart}
                disabled={!canGoPrevious}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`rounded-full p-2 transition-colors duration-200 ${
                  canGoPrevious
                    ? "bg-[#d28820] text-white hover:bg-[#d28820]/90"
                    : "cursor-not-allowed bg-[#3D3226]/10 text-[#3D3226]/30"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="h-4 w-4 md:h-6 md:w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </motion.button>

              {/* Select universel */}
              <div className="flex w-full grow items-center justify-center gap-2">
                <Select
                  value={selectedPart?.id || ""}
                  onValueChange={(value) => {
                    const partIndex = audioParts.findIndex(
                      (p) => p.id === value,
                    );
                    if (partIndex !== -1) handlePartChange(partIndex);
                  }}
                  open={isSelectOpen}
                  onOpenChange={setIsSelectOpen}
                >
                  <SelectTrigger className="w-full max-w-55 md:max-w-65">
                    <SelectValue placeholder="Sélectionner une partie" />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {audioParts.map((part, index) => {
                      const uniqueVerses = new Set(
                        part.timings.map((t) => t.id),
                      );
                      const hasMultipleOccurrences =
                        part.timings.length > uniqueVerses.size;
                      const isCompleted =
                        part.id !== "remaining-verses" &&
                        completedPartIds.has(part.id);

                      if (isCompleted) {
                        return (
                          <React.Fragment key={part.id}>
                            {/* Hidden SelectItem so Radix tracks the value for SelectTrigger display */}
                            <SelectItem value={part.id} className="hidden">
                              {part.title || `Partie ${index + 1}`}
                            </SelectItem>
                            <CompletedSelectItem
                              part={part}
                              index={index}
                              hasMultipleOccurrences={hasMultipleOccurrences}
                              onSelect={() => {
                                handlePartChange(index);
                                setIsSelectOpen(false);
                              }}
                              onResetRequest={() => {
                                setIsSelectOpen(false);
                                setResetDialogPart({
                                  id: part.id,
                                  name: part.title || `Partie ${index + 1}`,
                                });
                              }}
                            />
                          </React.Fragment>
                        );
                      }

                      return (
                        <SelectItem
                          key={part.id}
                          value={part.id}
                          className={
                            part.id === "remaining-verses"
                              ? "font-medium text-orange-600"
                              : ""
                          }
                        >
                          <span className="flex items-center gap-2">
                            {part.id === "remaining-verses" ? (
                              <>
                                {part.title} ({part.timings.length})
                                <span className="text-xs text-orange-500">
                                  (sans audio)
                                </span>
                              </>
                            ) : (
                              <>
                                {part.title || `Partie ${index + 1}`}
                                {hasMultipleOccurrences && (
                                  <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">
                                    +occurrences
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {resetDialogPart && (
                  <ResetProgressDialog
                    name={resetDialogPart.name}
                    onConfirm={() => resetPartProgress(resetDialogPart.id)}
                    open={true}
                    onOpenChange={(o) => {
                      if (!o) setResetDialogPart(null);
                    }}
                  />
                )}
              </div>

              {/* Flèche Droite */}
              <motion.button
                onClick={handleNextPart}
                disabled={!canGoNext}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`rounded-full p-2 transition-colors duration-200 ${
                  canGoNext
                    ? "bg-[#d28820] text-white hover:bg-[#d28820]/90"
                    : "cursor-not-allowed bg-[#3D3226]/10 text-[#3D3226]/30"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="h-4 w-4 md:h-6 md:w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </motion.button>
            </motion.div>
          )}
          <div className="flex items-center justify-between py-1">
            {/* Pastille de complétion */}
            {selectedPart && selectedPart.id !== "remaining-verses" && (
              <div className="flex w-full items-center justify-center">
                <LongPressPartBadge
                  isCompleted={completedPartIds.has(selectedPart.id)}
                  partName={
                    selectedPart.title || `Partie ${currentPartIndex + 1}`
                  }
                  onReset={() => resetPartProgress(selectedPart.id)}
                />
              </div>
            )}
            <div className="flex items-center justify-center">
              {/* Navigation des parties audio - version mobile uniquement */}
              {isMobile && audioParts.length > 1 && (
                <div className="flex w-full items-center">
                  <HeaderRight
                    audioParts={audioParts}
                    currentPartIndex={currentPartIndex}
                    setCurrentPartIndex={handlePartChange}
                    completedPartIds={completedPartIds}
                    colors={headerColors}
                    onNextPart={handleNextPart}
                    onPreviousPart={handlePreviousPart}
                    onResetPart={resetPartProgress}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Affichage de l'ID utilisateur pour débogage */}
          {isAuthReady && !userId && (
            <div className="mb-2 text-center text-xs text-red-500">
              Erreur : Impossible d&#39;obtenir l&#39;ID utilisateur.
              Progression non sauvegardée. Vérifiez votre configuration Firebase
              et vos règles de sécurité.
            </div>
          )}

          {/* Le composant AudioVerseHighlighter */}
          <div className="container mx-auto">
            <AudioVerseHighlighter
              key={selectedPart?.id}
              audioUrl={currentAudioUrl}
              currentChapterId={chapterId}
              totalChapters={TOTAL_CHAPTERS}
              verses={memoizedVersesToDisplay}
              infoSourate={memoizedInfoSourate}
              onAudioFinished={handleAudioFinished}
              hasNextChapter={hasNextChapter}
              hasPreviousChapter={hasPreviousChapter}
              currentPartIndex={currentPartIndex}
              totalParts={chapterProgress.totalParts}
              onPartChange={setPartByIndex}
              onPlayingChange={setIsAudioPlaying}
              onAtTopChange={setIsVerseContainerAtTop}
              onRegisterAudioControls={handleRegisterAudioControls}
            >
              <div
                className={`sticky top-2 z-20 flex h-[2.7rem] w-full items-center justify-center border-b border-gray-100 bg-linear-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 py-2 text-center text-gray-800 shadow backdrop-blur transition-all duration-300 md:-top-2.5 md:h-[3.8rem] md:text-5xl ${isAudioPlaying || !isVerseContainerAtTop ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
              >
                <div className="font-sura absolute z-30 flex h-full w-full items-center justify-center">
                  <div className="mx-auto flex h-[90%] min-h-0 w-fit max-w-3xl items-center justify-center rounded-lg bg-white/90 px-3 py-3 shadow md:rounded-2xl md:px-5">
                    <h1
                      className="bg-clip-text text-4xl leading-normal font-medium text-gray-800 md:text-5xl"
                      style={{
                        textShadow: "0 2px 6px rgba(0,0,0,0.18)",
                      }}
                    >
                      {`surah${Number(infoSourate[0]) < 10 ? "00" : Number(infoSourate[0]) < 100 ? "0" : ""}${Number(infoSourate[0])}`}
                      surah-icon
                    </h1>
                  </div>
                </div>
              </div>
            </AudioVerseHighlighter>
          </div>
        </>
      )}
      <SourateDrawer
        chapters={allChapters}
        currentChapterId={chapterId}
        open={isSourateDrawerOpen}
        onOpenChange={setIsSourateDrawerOpen}
      />
    </div>
  );
}
