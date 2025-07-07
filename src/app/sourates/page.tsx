import { getSimpleChapters } from '@/lib/quranSimpleApi';
import Link from 'next/link';

type Chapter = {
  id: number;
  transliteration: string;
  name: string;
  translation: string;
  total_verses: number;
  type: string;
};

export default async function SouratePage() {
  const chapters = await getSimpleChapters();

  if (!chapters) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Erreur lors du chargement des chapitres.
      </div>
    );
  }

  return (
    <div className="container w-full mx-auto p-4 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-5xl font-bold text-center mb-6 text-gray-800">Chapitres du Coran</h1>
      <ul className=" w-full items-center flex flex-col md:flex-row flex-wrap justify-center gap-4">
        {chapters.length > 0 ? (
          chapters.map((chapter: Chapter) => (
            <li key={chapter.id} className="py-4 px-2 w-full md:w-80 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              {/* Utilisez Link pour naviguer vers la page des versets */}
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
            </li>
          ))
        ) : (
          <li className="text-center text-gray-500">Aucun chapitre trouvé.</li>
        )}
      </ul>
    </div>
  );
}