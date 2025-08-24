'use client'

import { motion } from "framer-motion"; // Importe motion
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  // Variants pour animer les éléments de la navigation
  const navVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        // staggerChildren déplacé dans la prop du composant
      }
    }
  };

  const linkVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={navVariants} // Applique l'animation à l'en-tête entier
      className="bg-white border-b border-gray-200 shadow" // shadow-md pour l'homogénéité
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + nom */}
        <Link href="/" className="flex items-center gap">
          <motion.div // Anime le conteneur du logo/texte
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring" as const, stiffness: 100, damping: 15, delay: 0.2 }}
          >
            <Image
              src="/fingerprint.webp"
              alt="logo"
              width={36}
              height={36}
              className="rounded-full"
              priority
            />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring" as const, stiffness: 100, damping: 15, delay: 0.3 }}
            className="text-xl font-bold text-gray-800"
          >
            Tafsir
          </motion.span>
        </Link>

        {/* Liens de navigation */}
        <nav>
          <motion.ul
            className="flex items-center gap-6 text-sm font-medium text-gray-600"
            variants={navVariants} // Utilise les variants pour animer la liste de navigation
            transition={{ staggerChildren: 0.1 }}
          >
            <motion.li variants={linkVariants}>
              <Link
                href="/"
                className="hover:text-blue-500 transition-colors" // blue-500 pour l'homogénéité
              >
                Accueil
              </Link>
            </motion.li>
            <motion.li variants={linkVariants}>
              <Link
                href="/sourates"
                className="hover:text-blue-500 transition-colors" // blue-500 pour l'homogénéité
              >
                Sourates
              </Link>
              
            </motion.li>
            <motion.li variants={linkVariants}>
            <Link
                href="/settings"
                className="hover:text-blue-500 transition-colors" // blue-500 pour l'homogénéité
              >
                Paramètres
              </Link>
            </motion.li>
          </motion.ul>
        </nav>
      </div>
    </motion.header>
  )
}