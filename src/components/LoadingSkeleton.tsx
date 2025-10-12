"use client";

import { motion, Variants } from "framer-motion";

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({ count = 3, className }: LoadingSkeletonProps) {
  const skeletonVariants : Variants = {
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity, // Move repeat to the variant level
      }
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={skeletonVariants}
          animate="animate"
          className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        >
          {/* En-tête du verset */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          </div>
          
          {/* Texte arabe */}
          <div className="space-y-2 mb-3">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
          
          {/* Traduction */}
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-4/5 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}