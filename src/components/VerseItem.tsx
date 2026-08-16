import { cn } from "@/lib/utils";
import { VerseHighlight, VerseWord } from "@/types/types";
import { motion } from "framer-motion";
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
function InteractiveWord({
  word,
  isOpen,
  onToggle,
}: {
  word: VerseWord;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!word.translation) {
    return <span>{word.arabic}</span>;
  }

  return (
    <span className="group relative inline-block">
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "-mx-0.5 cursor-pointer rounded px-0.5 transition-colors",
          isOpen ? "bg-amber-100" : "hover:bg-amber-100",
        )}
      >
        {word.arabic}
      </span>
      {/* Sous le mot, pas au-dessus : la carte du verset a
          content-visibility:auto (voir plus bas), qui impose un
          confinement de peinture — tout ce qui dépasse la boîte de la
          carte est rogné. Une bulle au-dessus du premier mot (en haut de
          la carte) serait donc invisible. */}
      <span
        role="tooltip"
        style={{ direction: "ltr" }}
        className={cn(
          "pointer-events-none absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded-lg bg-gray-800 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity",
          isOpen ? "opacity-100" : "group-hover:opacity-100",
        )}
      >
        {word.translation}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
      </span>
    </span>
  );
}

const VerseItem = React.memo(
  ({
    verse,
    isActive,
    audioUrl,
    seekToVerse,
    isMobile,
  }: {
    verse: VerseHighlight;
    isActive: boolean;
    audioUrl: string;
    seekToVerse: (verse: VerseHighlight) => void;
    isMobile: boolean;
  }) => {
    const [openWordIndex, setOpenWordIndex] = useState<number | null>(null);

    return (
      <motion.div
        key={`verse-${verse.id}`}
        id={`verse-${verse.id}`}
        onClick={() => !verse.noAudio && seekToVerse(verse)}
        className={`my-1 cursor-pointer rounded-2xl p-3 [content-visibility:auto] [contain-intrinsic-size:auto_120px] transition-colors duration-250 ease-in-out ${
          !verse.noAudio ? "hover:bg-gray-50" : ""
        } ${
          verse.noAudio
            ? "border-[0.7px] border-x-2 md:border-x-4 border-blue-200 bg-gray-50/50"
            : isActive && audioUrl
              ? `bg-[rgba(255,255,204,0.4)] border-[0.7px] ${isMobile ? "border-x-2" : "border-x-4"} border-[#F59E0B] shadow-[0_0_10px_5px_rgba(255,193,7,0.5)]`
              : "border-transparent"
        }`}
        animate={{ scale: isActive && audioUrl ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 25, mass: 1.2 }}
      >
        <div className="flex flex-col items-end justify-end gap-2">
          {verse.noAudio && (
            <span className="mb-1 self-start text-xs font-medium text-blue-500">
              Verset sans audio
            </span>
          )}
          <div
            className="verse-arabic-text mt-2 flex items-center text-right leading-relaxed text-gray-800 md:gap-1"
            style={{ direction: "rtl" }}
          >
            <span style={{ direction: "rtl" }}>
              {verse.words.length > 0
                ? verse.words.flatMap((word, index) => {
                    const nodes: ReactNode[] = index > 0 ? [" "] : [];
                    nodes.push(
                      <InteractiveWord
                        key={index}
                        word={word}
                        isOpen={openWordIndex === index}
                        onToggle={() =>
                          setOpenWordIndex((current) => (current === index ? null : index))
                        }
                      />,
                    );
                    return nodes;
                  })
                : verse.text}{" "}
              {toArabicNumerals(verse.id)}
            </span>
          </div>
          <p className="text-md mt-2 text-right font-medium text-gray-500">
            {verse.transliteration}
          </p>
          <p className="-mt-2 self-start text-gray-700">
            {verse.id}. {verse.translation}
          </p>
        </div>
      </motion.div>
    );
  },
);

VerseItem.displayName = "VerseItem";
export default VerseItem;