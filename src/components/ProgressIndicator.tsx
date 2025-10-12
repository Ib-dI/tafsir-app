import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface ProgressIndicatorProps {
    loadProgress: () => { chapterId: number; currentPartIndex: number } | null;
    clearProgressManually: () => void;
    currentChapterId: number ;
    currentPartIndex: number ;
    audioUrl: string | null;
    isRestoringProgress: boolean;
    isMobile: boolean;
}


const ProgressIndicator = ({
    loadProgress,
    clearProgressManually,
    currentChapterId,
    currentPartIndex,
    audioUrl,
    isRestoringProgress,
    isMobile,
}: ProgressIndicatorProps) => {
    const [hasSavedProgress, setHasSavedProgress] = useState(false);
    const [savedPartIndex, setSavedPartIndex] = useState<number | null>(null);

    useEffect(() => {
      const progress = loadProgress();
      const hasProgress = !!progress && Number(progress.chapterId) === currentChapterId;
      setHasSavedProgress(hasProgress);
      setSavedPartIndex(progress?.currentPartIndex ?? null);
    }, [loadProgress, currentChapterId, currentPartIndex]);

    if (!hasSavedProgress || !audioUrl || isRestoringProgress) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute ${isMobile ? "-top-[61px]" : "-top-32"}  p- left-1/2 transform -translate-x-1/2 z-10`}
      >
        <div className="flex items-center gap-2 bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
          {isRestoringProgress ? (
            <LoadingSpinner size="sm" color="green" />
          ) : (
            <Info className="h-3 w-3" />
          )}
          <span className="whitespace-nowrap">
            Partie {savedPartIndex !== null ? savedPartIndex + 1 : '?'} sauvegardée
            {isRestoringProgress && " (restauration...)"}
          </span>
          {!isRestoringProgress && (
            <button 
              onClick={clearProgressManually}
              className="text-green-600 hover:text-green-800 text-xs underline"
              title="Effacer la progression"
            >
              Effacer
            </button>
          )}
        </div>
      </motion.div>
    );
  };
export default ProgressIndicator