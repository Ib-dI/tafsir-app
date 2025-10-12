"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface ProgressRestorationLoaderProps {
  isRestoring: boolean;
  className?: string;
}

export default function ProgressRestorationLoader({
  isRestoring,
  className
}: ProgressRestorationLoaderProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isRestoring) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(interval);
  }, [isRestoring]);

  if (!isRestoring) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm ${className}`}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4"
      >
        <LoadingSpinner
          size="md"
          color="green"
          className="mb-4"
        />
        <div className="text-center">
          <p className="text-gray-700 font-medium">
            Restauration de votre progression{dots}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Reprise de votre dernière position
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
