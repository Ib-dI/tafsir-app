import { motion } from "framer-motion";
import React from "react";
import { VerseHighlight } from "@/types/types";

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
    currentVerseId,
    audioUrl,
    seekToVerse,
  }: {
    verse: VerseHighlight;
    currentVerseId: number | null;
    currentOccurrence: number | null;
    audioUrl: string;
    seekToVerse: (verse: VerseHighlight) => void;
  }) => {
    const isActive = verse.id === currentVerseId;

    return (
      <motion.div
        key={`verse-${verse.id}`}
        id={`verse-${verse.id}`}
        onClick={() => !verse.noAudio && seekToVerse(verse)}
        className={`my-1 cursor-pointer rounded-lg p-3 ${
          !verse.noAudio ? "hover:bg-gray-50" : ""
        } ${
          verse.noAudio
            ? "border-[0.7px] border-l-4 border-blue-200 bg-gray-50/50"
            : ""
        }`}
        animate={{
          backgroundColor: verse.noAudio
            ? "rgba(249, 250, 251, 0.5)"
            : isActive && audioUrl
              ? "rgba(255, 255, 204, 0.4)"
              : "rgba(255, 255, 255, 0)",
          borderColor: verse.noAudio
            ? "rgba(186, 230, 253, 1)"
            : isActive && audioUrl
              ? "#F59E0B"
              : "rgba(0, 0, 0, 0)",
          borderWidth: isActive && audioUrl ? "0.7px" : "0px",
          borderLeftWidth:
            verse.noAudio || (isActive && audioUrl) ? "4px" : "0px",
          boxShadow:
            isActive && audioUrl
              ? "0 0 10px 5px rgba(255, 193, 7, 0.5)"
              : "none",
          scale: isActive && audioUrl ? 1.02 : 1,
        }}
        transition={{
          default: {
            type: "tween",
            duration: 0.25,
            ease: "easeInOut",
          },
          scale: {
            type: "spring",
            stiffness: 250,
            damping: 25,
            mass: 1.2,
          },
        }}
      >
        <div className="flex flex-col items-end justify-end gap-2">
          {verse.noAudio && (
            <span className="mb-1 self-start text-xs font-medium text-blue-500">
              Verset sans audio
            </span>
          )}
          <div
            className="font-uthmanic mt-2 flex items-center text-right text-[23.5px] leading-relaxed text-gray-800 md:gap-1 md:text-3xl"
            style={{ direction: "rtl" }}
          >
            <span style={{ direction: "rtl" }}>
              {verse.text} {toArabicNumerals(verse.id)}
            </span>
          </div>
          <p className="text-md mt-[-8px] text-right font-medium text-gray-500">
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

export default VerseItem;