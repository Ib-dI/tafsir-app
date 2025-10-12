"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface AudioLoadingStateProps {
  isLoading: boolean;
  audioError: boolean;
  className?: string;
}

export default function AudioLoadingState({
  isLoading,
  audioError,
  className
}: AudioLoadingStateProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Chargement de l'audio...");

  // Simulation de progression du chargement audio
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const messages = [
      "Chargement de l'audio...",
      "Préparation de la lecture...",
      "Finalisation...",
    ];

    let currentProgress = 0;
    let messageIndex = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5; // Progression variable
      
      if (currentProgress >= 100) {
        setProgress(100);
        setLoadingText("Prêt !");
        clearInterval(interval);
        return;
      }

      setProgress(Math.min(currentProgress, 100));

      // Changer le message selon la progression
      if (currentProgress > 30 && messageIndex === 0) {
        messageIndex = 1;
        setLoadingText(messages[messageIndex]);
      } else if (currentProgress > 70 && messageIndex === 1) {
        messageIndex = 2;
        setLoadingText(messages[messageIndex]);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (audioError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 10,
          delay: 0.1,
        }}
        className={`absolute top-0 left-0 z-10 flex h-[50px] w-full flex-col items-center justify-center rounded border border-red-200 bg-red-50/90 backdrop-blur-sm md:h-[60px] ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-red-700 text-sm">
              Erreur de chargement audio
            </p>
            <p className="text-xs text-red-600">
              Veuillez réessayer plus tard
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 10,
          delay: 0.1,
        }}
        className={`absolute top-0 left-0 z-10 flex h-[90px] w-full flex-col items-center justify-center rounded bg-white/90 backdrop-blur-sm md:h-[60px] ${className}`}
      >
        <LoadingSpinner
          size="md"
          color="blue"
          text={loadingText}
          showProgress={true}
          progress={progress}
          className="gap-2"
        />
      </motion.div>
    );
  }

  return null;
}
