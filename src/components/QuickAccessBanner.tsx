"use client";

import { audiosTafsir, recentlyAddedIds } from "@/lib/data/audios";
import type { SimpleChapterIndexEntry } from "@/lib/quranSimpleApi";
import type { ProgressData } from "@/types/types";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PROGRESS_KEY = "audioVerseProgress:v1";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function surahIconCode(id: number): string {
  return `surah${id < 10 ? "00" : id < 100 ? "0" : ""}${id}`;
}

interface QuickAccessBannerProps {
  chapters: SimpleChapterIndexEntry[];
}

export default function QuickAccessBanner({ chapters }: QuickAccessBannerProps) {
  const router = useRouter();
  const [lastListened, setLastListened] = useState<ProgressData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const data: ProgressData = JSON.parse(raw);
      if (Date.now() - data.timestamp <= TWENTY_FOUR_HOURS) {
        setLastListened(data);
      }
    } catch {
      // localStorage indisponible ou données corrompues
    }
  }, []);

  const lastAddedAudio = audiosTafsir.find((a) => a.id === recentlyAddedIds[0]);
  const lastAddedChapter = lastAddedAudio
    ? chapters.find((c) => c.id === lastAddedAudio.id)
    : null;

  const lastListenedChapter = lastListened
    ? chapters.find((c) => c.id === lastListened.chapterId)
    : null;
  const lastListenedAudio = lastListened
    ? audiosTafsir.find((a) => a.id === lastListened.chapterId)
    : null;
  const lastListenedPart = lastListenedAudio?.parts.find(
    (p) => p.id === lastListened?.partId,
  );

  if (!mounted) return null;
  if (!lastListened && !lastAddedChapter) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Carte "Reprendre la lecture" */}
        {lastListened && lastListenedChapter && (
          <motion.button
            onClick={() => router.push(`/sourates/${lastListened.chapterId}`)}
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            {/* Icône surah en fond décoratif */}
            <span
              aria-hidden
              className="font-sura pointer-events-none absolute right-[-6px] top-1/2 -translate-y-1/2 select-none text-7xl text-amber-200/60 transition-opacity group-hover:text-amber-200/90"
            >
              {surahIconCode(lastListened.chapterId)}
            </span>

            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 shadow-sm transition-colors group-hover:bg-amber-500">
              <Play size={15} className="ml-0.5 text-white" fill="white" />
            </div>

            <div className="relative min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Reprendre la lecture
              </p>
              <p className="truncate text-sm font-semibold text-gray-800">
                {lastListenedChapter.transliteration}
              </p>
              <div className="flex items-center gap-1 text-xs text-amber-700/70">
                <Clock size={10} />
                <span className="truncate">
                  {lastListenedPart?.title ??
                    `Partie ${(lastListened.currentPartIndex ?? 0) + 1}`}
                </span>
                <span className="opacity-50">·</span>
                <span className="tabular-nums">
                  {formatTime(lastListened.currentTime)}
                </span>
              </div>
            </div>
          </motion.button>
        )}

        {/* Carte "Récemment ajouté" */}
        {lastAddedChapter && lastAddedAudio && (
          <motion.button
            onClick={() => router.push(`/sourates/${lastAddedChapter.id}`)}
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70 px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            {/* Badge "Nouveau" */}
            <span className="absolute right-3 top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
              Nouveau
            </span>

            {/* Icône surah en fond décoratif */}
            <span
              aria-hidden
              className="font-sura pointer-events-none absolute right-[-6px] top-1/2 -translate-y-1/2 select-none text-7xl text-emerald-200/60 transition-opacity group-hover:text-emerald-200/90"
            >
              {surahIconCode(lastAddedChapter.id)}
            </span>

            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400 shadow-sm transition-colors group-hover:bg-emerald-500">
              <Sparkles size={15} className="text-white" />
            </div>

            <div className="relative min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Récemment ajouté
              </p>
              <p className="truncate text-sm font-semibold text-gray-800">
                {lastAddedChapter.transliteration}
              </p>
              <p className="text-xs text-emerald-700/70">
                {lastAddedAudio.parts.filter((p) => p.url).length} partie
                {lastAddedAudio.parts.filter((p) => p.url).length > 1
                  ? "s"
                  : ""}{" "}
                audio disponible
                {lastAddedAudio.parts.filter((p) => p.url).length > 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
