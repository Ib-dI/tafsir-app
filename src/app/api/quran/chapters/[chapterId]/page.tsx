// app/chapter/[chapterId]/page.tsx
import { getVersesByChapter, getChapters } from '@/lib/quranApi'; // Assurez-vous du bon chemin
import type { Chapter, Verse } from '@/types/quranApi'; // Importez les types nécessaires
import Link from 'next/link';

// Fonction pour générer les chemins statiques (si vous voulez du SSG)
// export async function generateStaticParams() {
//   const chaptersResponse = await getChapters();
//   if (!chaptersResponse) {
//     return [];
//   }
//   return chaptersResponse.chapters.map((chapter) => ({
//     chapterId: chapter.id.toString(),
//   }));
// }

interface ChapterPageProps {
  params: {
    chapterId: string;
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const chapterId = parseInt(params.chapterId, 10);

  if (isNaN(chapterId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        ID de chapitre invalide.
      </div>
    );
  }

  const versesResponse = await getVersesByChapter(chapterId, 'fr', 'fr'); // Récupère les versets
  const verses: Verse[] = versesResponse?.verses || [];

  const chaptersResponse = await getChapters(); // Pour obtenir les noms des chapitres
  const chapter: Chapter | undefined = chaptersResponse?.chapters.find(c => c.id === chapterId);


  if (!versesResponse || !chapter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Erreur lors du chargement des versets ou chapitre introuvable.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-white shadow-lg rounded-lg mt-8 mb-8">
      <Link href="/" className="inline-block mb-4 text-blue-600 hover:underline">
        &larr; Retour aux chapitres
      </Link>
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        {chapter.name_simple} ({chapter.name_arabic})
      </h1>
      <h2 className="text-xl font-semibold text-center mb-6 text-gray-700">
        {chapter.translated_name.name} - {chapter.verses_count} Versets
      </h2>

      <div className="space-y-6">
        {verses.length > 0 ? (
          verses.map((verse) => (
            <div key={verse.id} className="p-4 bg-gray-100 rounded-md shadow-sm">
              <p className="text-right text-2xl font-arabic mb-2">
                {verse.text_uthmani} <span className="text-sm text-gray-500">({verse.verse_number})</span>
              </p>
              {verse.translations && verse.translations.length > 0 && (
                <p className="text-gray-800 mt-2 border-t pt-2 border-gray-300">
                  <span className="font-medium text-blue-700">Traduction:</span> {verse.translations[0].text}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Juz: {verse.juz_number}, Page: {verse.page_number}
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Aucun verset trouvé pour ce chapitre.</p>
        )}
      </div>
    </div>
  );
}