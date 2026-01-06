import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

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
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
      const progress = loadProgress();
      const hasProgress = !!progress && Number(progress.chapterId) === currentChapterId;
      setHasSavedProgress(hasProgress);
      setSavedPartIndex(progress?.currentPartIndex ?? null);
      
      // Afficher le toast si on a une progression sauvegardée et que l'audio est disponible
      if (hasProgress && audioUrl && !isRestoringProgress) {
        setShowToast(true);
        
        // Masquer le toast après 5 secondes
        const timer = setTimeout(() => {
          setShowToast(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      } else {
        setShowToast(false);
      }
    }, [loadProgress, currentChapterId, currentPartIndex, audioUrl, isRestoringProgress]);

    if (!hasSavedProgress || !audioUrl || isRestoringProgress || !showToast) return null;

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
                Partie {savedPartIndex !== null ? savedPartIndex + 1 : '?'} sauvegardée
              </span>
              <button 
                onClick={clearProgressManually}
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