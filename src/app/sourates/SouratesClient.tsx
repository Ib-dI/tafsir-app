"use client";

import { audiosTafsir } from "@/lib/data/audios";
import Image from "next/image"
import QuickAccessBanner from "@/components/QuickAccessBanner";
import { auth, db } from "@/lib/firebase";
import type { SimpleChapterIndexEntry } from "@/lib/quranSimpleApi";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import ResetProgressDialog from "@/components/ResetProgressDialog";
import { AudioLines, Hourglass, RotateCcw, Search, Heart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {},
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

export type SouratesClientProps = {
  initialChapters: SimpleChapterIndexEntry[];
  chaptersLoadError: boolean;
  initialShowAudio: boolean;
  initialShowFavorites: boolean;
};

export default function SouratesClient({
  initialChapters,
  chaptersLoadError,
  initialShowAudio,
  initialShowFavorites,
}: SouratesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapters = initialChapters;

  // Computed from static data — safe to do before hooks
  const audioCount = audiosTafsir.filter(
    (audio) => audio.parts && audio.parts.length > 0 && audio.parts[0].url,
  ).length;
  const allHaveAudio = audioCount >= chapters.length;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showOnlyWithAudio, setShowOnlyWithAudio] = useState<boolean>(
    initialShowAudio && !allHaveAudio,
  );
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(initialShowFavorites);
  // Actif par défaut quand toutes les sourates ont un audio
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState<boolean>(
    allHaveAudio ? initialShowAudio : false,
  );

  const [completedChaptersByPartId, setCompletedChaptersByPartId] = useState<Set<string>>(
    new Set(),
  );
  const [favoriteChapters, setFavoriteChapters] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sourateIdsWithAudio = useMemo(
    () =>
      new Set<number>(
        audiosTafsir
          .filter((audio) => audio.parts && audio.parts.length > 0 && audio.parts[0].url)
          .map((audio) => audio.id),
      ),
    [],
  );

  const incompleteCount = useMemo(() => {
    return audiosTafsir.filter((audio) => {
      if (!audio.parts?.length) return false;
      const partIds = audio.parts.map((p) => p.id);
      const completedParts = partIds.filter((id) => completedChaptersByPartId.has(id)).length;
      return completedParts < partIds.length;
    }).length;
  }, [completedChaptersByPartId]);

  const completedCount = useMemo(() => {
    return audiosTafsir.filter((audio) => {
      if (!audio.parts?.length) return false;
      const partIds = audio.parts.map((p) => p.id);
      return partIds.every((id) => completedChaptersByPartId.has(id));
    }).length;
  }, [completedChaptersByPartId]);

  useEffect(() => {
    if (allHaveAudio) {
      setShowOnlyWithAudio(false);
      // Quand tout est disponible, le filtre "non complétés" est actif par défaut (sauf si désactivé manuellement)
      setShowOnlyIncomplete(searchParams.get("showIncomplete") !== "false");
    } else {
      setShowOnlyWithAudio(searchParams.get("showAudio") !== "all");
      setShowOnlyIncomplete(searchParams.get("showIncomplete") === "true");
    }
    setShowOnlyFavorites(searchParams.get("showFavorites") === "true");
  }, [searchParams, allHaveAudio]);

  const filteredChapters = useMemo(() => {
    let current = chapters;
    if (showOnlyWithAudio) {
      current = current.filter((chapter) => sourateIdsWithAudio.has(chapter.id));
    }
    if (showOnlyIncomplete) {
      current = current.filter((chapter) => {
        const audioData = audiosTafsir.find((a) => a.id === chapter.id);
        if (!audioData?.parts?.length) return false;
        const partIds = audioData.parts.map((p) => p.id);
        const completedParts = partIds.filter((id) =>
          completedChaptersByPartId.has(id),
        ).length;
        return completedParts < partIds.length;
      });
    }
    if (showOnlyFavorites) {
      current = current.filter((chapter) => favoriteChapters.has(chapter.id));
    }
    if (searchTerm === "") return current;
    const q = searchTerm.toLowerCase();
    return current.filter(
      (chapter) =>
        chapter.transliteration.toLowerCase().includes(q) ||
        chapter.name.toLowerCase().includes(q) ||
        chapter.translation.toLowerCase().includes(q) ||
        chapter.id.toString().includes(q),
    );
  }, [
    chapters,
    showOnlyWithAudio,
    showOnlyIncomplete,
    showOnlyFavorites,
    searchTerm,
    favoriteChapters,
    sourateIdsWithAudio,
    completedChaptersByPartId,
  ]);

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

  // Écoute les favoris
  useEffect(() => {
    if (!db || !userId) return;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return;

    const favoritesRef = collection(
      db,
      `artifacts/${projectId}/users/${userId}/favorites`,
    );
    const unsubscribe = onSnapshot(
      favoritesRef,
      (snapshot) => {
        const favorites = new Set<number>();
        snapshot.forEach((doc) => {
          const chapterId = parseInt(doc.id);
          if (!isNaN(chapterId)) favorites.add(chapterId);
        });
        setFavoriteChapters(favorites);
      },
      (error) => {
        console.error("Erreur lors de l'écoute des favoris:", error);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // Défilement vers le haut de la page au montage
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFocus = useCallback(() => {
    if (searchInputRef.current) {
      const inputRect = searchInputRef.current.getBoundingClientRect();
      const offset = 20;
      const scrollPosition = window.scrollY + inputRect.top - offset;
      window.scrollTo({ top: scrollPosition, behavior: "smooth" });
    }
  }, []);

  const updateURLParams = (params: {
    showAudio?: string;
    showFavorites?: string;
    showIncomplete?: string;
  }) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) currentParams.delete(key);
      else currentParams.set(key, value);
    });
    router.replace(`?${currentParams.toString()}`);
  };

  const toggleShowOnlyWithAudio = () => {
    const newState = !showOnlyWithAudio;
    setShowOnlyWithAudio(newState);
    updateURLParams({ showAudio: newState ? undefined : "all" });
  };

  const toggleShowOnlyFavorites = () => {
    const newState = !showOnlyFavorites;
    setShowOnlyFavorites(newState);
    updateURLParams({ showFavorites: newState ? "true" : undefined });
  };

  const toggleShowOnlyIncomplete = () => {
    const newState = !showOnlyIncomplete;
    setShowOnlyIncomplete(newState);
    if (allHaveAudio) {
      // Défaut = actif → désactiver nécessite un param explicite
      updateURLParams({ showIncomplete: newState ? undefined : "false" });
    } else {
      // Défaut = inactif → activer nécessite un param explicite
      updateURLParams({ showIncomplete: newState ? "true" : undefined });
    }
  };

  const toggleFavorite = async (chapterId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!db || !userId) return;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return;

    const favoriteRef = doc(
      db,
      `artifacts/${projectId}/users/${userId}/favorites`,
      chapterId.toString(),
    );

    try {
      if (favoriteChapters.has(chapterId)) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, { chapterId, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des favoris:", error);
    }
  };

  const resetChapterProgress = async (targetChapterId: number) => {
    if (!db || !userId) return;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return;

    const progressRef = collection(
      db,
      `artifacts/${projectId}/users/${userId}/progress`,
    );
    const q = query(progressRef, where("chapterId", "==", targetChapterId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  };

  if (chaptersLoadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-red-600">
        Erreur lors du chargement des chapitres. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-9 w-full bg-white p-4">
      <div className="mx-auto mb-8 flex w-fit items-start justify-center">
        <div className="shrink-0">
          <Image src="/coran.png" alt="Coran fermé" width={30} height={30} className="sm:hidden" />
          <Image src="/coran.png" alt="Coran fermé" width={50} height={50} className="hidden sm:block" />
        </div>

        <h1 className="leading-[0.95] tracking-tight font-extrabold text-center text-gray-800 text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="block w-fit -mr-2">Chapitres</span>
          <span className="flex items-end justify-center gap-1 -ml-4">
            <span>du Coran</span>
            <div className="mb-1 shrink-0">
              <Image src="/coran_ouvert.png" alt="Coran ouvert" width={45} height={45} className="sm:hidden" />
              <Image src="/coran_ouvert.png" alt="Coran ouvert" width={80} height={80} className="hidden sm:block" />
            </div>
          </span>
        </h1>
      </div>

      <QuickAccessBanner chapters={chapters} />

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

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.3 }}
          className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl"
        >
          {/* Chips de filtre */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Avec audio — masqué quand toutes les sourates ont un audio */}
            {!allHaveAudio && (
              <button
                onClick={toggleShowOnlyWithAudio}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all duration-200 ${
                  showOnlyWithAudio
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <AudioLines size={15} />
                Avec audio
              </button>
            )}

            {/* Non complétés */}
            <button
              onClick={toggleShowOnlyIncomplete}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all duration-200 ${
                showOnlyIncomplete
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Hourglass size={15} />
              Non complétés
            </button>

            {/* Favoris */}
            <button
              onClick={toggleShowOnlyFavorites}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all duration-200 ${
                showOnlyFavorites
                  ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Heart size={15} fill={showOnlyFavorites ? "white" : "none"} />
              Favoris
            </button>
          </div>

          {/* Statistiques */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
            {!allHaveAudio && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{sourateIdsWithAudio.size} avec audio</span>
                </div>
                <div className="h-3 w-px bg-gray-300" />
              </>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{incompleteCount} non complétés</span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{completedCount} complétés</span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span>{favoriteChapters.size} favoris</span>
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
            filteredChapters.map((chapter: SimpleChapterIndexEntry) => {
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
                        : `${isFullyCompleted ? "text-white" : "text-gray-400"} hover:text-rose-500`
                    }`}
                    title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart
                      className={`${!isFavorite && isFullyCompleted ? "drop-shadow-sm" : ""}`}
                      size={18}
                      fill={isFavorite || isFullyCompleted ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={1}
                    />
                  </button>

                  {/* Barre de progression + reset */}
                  {totalParts > 0 && (
                    <div className="absolute right-2 bottom-2 z-20 flex items-center gap-1.5">
                      {completedParts >= 1 && (
                        <ResetProgressDialog
                          name={chapter.transliteration}
                          onConfirm={() => resetChapterProgress(chapter.id)}
                          trigger={
                            <button
                              title="Réinitialiser la progression"
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 ${
                                isFullyCompleted
                                  ? "border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
                                  : "border border-red-200 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
                              }`}
                            >
                              <RotateCcw size={10} />
                              <span>Réviser</span>
                            </button>
                          }
                        />
                      )}
                      <div
                        className={`h-1.5 w-20 overflow-hidden rounded-full border border-white shadow-inner ${
                          isFullyCompleted
                            ? "bg-linear-to-r from-emerald-100 via-emerald-50 to-amber-100"
                            : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFullyCompleted
                              ? "bg-progress-gradient"
                              : "border-amber-50 bg-green-500"
                          }`}
                          style={{ width: `${progressPercent}%` }}
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

                  <div className="flex grow items-center justify-between gap-2">
                    <div
                      className={`flex h-8 w-8 -mb-4 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold ${
                        isFullyCompleted
                          ? "bg-white text-emerald-700 border border-emerald-300"
                          : "bg-blue-100 text-blue-500"
                      }`}
                    >
                      {`${chapter.id < 10 ? "0" : ""}${chapter.id}`}
                    </div>
                    <div className="flex min-w-0 grow flex-col">
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
                        <span className="inline-block max-w-27.5 truncate overflow-hidden align-bottom font-semibold whitespace-nowrap">
                          {chapter.translation}
                        </span>
                        <span className="font-mono text-xs">
                          {" "}-{" "}
                          <span className="font-semibold">{chapter.total_verses}</span>{" "}
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
                    {sourateIdsWithAudio.has(chapter.id) ? (
                      isFullyCompleted ? (
                        <div className="flex">
                          <AudioLines size={18} strokeWidth={2.5} className="inline-block text-emerald-600 drop-shadow-sm" />
                          <AudioLines size={18} strokeWidth={2.5} className="text-white stroke-white drop-shadow-sm" />
                        </div>
                      ) : (
                        <div className="flex">
                          <AudioLines size={18} className="inline-block text-blue-500" />
                          <AudioLines size={18} className="inline-block text-gray-400" />
                        </div>
                      )
                    ) : (
                      <div className="h-4.5"></div>
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
                : showOnlyIncomplete && incompleteCount === 0
                  ? "Félicitations ! Vous avez complété toutes les sourates disponibles."
                  : "Aucun chapitre ne correspond à vos critères de recherche."}
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
