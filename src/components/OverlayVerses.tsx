import { motion } from "framer-motion";
import { Verse } from "@/types/types";

interface OverlayVersesProps {
  verses: Verse[];
  currentVerseId: number | null;
  isMobile: boolean;
  audioUrl: string | null;
  toArabicNumerals: (num: number) => string;
}

const OverlayVerses = ({
  verses,
  currentVerseId,
  isMobile,
  audioUrl,
  toArabicNumerals,
}: OverlayVersesProps) => {
  const currentVerse = verses.find((v) => v.id === currentVerseId);
  const overlayThreshold = isMobile ? 290 : 410;

  if (currentVerse && currentVerse.text.length > overlayThreshold && audioUrl) {
    const overlayVariants = {
      hidden: {
        opacity: 0,
        y: isMobile ? 35 : -30,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    };

    return (
      <>
        <div className="pointer-events-none fixed inset-0 z-[90] bg-black/10" />
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          className={`pointer-events-none fixed z-[100] flex w-full justify-center overflow-y-auto ${
            isMobile
              ? "bottom-[20px] left-0"
              : "top-[265px] left-1/2 -translate-x-1/2"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div
            className="animate-fade-in mx-2 flex max-h-fit w-full max-w-2xl flex-col items-end rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3 shadow-lg"
            style={{ direction: "rtl" }}
          >
            <div className="font-uthmanic flex items-center gap-1 text-right text-[24px] leading-relaxed text-gray-800 md:text-3xl">
              <span>
                {currentVerse.text} {toArabicNumerals(currentVerse.id)}
              </span>
            </div>
            {currentVerse.transliteration.length < (isMobile ? 350 : 400) && (
              <p
                className="text-md mt-[-5px] self-end font-medium text-gray-500"
                style={{ direction: "ltr" }}
              >
                {currentVerse.transliteration}
              </p>
            )}
            <p
              className="self-start text-gray-700"
              style={{ direction: "ltr" }}
            >
              {currentVerse.id}. {currentVerse.translation}
            </p>
          </div>
        </motion.div>
      </>
    );
  }
  return null;
};
export default OverlayVerses;
