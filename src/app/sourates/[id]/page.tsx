import { audiosTafsir } from "@/lib/data/audios";
import { getSimpleChapterVerses } from "@/lib/quranSimpleApi";
import SourateInteractiveContent from "./SourateInteractiveContent";

// Définition des types des props pour un Server Component
interface SouratePageProps {
  params: Promise<{ id: string }>; // Le paramètre dynamique est directement disponible ici
}

export default async function Sourate({ params }: SouratePageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams; // Accède directement à l'ID
  const chapterId = Number(id); // Convertir l'ID de la sourate en nombre
  const data = await getSimpleChapterVerses(id); // Récupère tous les versets

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-red-600">
        Erreur lors du chargement des versets ou chapitre introuvable.
      </div>
    );
  }

  const verses = data.verses || [];
  const infoSourate = [data.id, data.transliteration, data.translation];

  // Trouve toutes les données audio pour cette sourate
  const currentAudioTafsir = audiosTafsir.find((a) => a.id === chapterId);
  const audioParts = currentAudioTafsir?.parts || [];

  return (
    <div className="container mx-auto mt-1 bg-white p-2 md:p-4">
      {/* Le bouton de retour est un Client Component qui lit ses propres searchParams */}

      {/* Passe toutes les données nécessaires au Client Component interactif */}
      <SourateInteractiveContent
        verses={verses}
        audioParts={audioParts}
        infoSourate={infoSourate}
        chapterId={chapterId}
      />
    </div>
  );
}
