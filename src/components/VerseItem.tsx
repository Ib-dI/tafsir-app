import { useFontSettings } from "@/context/FontSettingsContext";
import { useTranslationDisplay } from "@/context/TranslationDisplayContext";
import { useWordByWord } from "@/context/WordByWordContext";
import { applyOrnamentFor, isDigitalKhattFontStyle } from "@/lib/ayahMarker";
import { wordContent } from "@/lib/arabicWordContent";
import { cn } from "@/lib/utils";
import { VerseHighlight } from "@/types/types";
import { motion } from "framer-motion";
import { Tooltip } from "radix-ui";
import React, { type ReactNode, useState } from "react";

// Fonction pour convertir un nombre en chiffres arabes
export const toArabicNumerals = (n: number): string => {
  if (n < 0) return String(n);
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return n
    .toString()
    .split("")
    .map((digit) => arabicNumerals[parseInt(digit)])
    .join("");
};

// Un mot arabe interactif : survol (desktop) ou tap (mobile) affiche sa
// traduction française dans une bulle. `stopPropagation` empêche le tap de
// remonter jusqu'au conteneur du verset, qui sinon déclencherait le seek
// audio (`seekToVerse`) à la place d'ouvrir la bulle.
//
// La bulle passe par un portail Radix (rendu dans document.body, positionné
// via floating-ui) plutôt qu'un `position: absolute` local : la carte du
// verset a `content-visibility:auto` (confinement de peinture — tout ce qui
// dépasse sa boîte est rogné) et est elle-même dans une liste au scroll
// interne (`overflow-y-auto`), donc une bulle positionnée localement se fait
// soit rogner (au-dessus du mot), soit chevaucher la translitération
// en-dessous. Le portail échappe aux deux.
export function InteractiveWord({
  content,
  translation,
  isOpen,
  onOpenChange,
}: {
  content: ReactNode;
  translation: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!translation) {
    return <span>{content}</span>;
  }

  return (
    <Tooltip.Root open={isOpen} onOpenChange={onOpenChange}>
      <Tooltip.Trigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(!isOpen);
          }}
          className={cn(
            "-mx-0.5 cursor-pointer rounded px-0.5 transition-colors",
            isOpen ? "bg-amber-100" : "hover:bg-amber-100",
          )}
        >
          {content}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          collisionPadding={8}
          style={{ direction: "ltr" }}
          className="z-50 rounded-lg bg-gray-800 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg"
        >
          {translation}
          <Tooltip.Arrow className="fill-gray-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const VerseItem = React.memo(
  ({
    verse,
    isActive,
    audioUrl,
    seekToVerse,
  }: {
    verse: VerseHighlight;
    isActive: boolean;
    audioUrl: string;
    seekToVerse: (verse: VerseHighlight) => void;
  }) => {
    const [openWordIndex, setOpenWordIndex] = useState<number | null>(null);
    const { wordByWordEnabled } = useWordByWord();
    const { showTranslation, showTransliteration } = useTranslationDisplay();
    const { arabicScript, fontStyle } = useFontSettings();
    const applyOrnament = applyOrnamentFor(fontStyle);
    const useDigitalKhattText =
      arabicScript === "uthmani" && isDigitalKhattFontStyle(fontStyle);

    return (
      <motion.div
        key={`verse-${verse.id}`}
        id={`verse-${verse.id}`}
        onClick={() => !verse.noAudio && seekToVerse(verse)}
        className={`my-1 cursor-pointer p-3 transition-colors duration-250 ease-in-out [contain-intrinsic-size:auto_120px] [content-visibility:auto] ${
          !verse.noAudio ? "hover:bg-[#3D3226]/5" : ""
        } ${
          verse.noAudio
            ? "border-[0.7px] border-x border-blue-200 bg-[#3D3226]/5"
            : isActive && audioUrl
              ? `border-[0.7px] border-x border-[#d28820] bg-[#d28820]/10 shadow-[0_0_10px_5px_rgba(210,136,32,0.25)]`
              : "border-transparent"
        }`}
        animate={{ scale: isActive && audioUrl ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 25, mass: 1.2 }}
      >
        <div className="flex flex-col items-end justify-end gap-2">
          {verse.noAudio && (
            <span className="mb-1 self-start text-xs font-medium text-blue-500">
              Verset sans audio
            </span>
          )}
          <div
            className="verse-arabic-text mt-2 flex items-center text-right text-[#3D3226] md:gap-1"
            data-script={arabicScript}
            lang="ar"
            dir="rtl"
          >
            <span lang="ar" dir="rtl">
              {verse.words.length > 0
                ? verse.words.flatMap((word, index) => {
                    const content = wordContent(
                      word,
                      index,
                      arabicScript,
                      useDigitalKhattText,
                      applyOrnament,
                    );
                    const nodes: ReactNode[] = index > 0 ? [" "] : [];
                    nodes.push(
                      wordByWordEnabled ? (
                        <InteractiveWord
                          key={index}
                          content={content}
                          translation={word.translation}
                          isOpen={openWordIndex === index}
                          onOpenChange={(open) =>
                            setOpenWordIndex(open ? index : null)
                          }
                        />
                      ) : (
                        <span key={index}>{content}</span>
                      ),
                    );
                    return nodes;
                  })
                : `${verse.text} ${toArabicNumerals(verse.id)}`}
            </span>
          </div>
          {showTransliteration && (
            <p className="mt-2 text-right text-base font-medium text-[#3D3226]/60">
              {verse.transliteration}
            </p>
          )}
          {showTranslation && (
            <p
              className={`self-start text-base text-[#3D3226]/85 ${showTransliteration ? "-mt-2" : "mt-2"}`}
            >
              {verse.id}. {verse.translation}
            </p>
          )}
        </div>
      </motion.div>
    );
  },
);

VerseItem.displayName = "VerseItem";
export default VerseItem;
