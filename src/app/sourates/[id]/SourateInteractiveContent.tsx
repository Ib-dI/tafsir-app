"use client";

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
import { auth, db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedBackButton from "./AnimatedBackButton";

// Importations Firestore spécifiques pour les opérations
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { SourateInteractiveContentProps, TafsirAudioPart } from "@/types/types";
import type { Verse } from "@/types/types";
import { useMediaQuery } from "@/components/UseMediaQuery";

const AudioVerseHighlighter = dynamic(
  () => import("@/components/AudioVerseHighlighter"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] w-full items-center justify-center py-12">
        <LoadingSpinner
          size="lg"
          color="blue"
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

export default function SourateInteractiveContent({
  verses: initialVerses,
  audioParts: initialAudioParts,
  infoSourate,
  chapterId,
}: SourateInteractiveContentProps) {
  const router = useRouter();
  const [audioParts] = useState(() =>
    buildAudioParts(initialAudioParts, initialVerses),
  );

  const [selectedPart, setSelectedPart] = useState<TafsirAudioPart | null>(
    () => buildAudioParts(initialAudioParts, initialVerses)[0] ?? null,
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [completedPartIds, setCompletedPartIds] = useState<Set<string>>(
    new Set(),
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isVerseContainerAtTop, setIsVerseContainerAtTop] = useState(true);

  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const navigateToPartRef = useRef<((partIndex: number) => void) | null>(null);

  const handleNavigateToPart = useCallback(
    (navigateFunction: (partIndex: number) => void) => {
      navigateToPartRef.current = navigateFunction;
    },
    [],
  );

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

  // useEffect: Gère l'authentification et récupère l'ID utilisateur
  useEffect(() => {
    if (!auth) {
      console.error(
        "SourateInteractiveContent: ERREUR - Firebase Auth n'est pas initialisé. Vérifiez src/lib/firebase.ts et .env.local.",
      );
      setUserId(crypto.randomUUID());
      setIsAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        console.log(
          "SourateInteractiveContent: Aucun utilisateur Firebase. Tentative de connexion anonyme...",
        );
        try {
          await signInAnonymously(auth);
          const newUid = auth.currentUser?.uid;
          setUserId(newUid || crypto.randomUUID());
        } catch (error) {
          console.error(
            "SourateInteractiveContent: ERREUR - Erreur d'authentification anonyme Firebase:",
            error,
          );
          setUserId(crypto.randomUUID());
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // useEffect: Écoute les changements de progression depuis Firestore
  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      return;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error(
        "SourateInteractiveContent: ERREUR - NEXT_PUBLIC_FIREBASE_PROJECT_ID n'est pas défini. Vérifiez .env.local.",
      );
      return;
    }

    const progressCollectionRef = collection(
      db,
      `artifacts/${projectId}/users/${userId}/progress`,
    );
    const q = query(progressCollectionRef, where("chapterId", "==", chapterId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newCompletedPartIds = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.partId) {
            newCompletedPartIds.add(data.partId);
          }
        });
        setCompletedPartIds(newCompletedPartIds);
      },
      (error: Error) => {
        console.error(
          "SourateInteractiveContent: ERREUR d'écoute de la progression Firestore:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, userId, chapterId]);

  // Fonction pour marquer une partie comme complétée
  const markPartAsCompleted = useCallback(
    async (completedChapterId: number, completedPartId: string) => {
      console.log(
        "markPartAsCompleted called",
        completedChapterId,
        completedPartId,
      );
      if (!db || !userId) {
        console.warn(
          "SourateInteractiveContent: AVERTISSEMENT - Firestore ou User ID non disponible. Impossible de marquer la partie comme complétée.",
        );
        return;
      }

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) {
        console.error("Project ID not found");
        return;
      }

      try {
        const progressRef = doc(
          db,
          `artifacts/${projectId}/users/${userId}/progress/${completedPartId}`,
        );
        await setDoc(progressRef, {
          chapterId: completedChapterId,
          partId: completedPartId,
          completedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error marking part as completed:", error);
      }
    },
    [userId],
  );

  // Setter pur — passé comme onPartChange à AudioVerseHighlighter.
  // Ne passe PAS par navigateToPartRef pour éviter la récursion :
  // navigateToPart (AVH) → onPartChange → setPartByIndex → setSelectedPart ✓
  const setPartByIndex = useCallback(
    (newPartIndex: number) => {
      if (newPartIndex >= 0 && newPartIndex < audioParts.length) {
        setSelectedPart(audioParts[newPartIndex]);
      }
    },
    [audioParts],
  );

  // Handler complet pour les boutons/select du parent.
  // Passe par navigateToPartRef si disponible (pour que AVH fasse son cleanup
  // hasManualNavigation + clearProgress), sinon bascule sur setPartByIndex.
  const handlePartChange = useCallback(
    (newPartIndex: number) => {
      if (navigateToPartRef.current) {
        navigateToPartRef.current(newPartIndex);
      } else {
        setPartByIndex(newPartIndex);
      }
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
              noAudio: boolean;
              verset: string;
              occurrences: { startTime: number; endTime: number }[];
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
    card: "#f9fafb", // bg-gray-50
    border: "#e5e7eb", // border-gray-200
    text: "#1f2937", // text-gray-800
    primary: "#3b82f6", // blue-500
    textSecondary: "#6b7280", // text-gray-500
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
      {!isAuthReady || !db || !userId ? (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 text-blue-600">
          <LoadingSpinner
            size="lg"
            color="blue"
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
              className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-400 via-yellow-300 to-amber-400 p-[1px] shadow-xs"
            >
              <div className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-2 py-1.5 backdrop-blur md:px-4 md:py-2">
                {/* Bouton chapitre précédent */}
                <button
                  onClick={goToPreviousChapter}
                  disabled={!hasPreviousChapter}
                  className={`inline-flex items-center gap-1.5 border border-orange-300 rounded-full px-3 py-1.5 text-xs font-medium transition-all md:px-4 md:py-2 md:text-sm ${
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

                {/* Nom du chapitre centré */}
                <div className="flex flex-col items-center text-center">
                  <span className="text-[11px] tracking-[0.18em] text-gray-700 uppercase">
                    Chapitre {chapterNumber}
                  </span>
                  <div className="flex items-center justify-center gap-1 md:flex-col md:gap-0">
                    <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-sm font-semibold text-transparent md:text-base">
                      {chapterName || `Sourate ${chapterNumber}`}
                    </span>
                    {isMobile && (
                      <span className="text-gray-500 md:text-xs">|</span>
                    )}
                    {chapterTranslation && (
                      <span className="text-red-800 md:text-xs">
                        {chapterTranslation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton chapitre suivant */}
                <button
                  onClick={goToNextChapter}
                  disabled={!hasNextChapter}
                  className={`inline-flex items-center gap-1.5 border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium transition-all md:px-4 md:py-2 md:text-sm ${
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
              className="mb-2 flex flex-row items-center justify-center gap-2 rounded-lg bg-gray-50 p-1 shadow-inner md:p-2"
            >
              {/* Flèche Gauche */}
              <motion.button
                onClick={handlePreviousPart}
                disabled={!canGoPrevious}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`rounded-full p-2 transition-colors duration-200 ${
                  canGoPrevious
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-300 text-gray-500"
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
              <div className="flex w-full flex-grow items-center justify-center gap-2">
                <Select
                  value={selectedPart?.id || ""}
                  onValueChange={(value) => {
                    const part = audioParts.find((p) => p.id === value);
                    if (part) {
                      const partIndex = audioParts.findIndex(
                        (p) => p.id === value,
                      );
                      handlePartChange(partIndex);
                    }
                  }}
                >
                  <SelectTrigger className="w-full max-w-[220px] md:max-w-[260px]">
                    <SelectValue placeholder="Sélectionner une partie" />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {audioParts.map((part, index) => {
                      // Compter les versets uniques et les occurrences multiples
                      const uniqueVerses = new Set(
                        part.timings.map((t) => t.id),
                      );
                      const totalOccurrences = part.timings.length;
                      const hasMultipleOccurrences =
                        totalOccurrences > uniqueVerses.size;

                      return (
                        <SelectItem
                          key={part.id}
                          value={part.id}
                          className={
                            part.id === "remaining-verses"
                              ? "font-medium text-blue-600"
                              : ""
                          }
                        >
                          <span className="flex items-center gap-2">
                            {part.id === "remaining-verses" ? (
                              <>
                                {part.title} ({part.timings.length})
                                <span className="text-xs text-blue-500">
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
                                {completedPartIds.has(part.id) && (
                                  <span className="z-10 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow">
                                    <svg
                                      width="8"
                                      height="8"
                                      viewBox="0 0 20 20"
                                      fill="none"
                                    >
                                      <path
                                        d="M5 10.5L8.5 14L15 7"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
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
              </div>

              {/* Flèche Droite */}
              <motion.button
                onClick={handleNextPart}
                disabled={!canGoNext}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`rounded-full p-2 transition-colors duration-200 ${
                  canGoNext
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-300 text-gray-500"
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
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    completedPartIds.has(selectedPart.id)
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {completedPartIds.has(selectedPart.id) ? (
                    <>
                      <svg
                        className="mr-1 h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Partie complétée
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-1 h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                        />
                      </svg>
                      Partie non complétée
                    </>
                  )}
                </span>
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
              totalParts={audioParts.length}
              onPartChange={setPartByIndex}
              onNavigateToPart={handleNavigateToPart}
              onPlayingChange={setIsAudioPlaying}
              onAtTopChange={setIsVerseContainerAtTop}
            >
              <div className={`sticky top-[-8px] z-20 flex w-full items-center justify-center border-b border-gray-100 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 py-2 text-center text-gray-800 shadow backdrop-blur h-[2.7rem] md:top-[-10px] md:h-[3.8rem] md:text-5xl transition-all duration-300 ${(isAudioPlaying || !isVerseContainerAtTop) ? "opacity-0 pointer-events-none -translate-y-full" : "opacity-100 translate-y-0"}`}>
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
    </div>
  );
}
