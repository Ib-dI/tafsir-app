"use client";

import { cn } from "@/lib/utils";
import { motion, Variants } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "blue" | "green" | "red" | "yellow" | "gray" | "gold";
  text?: string;
  className?: string;
  showProgress?: boolean;
  progress?: number;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const colorClasses = {
  blue: "border-blue-500",
  green: "border-green-500",
  red: "border-red-500",
  yellow: "border-yellow-500",
  gray: "border-gray-500",
  gold: "border-[#d28820]",
};

const textColorClasses = {
  blue: "text-blue-600",
  green: "text-green-600",
  red: "text-red-600",
  yellow: "text-yellow-600",
  gray: "text-gray-600",
  gold: "text-[#3D3226]",
};

const bgColorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  gray: "bg-gray-500",
  gold: "bg-[#d28820]",
};

export default function LoadingSpinner({
  size = "md",
  color = "blue",
  text,
  className,
  showProgress = false,
  progress = 0,
}: LoadingSpinnerProps) {
  const spinnerVariants: Variants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      },
    },
  };

  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const progressVariants: Variants = {
    initial: { width: "0%" },
    animate: {
      width: `${Math.max(0, Math.min(100, progress))}%`,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      {/* Spinner principal */}
      <div className="relative">
        {/* Cercle de fond avec effet de pulsation */}
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className={cn(
            "absolute inset-0 rounded-full border-2 opacity-20",
            colorClasses[color],
            sizeClasses[size],
          )}
        />

        {/* Spinner rotatif */}
        <motion.div
          variants={spinnerVariants}
          animate="animate"
          className={cn(
            "rounded-full border-2 border-transparent border-t-current",
            colorClasses[color],
            textColorClasses[color],
            sizeClasses[size],
          )}
          style={{
            borderTopColor: "currentColor",
          }}
        />
      </div>

      {/* Barre de progression si activée */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="mb-1 flex justify-between text-xs text-[#3D3226]/60">
            <span>Chargement</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#3D3226]/10">
            <motion.div
              variants={progressVariants}
              initial="initial"
              animate="animate"
              className={cn(
                "h-full rounded-full transition-colors duration-300",
                bgColorClasses[color],
              )}
            />
          </div>
        </div>
      )}

      {/* Texte optionnel */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "w-48 text-center text-sm font-medium",
            textColorClasses[color],
          )}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
