import { VerseHighlight } from "@/types/types";
import { motion } from "framer-motion";
import React from "react";

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
              {verse.text} {toArabicNumerals(verse.id)}
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