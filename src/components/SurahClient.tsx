// pages/surah-client.js
"use client"
import { useEffect, useState } from 'react';

export default function SurahClient() {
  const [surahData, setSurahData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapters, setChapters] = useState<any[]>([]);

  // Récupérer la liste de toutes les sourates via notre API route
  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/quran?action=chapters');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des sourates');
      }

      return result.data;
    } catch (err) {
      console.error('Erreur lors de la récupération des sourates:', err);
      throw err;
    }
  };

  // Récupérer les versets d'une sourate via notre API route
  const fetchVerses = async (chapterId: number) => {
    try {
      const response = await fetch(`/api/quran?action=verses&chapterId=${chapterId}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(result.data)
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des versets');
      }

      return result.data;
    } catch (err) {
      console.error('Erreur lors de la récupération des versets:', err);
      throw err;
    }
  };

  // Initialisation : charger les sourates et la première sourate
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setError(null);

        // Charger les sourates
        const chaptersData = await fetchChapters();
        setChapters(chaptersData);

        // Charger la première sourate
        const versesData = await fetchVerses(1);
        setSurahData(versesData);

      } catch (err) {
        console.error("Erreur d'initialisation:", err);
        setError("Impossible de se connecter à l'API. Vérifiez vos identifiants dans le fichier .env.local");
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  // Charger une nouvelle sourate quand elle est sélectionnée
  useEffect(() => {
    if (selectedChapter === 1) return; // Éviter le double chargement initial

    async function loadChapter() {
      try {
        setLoading(true);
        setError(null);

        const versesData = await fetchVerses(selectedChapter);
        setSurahData(versesData);

      } catch (err) {
        console.error("Erreur lors du chargement de la sourate:", err);
        setError("Impossible de charger cette sourate. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    }

    loadChapter();
  }, [selectedChapter]);

  const handleChapterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChapter(parseInt(event.target.value));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Chargement de la sourate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-100">
        <div className="text-center">
          <p className="text-xl text-red-700 mb-4">{error}</p>
          <p className="text-sm text-red-600">
            Assurez-vous d'avoir configuré QURAN_CLIENT_ID et QURAN_CLIENT_SECRET dans le fichier .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!surahData || surahData.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-yellow-100">
        <p className="text-xl text-yellow-700">Aucune donnée de sourate trouvée.</p>
      </div>
    );
  }

  const currentChapter = chapters.find(ch => ch.id === selectedChapter);

  return (
    <div className="container mx-auto p-4 md:p-8 bg-white shadow-lg rounded-lg my-8">
      {/* Sélecteur de sourate */}
      <div className="mb-6">
        <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-700 mb-2">
          Choisir une sourate :
        </label>
        <select
          id="chapter-select"
          value={selectedChapter}
          onChange={handleChapterChange}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.id.toString().padStart(3, '0')} - {chapter.name_arabic || chapter.name} ({chapter.name_simple || chapter.translated_name?.name})
            </option>
          ))}
        </select>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-center text-green-700 mb-6">
        {currentChapter ? `${currentChapter.name_arabic || currentChapter.name} (${currentChapter.name_simple || currentChapter.translated_name?.name})` : `Sourate ${selectedChapter}`}
      </h1>
      
      <div className="space-y-6">
        {surahData.map((verse, index) => (
          <div key={verse.id || index} className="border-b border-gray-200 pb-4 last:border-b-0">
            {/* Texte arabe du verset */}
            <p className="text-right text-2xl md:text-3xl font-arabic text-gray-900 mb-2 leading-loose">
              {verse.text_uthmani || verse.text || "Texte non disponible"}
              <span className="inline-block text-base text-gray-500 ml-2">({verse.verse_number || index + 1})</span>
            </p>
            
            {/* Traduction */}
            {verse.translations && Array.isArray(verse.translations) && verse.translations.length > 0 && (
              <p className="text-lg text-gray-700 mt-2">
                <span className="font-semibold text-blue-600">Traduction:</span> {verse.translations[0].text}
              </p>
            )}
            
            {/* Tafsir */}
            {verse.tafsirs && Array.isArray(verse.tafsirs) && verse.tafsirs.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <p className="font-semibold text-blue-800">Tafsir:</p>
                <p className="text-base text-blue-700">{verse.tafsirs[0].text}</p>
              </div>
            )}
            
            {/* Mots individuels */}
            {verse.words && Array.isArray(verse.words) && verse.words.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2">
                {verse.words.map((word: any, wordIndex: number) => (
                  <span key={word.id || wordIndex} className="bg-gray-100 px-2 py-1 rounded-full">
                    {word.text_uthmani || word.text || "mot"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}