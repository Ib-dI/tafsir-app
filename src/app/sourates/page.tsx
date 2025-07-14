'use client';

import { audiosTafsir } from "@/lib/data/audios";
import { getSimpleChapters } from '@/lib/quranSimpleApi';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines } from "lucide-react";
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'; // Ajout de useCallback
import { useRouter, useSearchParams } from "next/navigation"

type Chapter = {
  id: number;
  transliteration: string;
  name: string;
  translation: string;
  total_verses: number;
  type: string;
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
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook pour lire les paramètres d'URL

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Initialise showOnlyWithAudio à partir du paramètre d'URL 'showAudio'
  // Si 'showAudio' est 'all', alors false (afficher tout), sinon true (afficher avec audio seulement)
  // On le définit après le premier rendu via useEffect pour s'assurer que searchParams est prêt
  const [showOnlyWithAudio, setShowOnlyWithAudio] = useState<boolean>(true); // Valeur par défaut robuste

  const searchInputRef = useRef<HTMLInputElement>(null);

  const sourateIdsWithAudio = useMemo(
    () =>
      new Set<number>(
        audiosTafsir.filter(audio => audio.parts && audio.parts.length > 0 && audio.parts[0].url).map(audio => audio.id)
      ),
    [] // audiosTafsir est une constante, pas besoin de la mettre en dépendance ici
  );

  // Premier useEffect: Charger les chapitres et initialiser le filtre basé sur l'URL
  useEffect(() => {
    async function loadChaptersAndSetInitialFilter() {
      try {
        setLoading(true);
        const fetchedChapters = await getSimpleChapters();
        if (fetchedChapters) {
          setChapters(fetchedChapters); // Stocke tous les chapitres

          // Lire la valeur du paramètre d'URL une fois que searchParams est prêt
          const initialShowAudioFromUrl = searchParams.get('showAudio') !== 'all';
          setShowOnlyWithAudio(initialShowAudioFromUrl);

          // Appliquer le filtre initial immédiatement après avoir chargé les chapitres
          let initialChaptersToFilter = fetchedChapters;
          if (initialShowAudioFromUrl) {
            initialChaptersToFilter = fetchedChapters.filter((chapter: Chapter) =>
              sourateIdsWithAudio.has(chapter.id)
            );
          }
          setFilteredChapters(initialChaptersToFilter); // Initialise filteredChapters ici
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
    loadChaptersAndSetInitialFilter();
  }, [searchParams, sourateIdsWithAudio]); // Dépend de searchParams et sourateIdsWithAudio (même si constant, bonne pratique)


  // Défilement vers le haut de la page au montage (pour navigation)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Effet pour re-filtrer quand le terme de recherche OU l'état du filtre audio change
  // Ce useEffect s'exécutera après le chargement initial si chapters, searchTerm ou showOnlyWithAudio changent
  useEffect(() => {
    if (loading) return; // Ne filtre pas si les chapitres ne sont pas encore chargés (pour éviter le filtrage sur chapters vides)

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
  }, [searchTerm, chapters, showOnlyWithAudio, sourateIdsWithAudio, loading]); // Ajout de 'loading' pour déclencher le filtre après le chargement


  const handleFocus = useCallback(() => { // Utilisez useCallback pour cette fonction
    if (searchInputRef.current) {
      const inputRect = searchInputRef.current.getBoundingClientRect();
      const offset = 10;
      const scrollPosition = window.scrollY + inputRect.top - offset;

      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, []); // Aucune dépendance car searchInputRef.current est constant sur le cycle de vie du composant

  const handleBlur = () => {
    // Laisser vide pour le moment, ou ajouter une logique si nécessaire
  };

  // Nouvelle fonction pour gérer le changement du filtre et mettre à jour l'URL
  const toggleShowOnlyWithAudio = () => {
    const newState = !showOnlyWithAudio;
    setShowOnlyWithAudio(newState);

    // Crée une nouvelle URLSearchParams à partir de l'actuelle
    const currentParams = new URLSearchParams(searchParams.toString());
    if (newState) {
      currentParams.delete('showAudio'); // Si true, on n'a pas besoin du paramètre (URL plus propre)
    } else {
      currentParams.set('showAudio', 'all'); // Si false, on met 'all'
    }

    // Met à jour l'URL sans recharger la page
    router.replace(`?${currentParams.toString()}`);
  };


  if (loading && chapters.length === 0) { // Condition de chargement plus robuste
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

      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 10, delay: 0.2 }}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Rechercher une sourate (nom, traduction, numéro...)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
          onClick={toggleShowOnlyWithAudio} // Utilise la nouvelle fonction
          className={`px-5 py-2 rounded-full text-white font-semibold transition-colors duration-300 ${
            showOnlyWithAudio ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {showOnlyWithAudio ? 'Afficher toutes les sourates' : 'Afficher les sourates avec audio'}
        </button>
      </motion.div>

      <motion.ul
        className="w-full items-center flex flex-col md:flex-row flex-wrap justify-center gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
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
                {/* Lien vers la sourate individuelle - IMPORANT : Conserver le paramètre d'URL */}
                <Link
                  href={`/sourates/${chapter.id}${!showOnlyWithAudio ? '?showAudio=all' : ''}`}
                  className="flex-grow flex justify-between items-center gap-2"
                >
                  <div
                    className={`text-sm font-mono font-semibold text-blue-500 bg-slate-200 p-1 w-10 flex items-center justify-center rounded-full`}
                  >
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
                    {/* Affichage conditionnel des icônes audio */}
                    {sourateIdsWithAudio.has(chapter.id) ? (
                      <div className="flex">
                        <AudioLines size={18} className="inline-block text-blue-500" />
                        <AudioLines size={18} className="inline-block text-gray-400" />
                        <AudioLines size={18} className="inline-block text-gray-400" />
                      </div>
                    ) : (
                      // Optionnel: Vous pouvez ajouter un placeholder vide ou d'autres icônes
                      // pour maintenir la cohérence de la mise en page si aucune icône n'est présente
                      <div className="h-[18px]"></div> // Crée un espace vide de la même hauteur que les icônes
                    )}
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
              Aucun chapitre ne correspond à votre recherche ou ne contient d&apos;audio.
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}