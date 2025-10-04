"use client";

import { motion, AnimatePresence } from "framer-motion";

function SpeedControl({
  playbackRate,
  onChange,
}: {
  playbackRate: number;
  onChange: (rate: number) => void;
}) {
  const speeds = [1, 1.25, 1.5, 1.75, 2];
  
  const handleClick = () => {
    if (!speeds.includes(playbackRate)) {
      onChange(1);
      return;
    }
    
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onChange(speeds[nextIndex]);
  };

  // Fonction pour obtenir les classes de couleur en fonction de la vitesse
  const getColorClasses = (rate: number) => {
    switch (rate) {
      case 1:
        return {
          bg: "bg-green-100/50",
          hover: "hover:bg-green-100",
          text: "text-green-600",
          border: "border-green-300"
        };
      case 1.25:
        return {
          bg: "bg-blue-100/50",
          hover: "hover:bg-blue-100",
          text: "text-blue-500",
          border: "border-blue-300"
        };
      case 1.5:
        return {
          bg: "bg-yellow-100/50",
          hover: "hover:bg-yellow-100",
          text: "text-yellow-600",
          border: "border-yellow-400"
        };
      case 1.75:
        return {
          bg: "bg-orange-100/50",
          hover: "hover:bg-orange-100",
          text: "text-orange-600",
          border: "border-orange-400"
        };
      case 2:
        return {
          bg: "bg-red-100/50",
          hover: "hover:bg-red-100",
          text: "text-red-700",
          border: "border-red-400"
        };
      default:
        return {
          bg: "bg-gray-100",
          hover: "hover:bg-gray-200",
          text: "text-gray-700",
          border: "border-gray-300"
        };
    }
  };

  const colors = getColorClasses(playbackRate);

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        className={`cursor-pointer rounded-lg font-medium px-2.5 py-1 text-xs md:text-sm w-[40px] md:w-[50px] h-7 flex items-center justify-center transition-colors duration-200 border-[0.8px] ${colors.bg} ${colors.hover} ${colors.text} ${colors.border}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={playbackRate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="font-medium"
          >
            x{playbackRate}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export default SpeedControl;