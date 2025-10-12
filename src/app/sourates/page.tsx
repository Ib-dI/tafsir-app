"use client";

import { audiosTafsir } from "@/lib/data/audios";
import { auth, db } from "@/lib/firebase";
import { getSimpleChapters } from "@/lib/quranSimpleApi";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Search, Heart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const searchParams = useSearchParams();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // États pour les filtres
  const [showOnlyWithAudio, setShowOnlyWithAudio] = useState<boolean>(true);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  const [completedChaptersByPartId, setCompletedChaptersByPartId] = useState<
    Set<string>
  >(new Set());
  
  // État pour les favoris
  const [favoriteChapters, setFavoriteChapters] = useState<Set<number>>(new Set());
  
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
    [],
  );

  // Premier useEffect: Charger les chapitres et initialiser les filtres basés sur l'URL
  useEffect(() => {
    async function loadChaptersAndSetInitialFilter() {
      try {
        setLoading(true);
        setError(false);
        
        const fetchedChapters = await getSimpleChapters();
        
        if (fetchedChapters) {
          // Animation fluide lors du chargement des données
          await new Promise(resolve => setTimeout(resolve, 100));
          
          setChapters(fetchedChapters);

          // Lire les valeurs des paramètres d'URL
          const initialShowAudioFromUrl = searchParams.get("showAudio") !== "all";
          const initialShowFavoritesFromUrl = searchParams.get("showFavorites") === "true";
          
          setShowOnlyWithAudio(initialShowAudioFromUrl);
          setShowOnlyFavorites(initialShowFavoritesFromUrl);

          // Le filtrage initial sera fait par l'useEffect de filtrage
          setFilteredChapters(fetchedChapters);
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
  }, [searchParams, sourateIdsWithAudio]);

  // Auth anonyme
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

  // Écoute les favoris avec gestion d'erreur améliorée
  useEffect(() => {
    if (!db || !userId) {
      console.log("Pas de DB ou userId pour les favoris:", { db: !!db, userId });
      return;
    }
    
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.log("Project ID manquant pour les favoris");
      return;
    }
    
    console.log("Initialisation de l'écoute des favoris pour userId:", userId);
    
    const favoritesRef = collection(
      db,
      `artifacts/${projectId}/users/${userId}/favorites`,
    );
    
    const unsubscribe = onSnapshot(
      favoritesRef, 
      (snapshot) => {
        const favorites = new Set<number>();
        console.log("Snapshot favoris reçu, nombre de documents:", snapshot.size);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const chapterId = parseInt(doc.id);
          console.log("Document favori:", { id: doc.id, chapterId, data });
          
          if (!isNaN(chapterId)) {
            favorites.add(chapterId);
          }
        });
        
        console.log("Favoris mis à jour:", Array.from(favorites));
        setFavoriteChapters(favorites);
      },
      (error) => {
        console.error("Erreur lors de l'écoute des favoris:", error);
      }
    );
    
    return () => {
      console.log("Nettoyage de l'écoute des favoris");
      unsubscribe();
    };
  }, [userId]);

  // Défilement vers le haut de la page au montage
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Effet pour filtrer les chapitres
  useEffect(() => {
    if (loading) return;

    let currentChaptersToFilter = chapters;

    // Filtre par audio
    if (showOnlyWithAudio) {
      currentChaptersToFilter = currentChaptersToFilter.filter((chapter: Chapter) =>
        sourateIdsWithAudio.has(chapter.id),
      );
    }

    // Filtre par favoris
    if (showOnlyFavorites) {
      currentChaptersToFilter = currentChaptersToFilter.filter((chapter: Chapter) =>
        favoriteChapters.has(chapter.id),
      );
    }

    // Filtre par terme de recherche
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
  }, [searchTerm, chapters, showOnlyWithAudio, showOnlyFavorites, sourateIdsWithAudio, favoriteChapters, loading]);

  const handleFocus = useCallback(() => {
    if (searchInputRef.current) {
      const inputRect = searchInputRef.current.getBoundingClientRect();
      const offset = 20;
      const scrollPosition = window.scrollY + inputRect.top - offset;

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  }, []);

  // Fonction pour gérer le changement du filtre audio et mettre à jour l'URL
  const toggleShowOnlyWithAudio = () => {
    const newState = !showOnlyWithAudio;
    setShowOnlyWithAudio(newState);
    updateURLParams({ showAudio: newState ? undefined : "all" });
  };

  // Fonction pour gérer le changement du filtre favoris et mettre à jour l'URL
  const toggleShowOnlyFavorites = () => {
    const newState = !showOnlyFavorites;
    setShowOnlyFavorites(newState);
    updateURLParams({ showFavorites: newState ? "true" : undefined });
  };

  // Fonction utilitaire pour mettre à jour les paramètres d'URL
  const updateURLParams = (params: { showAudio?: string; showFavorites?: string }) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });

    router.replace(`?${currentParams.toString()}`);
  };

  // Fonction pour basculer le statut de favori d'un chapitre
  const toggleFavorite = async (chapterId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Empêche la navigation vers le chapitre
    
    if (!db || !userId) return;
    
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return;

    const favoriteRef = doc(
      db,
      `artifacts/${projectId}/users/${userId}/favorites`,
      chapterId.toString()
    );

    try {
      if (favoriteChapters.has(chapterId)) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, {
          chapterId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des favoris:", error);
    }
  };

  if (loading && chapters.length === 0) {
    return (
      <div className="container mx-auto mt-8 w-full rounded-lg bg-white p-4 shadow-lg">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-600 text-balance mx-auto mb-8 max-w-[600px] text-center text-4xl font-bold !leading-[1.0] tracking-tighter text-gray-900 lg:max-w-[800px] lg:text-6xl"
        >
          📑Chapitres du Coran 📖
        </motion.h1>

        {/* Skeleton pour la barre de recherche */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full mb-6"
        >
          <div className="w-full h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse" />
        </motion.div>

        {/* Skeleton pour les filtres */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 bg-gray-50 p-4 rounded-xl"
        >
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <div className="h-10 w-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse" />
            <div className="h-10 w-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Skeleton pour les cartes de sourates */}
        <div className="flex w-full flex-col flex-wrap items-center justify-center gap-2 md:flex-row md:gap-3">
          {[...Array(12)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="w-full md:w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 animate-pulse" />
                <div className="flex-grow space-y-2">
                  <div className="h-5 w-3/4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded-full animate-pulse" />
              </div>
              <div className="mt-3 ml-9 h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
            </motion.div>
          ))}
        </div>

        {/* Message de chargement animé */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center text-blue-600"
        >
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 animate-pulse" />
            <div className="absolute top-0 left-0 h-12 w-12 animate-spin rounded-full border-t-4 border-blue-500" />
          </div>
          <p className="mt-4 text-lg font-medium animate-pulse">Chargement des chapitres...</p>
        </motion.div>
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
      <h1 className="text-600 text-balance mx-auto mb-8 max-w-[600px] text-center text-4xl font-bold !leading-[1.0] tracking-tighter text-gray-900 lg:max-w-[800px] lg:text-6xl">
        📑Chapitres du Coran 📖
      </h1>

      <div className="flex flex-col gap-4 mb-6">
        {/* Barre de recherche */}
        <motion.div
          className="w-full relative"
          onFocus={handleFocus}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.2 }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une sourate (nom, traduction, numéro...)"
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Filtres avec statistiques */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.3 }}
          className="flex flex-col gap-4 bg-gray-50 p-4 rounded-xl"
        >
          {/* Boutons de filtre */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Filtre Audio */}
            <button
              onClick={toggleShowOnlyWithAudio}
              className={`relative overflow-hidden rounded-full px-5 py-2.5 font-semibold text-white transition-all duration-300 ${
                showOnlyWithAudio
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <AudioLines size={18} />
                {showOnlyWithAudio
                  ? "Afficher toutes les sourates"
                  : "Afficher les sourates avec audio"}
              </span>
            </button>

            {/* Filtre Favoris */}
            <button
              onClick={toggleShowOnlyFavorites}
              className={`relative overflow-hidden rounded-full px-5 py-2.5 font-semibold text-white transition-all duration-300 ${
                showOnlyFavorites
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Heart size={18} fill={showOnlyFavorites ? "white" : "none"} />
                {showOnlyFavorites
                  ? "Afficher toutes les sourates"
                  : "Afficher mes favoris"}
              </span>
            </button>
          </div>

          {/* Statistiques */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>{`${sourateIdsWithAudio.size} sourates avec audio`}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span>{`${favoriteChapters.size} favoris`}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>{`${chapters.length - sourateIdsWithAudio.size} sans audio`}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.ul
        className="flex w-full flex-col flex-wrap items-center justify-center gap-2 md:flex-row md:gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.03 }}
      >
        <AnimatePresence mode="popLayout">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter: Chapter) => {
              const audioData = audiosTafsir.find((a) => a.id === chapter.id);
              const partIds = audioData?.parts?.map((part) => part.id) || [];
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
              const isFavorite = favoriteChapters.has(chapter.id);

              return (
                <motion.li
                  key={chapter.id}
                  variants={itemVariants}
                  layout
                  className={`group relative w-full cursor-pointer rounded-xl px-2 py-4 border shadow-xs transition-colors duration-200 md:w-80 will-change-transform will-change-opacity ${
                    isFullyCompleted
                      ? "bg-card-gradient border border-emerald-200 ring-1 ring-emerald-100/60 hover:opacity-95"
                      : "bg-white border-gray-200 hover:bg-slate-50/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() =>
                    router.push(
                      `/sourates/${chapter.id}${!showOnlyWithAudio ? "?showAudio=all" : ""}`,
                    )
                  }
                  tabIndex={0}
                  role="button"
                  style={{ textDecoration: "none", willChange: "transform" }}
                >
                  {/* Bouton favori */}
                  <button
                    onClick={(e) => toggleFavorite(chapter.id, e)}
                    className={`absolute top-0 right-2 z-20 p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                      isFavorite
                        ? "text-rose-500 hover:text-rose-600"
                        : "text-gray-400 hover:text-rose-500"
                    }`}
                    title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart
                      size={18}
                      fill={isFavorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                  </button>

                  {/* Barre de progression */}
                  {totalParts > 0 && (
                    <div className="absolute right-2 bottom-2 z-20 flex items-center">
                      <div
                        className={`h-1.5 w-20 overflow-hidden rounded-full border border-white shadow-inner ${
                          isFullyCompleted
                            ? "bg-gradient-to-r from-emerald-100 via-emerald-50 to-amber-100"
                            : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFullyCompleted
                              ? "bg-progress-gradient"
                              : "border-amber-50 bg-green-500"
                          }`}
                          style={{
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`ml-2 text-xs font-semibold ${
                          isFullyCompleted ? "text-emerald-900 drop-shadow" : "text-gray-600"
                        }`}
                      >
                        {progressPercent}%
                      </span>
                    </div>
                  )}

                  <div className="flex flex-grow items-center justify-between gap-2">
                    <div
                      className={`flex h-8 w-8 -mb-4 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold ${
                        isFullyCompleted
                          ? "bg-white text-emerald-700 border border-emerald-300"
                          : "bg-blue-100 text-blue-500"
                      }`}
                    >
                      {`${chapter.id < 10 ? "0" : ""}${chapter.id}`}
                    </div>
                    <div className="flex min-w-0 flex-grow flex-col">
                      <div className="flex items-center gap-2">
                        <strong
                          className={`text-md truncate ${isFullyCompleted ? "text-emerald-900" : "text-gray-800"}`}
                        >
                          {chapter.transliteration}
                        </strong>
                        <span
                          className={`font-sura -mt-1 truncate text-xl ${isFullyCompleted ? "text-emerald-700" : ""}`}
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
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-sm font-semibold ${
                        isFullyCompleted
                          ? "border border-emerald-300 bg-white text-emerald-700"
                          : "bg-blue-100 text-blue-500"
                      }`}
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
                            strokeWidth={2.5}
                            className="inline-block text-emerald-600 drop-shadow-sm"
                          />
                          <AudioLines
                            size={18}
                            strokeWidth={2.5}
                            className="text-white stroke-white drop-shadow-sm"
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
              {showOnlyFavorites && favoriteChapters.size === 0
                ? "Vous n'avez pas encore de sourates favorites. Cliquez sur le cœur pour en ajouter !"
                : "Aucun chapitre ne correspond à vos critères de recherche."}
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}