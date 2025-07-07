import { getChapters } from '@/lib/quranApi';
import type { Chapter } from '@/types/quranApi';
import Link from 'next/link';

export default async function page() {
  const chaptersResponse = await getChapters();
  const chapters: Chapter[] = chaptersResponse?.chapters || [];

  if (!chaptersResponse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Erreur lors du chargement des chapitres.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Chapitres du Coran</h1>
      <ul className="space-y-3">
        {chapters.length > 0 ? (
          chapters.map((chapter) => (
            <li key={chapter.id} className="p-4 bg-gray-100 rounded-md flex justify-between items-center hover:bg-gray-200 transition-colors duration-200">
              {/* Utilisez Link pour naviguer vers la page des versets */}
              <Link href={`/chapter/${chapter.id}`} className="flex-grow flex justify-between items-center">
                <div>
                  <strong className="text-lg text-blue-700">{chapter.name_simple}</strong>{' '}
                  <span className="text-sm text-gray-600">({chapter.name_arabic})</span>
                  <p className="text-gray-700">{chapter.translated_name.name} (Versets: {chapter.verses_count})</p>
                </div>
                <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
                  {chapter.revelation_place === 'makkah' ? 'Mecque' : 'Médine'}
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-500">Aucun chapitre trouvé.</li>
        )}
      </ul>
    </div>
  );
}