'use client';

import { audiosTafsir } from "@/lib/data/audios";
import { getSimpleChapters } from '@/lib/quranSimpleApi';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react'; // Importe useRef

type Chapter = {
  id: number;
  transliteration: string;
  name: string;
  translation: string;
  total_verses: number;
  type: string;
};

type TafsirAudioPart = {
  id: string;
  title: string;
  url: string;
  timings: { id: number; startTime: number; endTime: number; }[];
};

type TafsirAudio = {
  id: number;
  name_simple: string;
  parts: TafsirAudioPart[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      // staggerChildren est maintenant directement sur le composant motion.ul
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 10 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function SouratePage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [showOnlyWithAudio, setShowOnlyWithAudio] = useState<boolean>(true);

  // *** AJOUT : Référence au champ de recherche ***
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sourateIdsWithAudio = new Set<number>(
    audiosTafsir.filter(audio => audio.parts && audio.parts.length > 0 && audio.parts[0].url).map(audio => audio.id)
  );

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        const fetchedChapters = await getSimpleChapters();
        if (fetchedChapters) {
          const chaptersWithAudio = fetchedChapters.filter((chapter: Chapter) =>
            sourateIdsWithAudio.has(chapter.id)
          );
          setChapters(fetchedChapters);
          setFilteredChapters(showOnlyWithAudio ? chaptersWithAudio : fetchedChapters);
        } else {
          setError(true);
        }
      } catch (e) {
        console.error("Failed to load chapters:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
  }, []);

  // Défilement vers le haut de la page au montage (pour navigation)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let currentChaptersToFilter = chapters;

    if (showOnlyWithAudio) {
      currentChaptersToFilter = chapters.filter((chapter: Chapter) =>
        sourateIdsWithAudio.has(chapter.id)
      );
    }

    if (searchTerm === '') {
      setFilteredChapters(currentChaptersToFilter);
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const results = currentChaptersToFilter.filter(chapter =>
        chapter.transliteration.toLowerCase().includes(lowercasedSearchTerm) ||
        chapter.name.toLowerCase().includes(lowercasedSearchTerm) ||
        chapter.translation.toLowerCase().includes(lowercasedSearchTerm) ||
        chapter.id.toString().includes(lowercasedSearchTerm)
      );
      setFilteredChapters(results);
    }
  }, [searchTerm, chapters, showOnlyWithAudio]);

  // *** NOUVELLE FONCTIONNALITÉ : Gérer le focus de la barre de recherche ***
  const handleFocus = () => {
    if (searchInputRef.current) {
      // Obtient la position du champ de recherche par rapport à la fenêtre
      const inputRect = searchInputRef.current.getBoundingClientRect();
      // Calcule la position de défilement nécessaire pour que le haut du champ
      // soit à 10px du haut de la fenêtre (ou ajuste si nécessaire)
      const offset = 10; // Marge en haut du champ une fois scrollé
      const scrollPosition = window.scrollY + inputRect.top - offset;

      // Défile doucement vers la position calculée
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // Une fonction handleBlur si tu veux réinitialiser le défilement (souvent pas nécessaire)
  const handleBlur = () => {
    // Optionnel: tu pourrais vouloir défiler à nouveau vers le haut de la page
    // ou à une autre position une fois que le clavier disparaît.
    // Pour l'instant, nous laissons le comportement par défaut (le navigateur gère la disparition du clavier).
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-blue-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-lg">Chargement des chapitres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Erreur lors du chargement des chapitres. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="container w-full mx-auto p-4 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-5xl font-bold text-center mb-6 text-gray-800">Chapitres du Coran</h1>

      {/* Barre de recherche animée */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.2 }}
      >
        <input
          ref={searchInputRef} // *** AJOUT : Attache la référence à l'input ***
          type="text"
          placeholder="Rechercher une sourate (nom, traduction, numéro...)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus} // *** AJOUT : Écoute l'événement focus ***
          onBlur={handleBlur}   // *** AJOUT : Écoute l'événement blur ***
        />
      </motion.div>

      {/* Bouton pour filtrer par audio */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.3 }}
        className="mb-6 text-center"
      >
        <button
          onClick={() => setShowOnlyWithAudio(!showOnlyWithAudio)}
          className={`px-5 py-2 rounded-full text-white font-semibold transition-colors duration-300 ${
            showOnlyWithAudio ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {showOnlyWithAudio ? 'Afficher toutes les sourates' : 'Afficher les sourates avec audio'}
        </button>
      </motion.div>

      {/* Liste des chapitres animée */}
      <motion.ul
        className="w-full items-center flex flex-col md:flex-row flex-wrap justify-center gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }} // Assure que staggerChildren est bien ici
      >
        <AnimatePresence mode="popLayout">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter: Chapter) => (
              <motion.li
                key={chapter.id}
                variants={itemVariants}
                layout
                className="py-4 px-2 w-full md:w-80 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <Link href={`/sourates/${chapter.id}`} className="flex-grow flex justify-between items-center gap-2">
                  <div className="text-sm font-mono font-semibold text-blue-500 bg-slate-200 p-1 w-10 flex items-center justify-center rounded-full">
                    {chapter.id}
                  </div>
                  <div className="w-full">
                    <strong className="text-lg text-gray-800">{chapter.transliteration}</strong>{' - '}
                    <span className="text-lg rounded-md font-uthmanic">{chapter.name}</span>
                    <p className="text-gray-700">
                      <span className="font-semibold truncate overflow-hidden whitespace-nowrap inline-block align-bottom max-w-[110px]">
                        {chapter.translation}
                      </span>
                      <span className="font-mono text-xs">- <span className=" font-semibold">{chapter.total_verses} </span>versets</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
                    {chapter.type === 'meccan' ? 'Mecque' : 'Médine'}
                  </span>
                </Link>
              </motion.li>
            ))
          ) : (
            <motion.li
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500 mt-4"
            >
              Aucun chapitre ne correspond à votre recherche ou ne contient d'audio.
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}