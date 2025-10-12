"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import LoadingSkeleton from "./LoadingSkeleton";

interface LazyVerseLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  skeletonCount?: number;
  className?: string;
}

export default function LazyVerseLoader({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = "50px",
  skeletonCount = 3,
  className
}: LazyVerseLoaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Observer pour détecter quand l'élément entre dans le viewport
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  // Délai artificiel pour simuler le chargement
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 300); // 300ms de délai pour une transition fluide

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const defaultFallback = (
    <LoadingSkeleton count={skeletonCount} className={className} />
  );

  if (!isVisible) {
    return (
      <div ref={elementRef} className="min-h-[250px]">
        {defaultFallback}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {fallback || defaultFallback}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: "easeOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
