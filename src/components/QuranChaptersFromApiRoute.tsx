// app/components/QuranChaptersFromApiRoute.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Chapter, ChaptersResponse } from '@/types/quranApi'; // Importez les types

export default function QuranChaptersFromApiRoute() {
  const [chapters, setChapters] = useState<Chapter[]>([]); // Spécifiez le type de l'état
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChapters() {
      try {
        setLoading(true);
        const response = await fetch('/api/quran/chapters');
        const data: ChaptersResponse | { error: string } = await response.json(); // Type de la réponse

        if (response.ok) {
          setChapters((data as ChaptersResponse).chapters);
        } else {
          setError((data as { error: string }).error || 'Impossible de récupérer les chapitres via l\'API Route.');
        }
      } catch (err: any) {
        console.error("Failed to fetch chapters from API Route:", err);
        setError('Erreur lors du chargement des chapitres.');
      } finally {
        setLoading(false);
      }
    }

    fetchChapters();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-blue-600">
        Chargement des chapitres...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Chapitres du Coran (via API Route)</h1>
      <ul className="space-y-3">
        {chapters.length > 0 ? (
          chapters.map((chapter) => (
            <li key={chapter.id} className="p-4 bg-gray-100 rounded-md flex justify-between items-center">
              <div>
                <strong className="text-lg text-blue-700">{chapter.name_simple}</strong>{' '}
                <span className="text-sm text-gray-600">({chapter.name_arabic})</span>
                <p className="text-gray-700">{chapter.translated_name.name} (Versets: {chapter.verses_count})</p>
              </div>
              <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
                {chapter.revelation_place === 'makka' ? 'Mecque' : 'Médine'}
              </span>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-500">Aucun chapitre trouvé.</li>
        )}
      </ul>
    </div>
  );
}