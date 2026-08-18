"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/UseMediaQuery";
import type { SimpleChapterIndexEntry } from "@/lib/quranSimpleApi";

interface SourateDrawerProps {
  chapters: SimpleChapterIndexEntry[];
  currentChapterId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function surahIconClass(id: number) {
  return `surah${id < 10 ? "00" : id < 100 ? "0" : ""}${id}`;
}

export default function SourateDrawer({
  chapters,
  currentChapterId,
  open,
  onOpenChange,
}: SourateDrawerProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewportOverride, setViewportOverride] = useState<{
    bottom: number;
    maxHeight: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sur mobile, le tiroir est en `position: fixed; bottom: 0`, ancré au bas
  // du viewport de mise en page — qui ne rétrécit pas quand le clavier
  // s'ouvre (contrairement au viewport visuel). Résultat : `bottom: 0`
  // pointe toujours vers le bas de l'écran, désormais caché sous le
  // clavier. On recale le tiroir sur le viewport visuel via son offset.
  useEffect(() => {
    if (!open || !isMobile) {
      setViewportOverride(null);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const bottom = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      setViewportOverride(
        bottom > 0 ? { bottom, maxHeight: Math.round(vv.height) } : null,
      );
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open, isMobile]);

  const filteredChapters = useMemo(() => {
    if (!searchTerm) return chapters;
    const q = searchTerm.toLowerCase();
    return chapters.filter(
      (chapter) =>
        chapter.transliteration.toLowerCase().includes(q) ||
        chapter.name.toLowerCase().includes(q) ||
        chapter.translation.toLowerCase().includes(q) ||
        chapter.id.toString().includes(q),
    );
  }, [chapters, searchTerm]);

  // Réinitialise la recherche et centre la sourate courante à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    const timer = setTimeout(() => {
      listRef.current
        ?.querySelector(`[data-chapter-id="${currentChapterId}"]`)
        ?.scrollIntoView({ block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, currentChapterId]);

  const handleSelect = (chapterId: number) => {
    onOpenChange(false);
    router.push(`/sourates/${chapterId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "left"}
        className={`flex flex-col gap-0 border-none bg-[#FBF3E4] p-0 text-[#3D3226] ${
          isMobile ? "max-h-[85vh] rounded-t-2xl" : "sm:max-w-sm"
        }`}
        style={
          viewportOverride
            ? {
                bottom: viewportOverride.bottom,
                maxHeight: viewportOverride.maxHeight,
              }
            : undefined
        }
        onOpenAutoFocus={(e) => {
          // Sur mobile, le focus auto de Radix sur le champ de recherche
          // (premier élément focusable) ouvre le clavier virtuel, qui
          // recouvre la liste des sourates juste en dessous.
          if (isMobile) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b border-[#3D3226]/10 p-4 pb-3">
          <SheetTitle className="text-[#3D3226]">Sourates</SheetTitle>
          <div className="relative mt-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#3D3226]/40"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une sourate…"
              className="w-full rounded-full bg-[#3D3226]/8 py-2 pr-3 pl-9 text-base text-[#3D3226] placeholder-[#3D3226]/40 outline-none focus:ring-2 focus:ring-[#d28820]/40"
            />
          </div>
        </SheetHeader>

        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter) => {
              const isCurrent = chapter.id === currentChapterId;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  data-chapter-id={chapter.id}
                  onClick={() => handleSelect(chapter.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    isCurrent
                      ? "bg-[#d28820]/10 font-semibold text-[#d28820]"
                      : "text-[#3D3226] hover:bg-[#3D3226]/5"
                  }`}
                >
                  <span className="w-7 shrink-0 text-center font-mono text-sm text-[#3D3226]/50">
                    {chapter.id}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-medium">
                      {chapter.transliteration}
                    </span>
                    <span className="truncate text-sm text-[#3D3226]/50">
                      {chapter.translation}
                    </span>
                  </span>
                  <span className="font-sura shrink-0 text-xl">
                    {surahIconClass(chapter.id)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-6 text-center text-base text-[#3D3226]/50">
              Aucune sourate ne correspond à la recherche.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
