"use client";

import { audiosTafsir } from "@/lib/data/audios";
import { computeChapterProgress } from "@/lib/chapterProgress";
import Image from "next/image"
import Link from "next/link";
import QuickAccessBanner from "@/components/QuickAccessBanner";
import { resetChapterProgress as resetChapterProgressInFirestore } from "@/lib/data/progress";
import { useUserId } from "@/hooks/useUserId";
import { useAllProgress } from "@/hooks/useAllProgress";
import { useFavorites } from "@/hooks/useFavorites";
import type { SimpleChapterIndexEntry } from "@/lib/quranSimpleApi";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ResetProgressDialog from "@/components/ResetProgressDialog";
import { AudioLines, Hourglass, RotateCcw, Search, Heart, WholeWord } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {},
  },
};

function AnimatedCount({ value }: { value: number }) {
  return (
    <span className="inline-grid overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="[grid-area:1/1]"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

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
  const shouldReduceMotion = useReducedMotion();

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
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState<boolean>(false);
  const [showOnlyWithWordTiming, setShowOnlyWithWordTiming] = useState<boolean>(false);

  const { userId } = useUserId();
  const completedChaptersByPartId = useAllProgress(userId);
  const { favoriteChapters, toggleFavorite: persistFavoriteToggle } = useFavorites(userId);
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

  const sourateIdsWithWordTiming = useMemo(
    () =>
      new Set<number>(
        audiosTafsir
          .filter((audio) =>
            audio.parts.some((part) =>
              part.timings.some((timing) => {
                const words = (timing as { words?: unknown[] }).words;
                return Array.isArray(words) && words.length > 0;
              }),
            ),
          )
          .map((audio) => audio.id),
      ),
    [],
  );

  const incompleteCount = useMemo(() => {
    return audiosTafsir.filter((audio) => {
      const progress = computeChapterProgress(audio.parts, completedChaptersByPartId);
      return progress.totalParts > 0 && !progress.isFullyCompleted;
    }).length;
  }, [completedChaptersByPartId]);

  const completedCount = useMemo(() => {
    return audiosTafsir.filter(
      (audio) => computeChapterProgress(audio.parts, completedChaptersByPartId).isFullyCompleted,
    ).length;
  }, [completedChaptersByPartId]);

  useEffect(() => {
    if (allHaveAudio) {
      setShowOnlyWithAudio(false);
      setShowOnlyIncomplete(searchParams.get("showIncomplete") === "true");
    } else {
      setShowOnlyWithAudio(searchParams.get("showAudio") !== "all");
      setShowOnlyIncomplete(searchParams.get("showIncomplete") === "true");
    }
    setShowOnlyFavorites(searchParams.get("showFavorites") === "true");
    setShowOnlyWithWordTiming(searchParams.get("showWordTiming") === "true");
  }, [searchParams, allHaveAudio]);

  const filteredChapters = useMemo(() => {
    let current = chapters;
    if (showOnlyWithAudio) {
      current = current.filter((chapter) => sourateIdsWithAudio.has(chapter.id));
    }
    if (showOnlyIncomplete) {
      current = current.filter((chapter) => {
        const audioData = audiosTafsir.find((a) => a.id === chapter.id);
        if (!audioData) return false;
        const progress = computeChapterProgress(audioData.parts, completedChaptersByPartId);
        return progress.totalParts > 0 && !progress.isFullyCompleted;
      });
    }
    if (showOnlyFavorites) {
      current = current.filter((chapter) => favoriteChapters.has(chapter.id));
    }
    if (showOnlyWithWordTiming) {
      current = current.filter((chapter) => sourateIdsWithWordTiming.has(chapter.id));
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
    showOnlyWithWordTiming,
    searchTerm,
    favoriteChapters,
    sourateIdsWithAudio,
    sourateIdsWithWordTiming,
    completedChaptersByPartId,
  ]);

  const isFilterActive =
    searchTerm !== "" ||
    showOnlyWithAudio ||
    showOnlyIncomplete ||
    showOnlyFavorites ||
    showOnlyWithWordTiming;

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition:
        isFilterActive || shouldReduceMotion
          ? { duration: shouldReduceMotion ? 0.15 : 0 }
          : { type: "spring" as const, stiffness: 100, damping: 10 },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -20,
      transition: { duration: isFilterActive ? 0 : shouldReduceMotion ? 0.1 : 0.2 },
    },
  };

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
    showWordTiming?: string;
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
    updateURLParams({ showIncomplete: newState ? "true" : undefined });
  };

  const toggleShowOnlyWithWordTiming = () => {
    const newState = !showOnlyWithWordTiming;
    setShowOnlyWithWordTiming(newState);
    updateURLParams({ showWordTiming: newState ? "true" : undefined });
  };

  const toggleFavorite = async (chapterId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await persistFavoriteToggle(chapterId);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des favoris:", error);
    }
  };

  const resetChapterProgress = async (targetChapterId: number) => {
    if (!userId) return;
    try {
      await resetChapterProgressInFirestore(targetChapterId, userId);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation de la progression du chapitre:",
        error,
      );
    }
  };

  if (chaptersLoadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF3E4] text-red-600">
        Erreur lors du chargement des chapitres. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-9 w-full bg-[#FBF3E4] p-4">
      <div className="mx-auto mb-8 flex w-fit items-start justify-center">
        <div className="shrink-0">
          <Image src="/coran.png" alt="Coran fermé" width={30} height={30} className="sm:hidden" />
          <Image src="/coran.png" alt="Coran fermé" width={50} height={50} className="hidden sm:block" />
        </div>

        <h1 className="leading-[0.95] tracking-tight font-extrabold text-center text-[#3D3226] text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
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
        {/* Recherche + filtres */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.2 }}
          className="flex w-fit max-w-full flex-col gap-2 self-center bg-[#3D3226]/5 p-3 rounded-xl"
        >
          {/* Barre de recherche + chips de filtre, sur une même ligne */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={18} className="text-[#3D3226]/40" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher une sourate..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#3D3226]/15 rounded-full shadow-sm text-sm text-[#3D3226] placeholder-[#3D3226]/40 focus:outline-none focus:ring-2 focus:ring-[#d28820] focus:border-transparent transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleFocus}
              />
            </div>

            {/* Avec audio — masqué quand toutes les sourates ont un audio */}
            {!allHaveAudio && (
              <button
                onClick={toggleShowOnlyWithAudio}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors duration-200 ${
                  showOnlyWithAudio
                    ? "bg-[#d28820] border-[#d28820] text-white shadow-sm"
                    : "border-[#3D3226]/15 bg-white text-[#3D3226]/60 hover:bg-[#3D3226]/5 hover:border-[#3D3226]/25"
                }`}
              >
                <AudioLines size={15} />
                Avec audio
              </button>
            )}

            {/* Non complétés */}
            <button
              onClick={toggleShowOnlyIncomplete}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors duration-200 ${
                showOnlyIncomplete
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "border-[#3D3226]/15 bg-white text-[#3D3226]/60 hover:bg-[#3D3226]/5 hover:border-[#3D3226]/25"
              }`}
            >
              <Hourglass size={15} />
              Non complétés
            </button>

            {/* Favoris */}
            <button
              onClick={toggleShowOnlyFavorites}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors duration-200 ${
                showOnlyFavorites
                  ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                  : "border-[#3D3226]/15 bg-white text-[#3D3226]/60 hover:bg-[#3D3226]/5 hover:border-[#3D3226]/25"
              }`}
            >
              <Heart size={15} fill={showOnlyFavorites ? "white" : "none"} />
              Favoris
            </button>

            {/* Mot par mot synchronisé */}
            <button
              onClick={toggleShowOnlyWithWordTiming}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors duration-200 ${
                showOnlyWithWordTiming
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : "border-[#3D3226]/15 bg-white text-[#3D3226]/60 hover:bg-[#3D3226]/5 hover:border-[#3D3226]/25"
              }`}
            >
              <WholeWord size={15} />
              Mot par mot
            </button>
          </div>

          {/* Statistiques */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#3D3226]/60">
            {!allHaveAudio && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#d28820]" />
                  <span><AnimatedCount value={sourateIdsWithAudio.size} /> avec audio</span>
                </div>
                <div className="h-3 w-px bg-[#3D3226]/20" />
              </>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span><AnimatedCount value={incompleteCount} /> non complétés</span>
            </div>
            <div className="h-3 w-px bg-[#3D3226]/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span><AnimatedCount value={completedCount} /> complétés</span>
            </div>
            <div className="h-3 w-px bg-[#3D3226]/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span><AnimatedCount value={favoriteChapters.size} /> favoris</span>
            </div>
            <div className="h-3 w-px bg-[#3D3226]/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <span><AnimatedCount value={sourateIdsWithWordTiming.size} /> mot par mot</span>
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
              const { totalParts, completedParts, isFullyCompleted, progressPercent } =
                computeChapterProgress(audioData?.parts ?? [], completedChaptersByPartId);
              const isFavorite = favoriteChapters.has(chapter.id);
              const chapterHref = `/sourates/${chapter.id}${!showOnlyWithAudio ? "?showAudio=all" : ""}`;

              return (
                <motion.li
                  key={chapter.id}
                  variants={itemVariants}
                  layout={!isFilterActive}
                  className={`group relative w-full overflow-hidden rounded-xl px-2 py-4 border shadow-xs md:w-80 will-change-transform will-change-opacity ${
                    isFullyCompleted
                      ? "border-emerald-200 ring-1 ring-emerald-100/60 hover:opacity-95"
                      : "border-[#3D3226]/15 bg-white hover:bg-[#3D3226]/5"
                  }`}
                  whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                  whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: "easeOut" } }}
                  transition={
                    isFilterActive
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 20 }
                  }
                  style={{ willChange: "transform" }}
                >
                  <Link
                    href={chapterHref}
                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d28820]"
                    aria-label={`Sourate ${chapter.id} : ${chapter.transliteration} (${chapter.translation})`}
                  />
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 bg-card-gradient"
                    initial={false}
                    animate={{ opacity: isFullyCompleted ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  {/* Bouton favori */}
                  <button
                    onClick={(e) => toggleFavorite(chapter.id, e)}
                    className={`absolute top-0 right-2 z-20 p-1.5 rounded-full transition-[color,background-color,transform] duration-200 hover:scale-110 ${
                      isFavorite
                        ? "text-rose-500 hover:text-rose-600"
                        : `${isFullyCompleted ? "text-white" : "text-[#3D3226]/40"} hover:text-rose-500`
                    }`}
                    title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <motion.span
                      key={isFavorite ? "favorited" : "not-favorited"}
                      initial={{ scale: isFavorite ? 0.6 : 1 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="block"
                    >
                      <Heart
                        className={`${!isFavorite && isFullyCompleted ? "drop-shadow-sm" : ""}`}
                        size={18}
                        fill={isFavorite || isFullyCompleted ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={1}
                      />
                    </motion.span>
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
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shadow-xs transition-[color,background-color,border-color,transform] duration-200 hover:scale-105 active:scale-95 ${
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
                            : "bg-[#3D3226]/10"
                        }`}
                      >
                        <div
                          className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out ${
                            isFullyCompleted
                              ? "bg-progress-gradient"
                              : "border-amber-50 bg-green-500"
                          }`}
                          style={{ transform: `scaleX(${progressPercent / 100})` }}
                        />
                      </div>
                      <span
                        className={`ml-2 text-xs font-semibold ${
                          isFullyCompleted ? "text-emerald-900 drop-shadow" : "text-[#3D3226]/70"
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
                          : "bg-[#d28820]/10 text-[#d28820]"
                      }`}
                    >
                      {`${chapter.id < 10 ? "0" : ""}${chapter.id}`}
                    </div>
                    <div className="flex min-w-0 grow flex-col">
                      <div className="flex items-center gap-2">
                        <strong
                          className={`text-md truncate ${isFullyCompleted ? "text-emerald-900" : "text-[#3D3226]"}`}
                        >
                          {chapter.transliteration}
                        </strong>
                        <span
                          className={`font-sura -mt-1 truncate text-xl ${isFullyCompleted ? "text-emerald-700" : ""}`}
                        >{`surah${chapter.id < 10 ? "00" : chapter.id < 100 ? "0" : ""}${chapter.id}`}</span>
                      </div>
                      <p
                        className={`truncate text-sm ${isFullyCompleted ? "text-emerald-800" : "text-[#3D3226]/80"}`}
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
                          : "bg-[#d28820]/10 text-[#d28820]"
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
                          <AudioLines size={18} className="inline-block text-[#d28820]" />
                          <AudioLines size={18} className="inline-block text-[#3D3226]/30" />
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
              className="mt-4 text-center text-[#3D3226]/60"
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
