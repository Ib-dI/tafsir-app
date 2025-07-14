'use client';

import { motion } from 'framer-motion';
import { Compass, Headphones } from 'lucide-react';
import Link from 'next/link';

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
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"> {/* Arrière-plan plus sobre */}
      {/* Conteneur principal reprenant le style des cartes de sourates */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants} // Utilise les variants pour l'animation d'entrée globale
        transition={{ delayChildren: 0.2, staggerChildren: 0.1 }}
        className="bg-white p-6 sm:p-10 rounded-lg shadow-lg max-w-4xl w-full text-center mt-8 mb-8" // Classes de la page sourates
      >
        {/* Titre principal */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6 leading-tight" // Font-bold pour harmoniser
        >
          Apprenez le Tafsir du Coran en <span className="relative inline-block"><span className="absolute inset-0 flex -rotate-2 transform items-center justify-center rounded-md bg-[#ff3131]/90" style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}><span className="px-3 pt-1 pb-2 text-white" style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}>Shi-Maoré</span></span><span className="invisible px-3 pt-1 pb-2">Shi-Maoré</span></span>
        </motion.h1>

        {/* Sous-titre / Description */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto"
        >
          Découvrez une nouvelle façon d&apos;étudier le Coran grâce à notre plateforme intuitive,
          synchronisant les audios de Tafsir en Shi-Maoré avec le texte sacré.
        </motion.p>

        {/* Section des fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Carte de fonctionnalité 1 */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center" // Style plus proche des list-items
          >
            <Headphones size="42" className='text-blue-500' />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Synchronisation Audio-Texte</h3>
            <p className="text-gray-600">Suivez le Tafsir verset par verset, avec le texte coranique mis en évidence en temps réel.</p>
          </motion.div>

          {/* Carte de fonctionnalité 2 */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center" // Style plus proche des list-items
          >
            <Compass size="42" className=' text-blue-500' />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Navigation Facile</h3>
            <p className="text-gray-600">Recherchez vos sourates par nom ou numéro et reprenez votre étude là où vous l&apos;avez laissée.</p>
          </motion.div>
        </div>

        {/* Bouton d'appel à l'action */}
        <motion.div
          variants={itemVariants}
        >
          <Link href="/sourates" passHref>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-md transition-all duration-300 ease-in-out" // Shadow-md harmonisé
            >
              Commencer le Tafsir
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Pied de page simple */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
        className="mt-12 text-gray-600 text-sm"
      >
        <p>&copy; {new Date().getFullYear()} Votre Plateforme Tafsir. Tous droits réservés.</p>
      </motion.footer>
    </div>
  );
}