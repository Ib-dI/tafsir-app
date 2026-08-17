"use client";

import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#FBF3E4] p-1 md:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-lg rounded-lg bg-white p-6 text-center sm:p-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.1 }}
          className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#d28820]/10"
        >
          <Compass size={32} className="text-[#d28820]" />
        </motion.div>

        <h1 className="text-6xl font-black text-[#d28820] sm:text-7xl">404</h1>
        <h2 className="mt-2 text-2xl font-bold text-[#3D3226] sm:text-3xl">
          Page introuvable
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[#3D3226]/70">
          Cette page n&apos;existe pas ou plus. Vérifiez l&apos;adresse ou
          repartez d&apos;ici.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full rounded-full bg-[#d28820] px-6 py-3 font-bold whitespace-nowrap text-white shadow-md transition-colors hover:bg-[#d28820]/90 sm:w-auto"
            >
              Retour à l&apos;accueil
            </motion.button>
          </Link>
          <Link href="/sourates">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full rounded-full border border-[#3D3226]/20 bg-transparent px-6 py-3 font-bold whitespace-nowrap text-[#3D3226] transition-colors hover:bg-[#3D3226]/5 sm:w-auto"
            >
              Voir les sourates
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
