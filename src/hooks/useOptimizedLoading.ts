"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseOptimizedLoadingProps {
  initialLoading?: boolean;
  loadingTimeout?: number;
  enableProgressiveLoading?: boolean;
}

export function useOptimizedLoading({
  initialLoading = false,
  loadingTimeout = 30000, // 30 secondes max
  enableProgressiveLoading = true
}: UseOptimizedLoadingProps = {}) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("");
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Démarrer le chargement
  const startLoading = useCallback((stage: string = "Chargement...") => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStage(stage);
    setHasTimedOut(false);
    startTimeRef.current = Date.now();

    // Timeout de sécurité
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setHasTimedOut(true);
      setIsLoading(false);
      console.warn('⏰ Chargement timeout après', loadingTimeout, 'ms');
    }, loadingTimeout);

    // Progression simulée si activée
    if (enableProgressiveLoading) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const expectedProgress = Math.min((elapsed / loadingTimeout) * 100, 95);
        
        setLoadingProgress(prev => {
          // Progression plus lente vers la fin
          const increment = Math.max(1, (expectedProgress - prev) * 0.1);
          return Math.min(prev + increment, expectedProgress);
        });
      }, 200);
    }
  }, [loadingTimeout, enableProgressiveLoading]);

  // Arrêter le chargement
  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingProgress(100);
    
    // Nettoyer les timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Animation de fin
    setTimeout(() => {
      setLoadingProgress(0);
      setLoadingStage("");
    }, 500);
  }, []);

  // Mettre à jour l'étape de chargement
  const updateLoadingStage = useCallback((stage: string, progress?: number) => {
    setLoadingStage(stage);
    if (progress !== undefined) {
      setLoadingProgress(progress);
    }
  }, []);

  // Mettre à jour la progression
  const updateProgress = useCallback((progress: number) => {
    setLoadingProgress(Math.max(0, Math.min(100, progress)));
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    loadingProgress,
    loadingStage,
    hasTimedOut,
    startLoading,
    stopLoading,
    updateLoadingStage,
    updateProgress,
    setIsLoading
  };
}
