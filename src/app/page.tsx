"use client";

// import NotificationPermission from "@/components/NotificationPermission";
import { motion, Variants } from "framer-motion";
import { Compass, Headphones } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  // Variants pour les animations d'entrée des sections
  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  // Variants pour les éléments individuels (titres, paragraphes, cartes)
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 },
    },
  };

  const floatingVariants: Variants = {
    animate: {
      y: [0, -10, 0],
      rotate: [0, 2, 0, -2, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-1 md:p-4">
      {" "}
      {/* Arrière-plan plus sobre */}
      {/* Conteneur principal reprenant le style des cartes de sourates */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants} // Utilise les variants pour l'animation d'entrée globale
        transition={{ delayChildren: 0.2, staggerChildren: 0.1 }}
        className="mt-8 mb-8 w-full max-w-4xl rounded-lg bg-white p-6 text-center shadow-lg sm:p-10" // Classes de la page sourates
      >
        {/* <NotificationPermission /> */}
        {/* Titre principal */}
        <motion.h1
          variants={itemVariants}
          className="mb-6 text-4xl leading-tight font-bold text-gray-800 sm:text-5xl" // Font-bold pour harmoniser
        >
          Apprenez le Tafsir du Coran en{" "}
          <motion.span className="relative inline-block "
                variants={floatingVariants}
                animate="animate"
                >
            <span
              className="absolute inset-0 flex -rotate-2 transform items-center justify-center rounded-md bg-[#ff3131]/90"
              style={{ opacity: 1, filter: "blur(0px)", transform: "none" }}
            >
              <span
                className="px-3 pt-1 pb-2 text-white"
                style={{ opacity: 1, filter: "blur(0px)", transform: "none" }}
              >
                Shi-Maoré
              </span>
            </span>
            <span className="invisible px-3 pt-1 pb-2">Shi-Maoré</span>
          </motion.span>
        </motion.h1>

        {/* Sous-titre / Description */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mb-8 max-w-2xl text-lg text-gray-700 sm:text-xl"
        >
          Découvrez une nouvelle façon d&apos;étudier le Coran grâce à notre
          plateforme intuitive, synchronisant les audios de Tafsir en Shi-Maoré
          avec le texte sacré.
        </motion.p>

        {/* Bouton d'appel à l'action - déplacé ici */}
        <motion.div
          variants={itemVariants}
          className="mb-8 flex justify-center"
        >
          <Link href="/sourates" passHref>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="order-1 rounded-full bg-blue-600 px-4 py-3 text-xl font-bold whitespace-nowrap text-white shadow-md transition-all duration-300 ease-in-out hover:bg-blue-700 md:px-8"
            >
              Commencer le Tafsir
            </motion.button>
          </Link>
        </motion.div>

        {/* Section des fonctionnalités */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Carte de fonctionnalité 1 */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-6 shadow-sm" // Style plus proche des list-items
          >
            <Headphones size="42" className="text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold text-gray-800">
              Synchronisation Audio-Texte
            </h3>
            <p className="text-gray-600">
              Suivez le Tafsir verset par verset, avec le texte coranique mis en
              évidence en temps réel.
            </p>
          </motion.div>

          {/* Carte de fonctionnalité 2 */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-6 shadow-sm" // Style plus proche des list-items
          >
            <Compass size="42" className="text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold text-gray-800">
              Navigation Facile
            </h3>
            <p className="text-gray-600">
              Recherchez vos sourates par nom ou numéro et reprenez votre étude
              là où vous l&apos;avez laissée.
            </p>
          </motion.div>
        </div>
      </motion.div>
      {/* Pied de page simple */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
        className="mt-12 text-sm text-gray-600"
      >
        <p>
          &copy; {new Date().getFullYear()} Plateforme Tafsir. Tous droits
          réservés.
        </p>
      </motion.footer>
    </div>
  );
}
