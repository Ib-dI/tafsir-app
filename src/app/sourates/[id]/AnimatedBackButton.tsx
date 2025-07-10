"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function AnimatedBackButton() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring" as const, stiffness: 100, damping: 10, delay: 0.1 }}
      className="mb-4"
    >
      <Link href="/sourates" passHref>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#BFDBFE" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-semibold">Retour aux chapitres</span>
        </motion.button>
      </Link>
    </motion.div>
  );
} 