"use client";

// Importez les instances pré-initialisées depuis votre fichier src/lib/firebase.ts
import AudioVerseHighlighter from "@/components/AudioVerseHighlighter";
import HeaderRight from "@/components/HeaderRight"; // Import du nouveau composant
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import { motion } from "framer-motion";
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


export default function SourateInteractiveContent({
  verses: initialVerses,
  audioParts: initialAudioParts,
  infoSourate,
  chapterId,
}: SourateInteractiveContentProps) {
  // Modification: Initialize audioParts state first
  const [audioParts] = useState(() => {
    // Créer un Map pour suivre toutes les occurrences des versets
    const verseOccurrencesMap = new Map<number, number>();
    
    // Parcourir toutes les parties audio pour compter les occurrences
    initialAudioParts.forEach(part => {
      part.timings.forEach(timing => {
        const currentCount = verseOccurrencesMap.get(timing.id) || 0;
        verseOccurrencesMap.set(timing.id, currentCount + 1);
      });
    });

    // Créer un Set avec tous les IDs de versets déjà couverts
    const coveredVerseIds = new Set(
      initialAudioParts.flatMap((part) =>
        part.timings.map((timing) => timing.id),
      ),
    );

    // Trouver les versets qui ne sont pas dans les parties existantes
    const remainingVerses = initialVerses.filter(
      (verse) => !coveredVerseIds.has(verse.id),
    );

    // Si on trouve des versets restants, créer une nouvelle partie
    if (remainingVerses.length > 0) {
      const newPart = {
        id: "remaining-verses",
        title: `Partie ${initialAudioParts.length + 1}`,
        url: "", // pas d'audio
        timings: remainingVerses.map((verse) => ({
          id: verse.id,
          startTime: 0,
          endTime: 0,
          occurrence: 1,
        })),
      };

      // Retourner le tableau avec la nouvelle partie ajoutée
      return [...initialAudioParts, newPart];
    }

    return initialAudioParts;
  });

  const [selectedPart, setSelectedPart] = useState<TafsirAudioPart | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [completedPartIds, setCompletedPartIds] = useState<Set<string>>(new Set());

  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const [navigateToPartFunction, setNavigateToPartFunction] = useState<((partIndex: number) => void) | null>(null);

  // ✅ CALLBACK pour recevoir la fonction d'AudioVerseHighlighter
const handleNavigateToPart = useCallback((navigateFunction: (partIndex: number) => void) => {
  console.log('📞 Fonction navigateToPart reçue d\'AudioVerseHighlighter');
  setNavigateToPartFunction(() => navigateFunction);
}, []);

  // Vérifier si on est sur mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Initialise selectedPart lorsque le composant est monté ou que les parties audio changent
  useEffect(() => {
    if (audioParts.length > 0 && !selectedPart) {
      setSelectedPart(audioParts[0]);
    }
  }, [audioParts, selectedPart]);

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
  }, [isAuthReady, db, userId, chapterId]);

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
    [db, userId],
  );

  // Fonction de changement de partie - VERSION CORRIGÉE
 const handlePartChange = useCallback((newPartIndex: number) => {
  console.log('🔄 SourateInteractiveContent handlePartChange appelé:', newPartIndex);
  
  if (navigateToPartFunction) {
    // ✅ Utiliser la fonction optimisée d'AudioVerseHighlighter
    navigateToPartFunction(newPartIndex);
  } else {
    // Fallback vers la méthode standard
    if (newPartIndex >= 0 && newPartIndex < audioParts.length) {
      setSelectedPart(audioParts[newPartIndex]);
    }
  }
}, [navigateToPartFunction, audioParts, setSelectedPart]);

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
          const verseMap = new Map<number, {
            id: number;
            text: string;
            translation: string;
            transliteration: string;
            noAudio: boolean;
            verset: string;
            occurrences: { startTime: number; endTime: number }[];
          }>();

          selectedPart.timings.forEach((timing) => {
            const originalVerse = initialVerses.find(v => v.id === timing.id);
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

  // Callback de fin d'audio modifié
  const handleAudioFinished = useCallback(() => {
    if (!selectedPart) return;

    // Marquer comme complété si ce n'est pas déjà fait
    if (!completedPartIds.has(selectedPart.id)) {
      markPartAsCompleted(chapterId, selectedPart.id);
    }

    // Passer à la suite
    const currentIndex = audioParts.findIndex((p) => p.id === selectedPart.id);
    if (currentIndex !== -1 && currentIndex < audioParts.length - 1) {
      handlePartChange(currentIndex + 1);
    }
  }, [
    selectedPart,
    chapterId,
    completedPartIds,
    audioParts,
    markPartAsCompleted,
    handlePartChange,
  ]);

  const memoizedVersesToDisplay = useMemo(
    () => versesToDisplay.filter(Boolean),
    [selectedPart, initialVerses],
  );
  
  const memoizedInfoSourate = useMemo(
    () => infoSourate.map(String),
    [infoSourate],
  );

  if (!isAuthReady || !db || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-blue-600">
        Initialisation de la connexion...
      </div>
    );
  }

  // Définition des couleurs pour HeaderRight
  const headerColors = {
    card: "#f9fafb", // bg-gray-50
    border: "#e5e7eb", // border-gray-200
    text: "#1f2937", // text-gray-800
    primary: "#3b82f6", // blue-500
    textSecondary: "#6b7280", // text-gray-500
  };

  return (
    <div className="container mx-auto">
      {/* HeaderRight pour la version mobile - affiché en haut de la page */}
      <div className="flex items-center h-10 justify-between mb-4">
        {/* AnimatedBackButton à gauche */}
        <div className="flex-shrink-0">
          <AnimatedBackButton />
        </div>
        
        {/* HeaderRight à droite - version mobile uniquement */}
        {isMobile && audioParts.length > 1 && (
          <div className="flex-shrink-0 -mt-4">
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
          className="mb-2 flex flex-row items-center justify-center gap-2 rounded-lg bg-gray-50 p-1 md:p-2 shadow-inner"
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
                  const partIndex = audioParts.findIndex((p) => p.id === value);
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
                  const uniqueVerses = new Set(part.timings.map(t => t.id));
                  const totalOccurrences = part.timings.length;
                  const hasMultipleOccurrences = totalOccurrences > uniqueVerses.size;
                  
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
                              <span className="text-xs text-purple-600 bg-purple-100 px-1 rounded">
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

      {/* Affichage de l'ID utilisateur pour débogage */}
      {isAuthReady && !userId && (
        <div className="mb-2 text-center text-xs text-red-500">
          Erreur : Impossible d&#39;obtenir l&#39;ID utilisateur. Progression
          non sauvegardée. Vérifiez votre configuration Firebase et vos règles
          de sécurité.
        </div>
      )}

      {/* Pastille de complétion */}
      {selectedPart && selectedPart.id !== "remaining-verses" && (
        <div className="mb-2 flex justify-center">
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

      {/* Le composant AudioVerseHighlighter */}
      <div className="container mx-auto">
        <AudioVerseHighlighter
          key={selectedPart?.id}
          audioUrl={currentAudioUrl}
          currentChapterId={chapterId}
          verses={memoizedVersesToDisplay}
          infoSourate={memoizedInfoSourate}
          onAudioFinished={handleAudioFinished}
          currentPartIndex={currentPartIndex}
          totalParts={audioParts.length}
          onPartChange={handlePartChange}
          onNavigateToPart={handleNavigateToPart}
        >
          <div className="sticky top-[-8px] md:top-[-10px] z-20 flex w-full items-center justify-center border-b border-gray-100 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 py-6 text-center text-gray-800 shadow backdrop-blur-lg md:min-h-[3.8rem] md:text-5xl">
            <h1 className="font-sura absolute z-30 flex h-full w-full items-center justify-center">
              <div className="mx-auto flex h-[90%] min-h-0 w-fit max-w-3xl items-center justify-center rounded-lg md:rounded-2xl bg-white/90 px-3 py-3 shadow md:px-8">
                <span
                  className="bg-clip-text text-4xl leading-normal font-medium text-gray-800 md:text-5xl"
                  style={{
                    textShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  }}
                >
                  {`surah${Number(infoSourate[0]) < 10 ? "00" : Number(infoSourate[0]) < 100 ? "0" : ""}${Number(infoSourate[0])}`}surah-icon
                </span>
              </div>
            </h1>
          </div>
        </AudioVerseHighlighter>
      </div>
    </div>
  );
}