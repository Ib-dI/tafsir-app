import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlaybackPosition } from "@/types/types";

interface ProgressIndicatorProps {
    restoredPosition: PlaybackPosition | null;
    resetPlaybackPosition: () => void;
    audioUrl: string | null;
    isMobile: boolean;
}

const ProgressIndicator = ({
    restoredPosition,
    resetPlaybackPosition,
    audioUrl,
    isMobile,
}: ProgressIndicatorProps) => {
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
      if (restoredPosition && audioUrl) {
        setShowToast(true);

        // Masquer le toast après 5 secondes
        const timer = setTimeout(() => {
          setShowToast(false);
        }, 5000);

        return () => clearTimeout(timer);
      } else {
        setShowToast(false);
      }
    }, [restoredPosition, audioUrl]);

    if (!restoredPosition || !audioUrl || !showToast) return null;

    return (
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`fixed ${isMobile ? "top-20" : "top-24"} left-1/2 transform -translate-x-1/2 z-50`}
          >
            <div className="flex items-center gap-2 bg-green-100 text-green-800 text-xs px-3 py-2 rounded-full shadow-lg border border-green-200">
              <Info className="h-3 w-3" />
              <span className="whitespace-nowrap">
                Partie {restoredPosition.currentPartIndex + 1} sauvegardée
              </span>
              <button
                onClick={resetPlaybackPosition}
                className="text-green-600 hover:text-green-800 text-xs underline ml-1"
                title="Effacer la progression"
              >
                Effacer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
export default ProgressIndicator
