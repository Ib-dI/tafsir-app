"use client";

import { audiosTafsir } from "@/lib/data/audios";
import { auth, db } from "@/lib/firebase";
import { getSimpleChapters } from "@/lib/quranSimpleApi";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // Ajout de useCallback

type Chapter = {
  id: number;
  transliteration: string;
  name: string;
  translation: string;
  total_verses: number;
  type: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      // staggerChildren est maintenant directement sur le composant motion.ul
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 10 },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function SouratePage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook pour lire les paramètres d'URL

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Initialise showOnlyWithAudio à partir du paramètre d'URL 'showAudio'
  // Si 'showAudio' est 'all', alors false (afficher tout), sinon true (afficher avec audio seulement)
  // On le définit après le premier rendu via useEffect pour s'assurer que searchParams est prêt
  const [showOnlyWithAudio, setShowOnlyWithAudio] = useState<boolean>(true); // Valeur par défaut robuste

  const [completedChaptersByPartId, setCompletedChaptersByPartId] = useState<
    Set<string>
  >(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const sourateIdsWithAudio = useMemo(
    () =>
      new Set<number>(
        audiosTafsir
          .filter(
            (audio) =>
              audio.parts && audio.parts.length > 0 && audio.parts[0].url,
          )
          .map((audio) => audio.id),
      ),
    [], // audiosTafsir est une constante, pas besoin de la mettre en dépendance ici
  );

  // Premier useEffect: Charger les chapitres et initialiser le filtre basé sur l'URL
  useEffect(() => {
    async function loadChaptersAndSetInitialFilter() {
      try {
        setLoading(true);
        const fetchedChapters = await getSimpleChapters();
        if (fetchedChapters) {
          setChapters(fetchedChapters); // Stocke tous les chapitres

          // Lire la valeur du paramètre d'URL une fois que searchParams est prêt
          const initialShowAudioFromUrl =
            searchParams.get("showAudio") !== "all";
          setShowOnlyWithAudio(initialShowAudioFromUrl);

          // Appliquer le filtre initial immédiatement après avoir chargé les chapitres
          let initialChaptersToFilter = fetchedChapters;
          if (initialShowAudioFromUrl) {
            initialChaptersToFilter = fetchedChapters.filter(
              (chapter: Chapter) => sourateIdsWithAudio.has(chapter.id),
            );
          }
          setFilteredChapters(initialChaptersToFilter); // Initialise filteredChapters ici
        } else {
          setError(true);
        }
      } catch (e) {
        console.error("Failed to load chapters:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadChaptersAndSetInitialFilter();
  }, [searchParams, sourateIdsWithAudio]); // Dépend de searchParams et sourateIdsWithAudio (même si constant, bonne pratique)

  // Auth anonyme (factorisé)
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) setUserId(user.uid);
      else {
        await signInAnonymously(auth);
        setUserId(auth.currentUser?.uid ?? null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Écoute la progression
  useEffect(() => {
    if (!db || !userId) return;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return;
    const progressRef = collection(
      db,
      `artifacts/${projectId}/users/${userId}/progress`,
    );
    return onSnapshot(progressRef, (snapshot) => {
      const completed = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.partId) completed.add(data.partId);
      });
      setCompletedChaptersByPartId(completed);
    });
  }, [userId]);

  // Défilement vers le haut de la page au montage (pour navigation)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Effet pour re-filtrer quand le terme de recherche OU l'état du filtre audio change
  // Ce useEffect s'exécutera après le chargement initial si chapters, searchTerm ou showOnlyWithAudio changent
  useEffect(() => {
    if (loading) return; // Ne filtre pas si les chapitres ne sont pas encore chargés (pour éviter le filtrage sur chapters vides)

    let currentChaptersToFilter = chapters;

    if (showOnlyWithAudio) {
      currentChaptersToFilter = chapters.filter((chapter: Chapter) =>
        sourateIdsWithAudio.has(chapter.id),
      );
    }

    if (searchTerm === "") {
      setFilteredChapters(currentChaptersToFilter);
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const results = currentChaptersToFilter.filter(
        (chapter) =>
          chapter.transliteration
            .toLowerCase()
            .includes(lowercasedSearchTerm) ||
          chapter.name.toLowerCase().includes(lowercasedSearchTerm) ||
          chapter.translation.toLowerCase().includes(lowercasedSearchTerm) ||
          chapter.id.toString().includes(lowercasedSearchTerm),
      );
      setFilteredChapters(results);
    }
  }, [searchTerm, chapters, showOnlyWithAudio, sourateIdsWithAudio, loading]); // Ajout de 'loading' pour déclencher le filtre après le chargement

  const handleFocus = useCallback(() => {
    // Utilisez useCallback pour cette fonction
    if (searchInputRef.current) {
      const inputRect = searchInputRef.current.getBoundingClientRect();
      const offset = 10;
      const scrollPosition = window.scrollY + inputRect.top - offset;

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  }, []); // Aucune dépendance car searchInputRef.current est constant sur le cycle de vie du composant

  const handleBlur = () => {
    // Laisser vide pour le moment, ou ajouter une logique si nécessaire
  };

  // Nouvelle fonction pour gérer le changement du filtre et mettre à jour l'URL
  const toggleShowOnlyWithAudio = () => {
    const newState = !showOnlyWithAudio;
    setShowOnlyWithAudio(newState);

    // Crée une nouvelle URLSearchParams à partir de l'actuelle
    const currentParams = new URLSearchParams(searchParams.toString());
    if (newState) {
      currentParams.delete("showAudio"); // Si true, on n'a pas besoin du paramètre (URL plus propre)
    } else {
      currentParams.set("showAudio", "all"); // Si false, on met 'all'
    }

    // Met à jour l'URL sans recharger la page
    router.replace(`?${currentParams.toString()}`);
  };

  if (loading && chapters.length === 0) {
    // Condition de chargement plus robuste
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-blue-600">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-blue-500"></div>
        <p className="text-lg">Chargement des chapitres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-red-600">
        Erreur lors du chargement des chapitres. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8 w-full rounded-lg bg-white p-4 shadow-lg">
      <h1 className="mb-6 text-center text-4xl font-bold text-balance text-gray-800 md:text-5xl">
        Chapitres du Coran
      </h1>

      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.2 }}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Rechercher une sourate (nom, traduction, numéro...)"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </motion.div>

      {/* Bouton pour filtrer par audio */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.3 }}
        className="mb-6 text-center"
      >
        <button
          onClick={toggleShowOnlyWithAudio} // Utilise la nouvelle fonction
          className={`rounded-full px-5 py-2 font-semibold text-white transition-colors duration-300 ${
            showOnlyWithAudio
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {showOnlyWithAudio
            ? "Afficher toutes les sourates"
            : "Afficher les sourates avec audio"}
        </button>
      </motion.div>

      <motion.ul
        className="flex w-full flex-col flex-wrap items-center justify-center gap-2 md:flex-row md:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
      >
        <AnimatePresence mode="popLayout">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter: Chapter) => {
              // Trouver les parties audio pour cette sourate
              const audioData = audiosTafsir.find((a) => a.id === chapter.id);
              const partIds = audioData?.parts?.map((part) => part.id) || [];
              // Parties terminées pour cette sourate
              const completedPartIds = new Set(
                Array.from(completedChaptersByPartId).filter((partId) =>
                  partIds.includes(partId),
                ),
              );
              const totalParts = partIds.length;
              const completedParts = completedPartIds.size;
              const isFullyCompleted =
                totalParts > 0 && completedParts === totalParts;
              const progressPercent =
                totalParts > 0
                  ? Math.round((completedParts / totalParts) * 100)
                  : 0;
              return (
                <motion.li
                  key={chapter.id}
                  variants={itemVariants}
                  layout
                  className={`group relative w-full cursor-pointer rounded-lg px-2 py-4 transition-colors duration-200 md:w-80 ${isFullyCompleted ? "bg-emerald-50 hover:bg-emerald-100" : "bg-gray-50 hover:bg-gray-100"} `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    router.push(
                      `/sourates/${chapter.id}${!showOnlyWithAudio ? "?showAudio=all" : ""}`,
                    )
                  }
                  tabIndex={0}
                  role="button"
                  style={{ textDecoration: "none" }}
                >
                  {/* Barre de progression flottante en haut à droite */}
                  {totalParts > 0 && (
                    <div
                      className={`absolute right-2 bottom-2 z-20 flex items-center`}
                    >
                      <div
                        className={`h-2 w-16 overflow-hidden rounded-full shadow-sm ${isFullyCompleted ? "bg-emerald-100" : "bg-gray-200"}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${isFullyCompleted ? "bg-green-400" : "border-amber-50 bg-green-500 hover:border"}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span
                        className={`ml-2 text-xs font-semibold ${isFullyCompleted ? "text-emerald-800" : "text-gray-600"}`}
                      >
                        {progressPercent}%
                      </span>
                    </div>
                  )}
                  {/* Badge progression en bas à droite */}
                  {/* {isFullyCompleted && (
                    <span
                      className="absolute bottom-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow z-10"
                      title="Sourate complétée"
                    >
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )} */}
                  <div className="flex flex-grow items-center justify-between gap-2">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold ${isFullyCompleted ? "bg-white text-emerald-700 shadow group-hover:bg-white group-hover:text-emerald-700" : "bg-slate-200 text-blue-500"} `}
                    >
                      {chapter.id}
                    </div>
                    <div className="flex min-w-0 flex-grow flex-col">
                      <div className="flex items-center gap-2">
                        <strong
                          className={`text-md truncate ${isFullyCompleted ? "text-emerald-800" : "text-gray-800"}`}
                        >
                          {chapter.transliteration}
                        </strong>
                        <span
                          className={`font-sura -mt-1 truncate text-xl ${isFullyCompleted ? "text-emerald-600" : ""}`}
                        >{`surah${chapter.id < 10 ? "00" : chapter.id < 100 ? "0" : ""}${chapter.id}`}</span>
                      </div>
                      <p
                        className={`truncate text-sm ${isFullyCompleted ? "text-emerald-800" : "text-gray-700"}`}
                      >
                        <span className="inline-block max-w-[110px] truncate overflow-hidden align-bottom font-semibold whitespace-nowrap">
                          {chapter.translation}
                        </span>
                        <span className="font-mono text-xs">
                          {" "}
                          -{" "}
                          <span className="font-semibold">
                            {chapter.total_verses}
                          </span>{" "}
                          versets
                        </span>
                      </p>
                    </div>
                    <div
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-sm font-semibold ${isFullyCompleted ? "border border-emerald-200 bg-white text-emerald-700 group-hover:bg-white group-hover:text-emerald-700" : "bg-blue-100 text-blue-500"} `}
                    >
                      {chapter.type === "meccan" ? "Mecque" : "Médine"}
                    </div>
                  </div>
                  <div className="ml-9">
                    {/* Affichage conditionnel des icônes audio */}
                    {sourateIdsWithAudio.has(chapter.id) ? (
                      isFullyCompleted ? (
                        <div className="flex">
                          <AudioLines
                            size={18}
                            className="inline-block text-emerald-600"
                          />
                          <AudioLines
                            size={18}
                            className="inline-block text-emerald-300"
                          />
                        </div>
                      ) : (
                        <div className="flex">
                          <AudioLines
                            size={18}
                            className="inline-block text-blue-500"
                          />
                          <AudioLines
                            size={18}
                            className="inline-block text-gray-400"
                          />
                        </div>
                      )
                    ) : (
                      <div className="h-[18px]"></div>
                    )}
                  </div>
                </motion.li>
              );
            })
          ) : (
            <motion.li
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center text-gray-500"
            >
              Aucun chapitre ne correspond à votre recherche ou ne contient
              d&apos;audio.
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
