"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AnimatedBackButton() {
  const searchParams = useSearchParams();
  const showAudioParam = searchParams.get("showAudio");

  const backToSouratesHref =
    showAudioParam === "all" ? "/sourates?showAudio=all" : "/sourates";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.1 }}
      className="mb-4 w-fit" // Déplacé w-fit ici
    >
      <Link href={backToSouratesHref}>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#BFDBFE" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 rounded-full bg-blue-100 md:px-4 px-3 py-2 text-blue-700 shadow-sm transition-colors duration-200 hover:bg-blue-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          <span className="font-semibold hidden sm:inline">Retour aux chapitres</span>
        </motion.button>
      </Link>
    </motion.div>
  );
}