import AudioVerseHighlighter from "@/components/AudioVerseHighlighter";
import { audiosTafsir } from "@/lib/data/audios";
import { getSimpleChapterVerses } from "@/lib/quranSimpleApi";
import Link from "next/link";

type Verse = {
	id: number;
	text: string;
	translation: string;
	transliteration: string;
};

export default async function Sourate({ params: { id } }: { params: { id: string } }) {
	const data = await getSimpleChapterVerses(id);
	const verses = data.verses || [];
	const audioData = audiosTafsir.find((a) => a.id === Number(id));
	const part = audioData?.parts?.[0];
	const audio = part?.url ?? "";
	const timings = part?.timings ?? [];
	const infoSourate = [data?.id, data?.transliteration]

	const versesWithTiming = verses.map((verse: Verse) => {
		const timing = timings.find((t: { id: number; startTime: number; endTime: number }) => t.id === verse.id);
		return {
			...verse,
			startTime: timing?.startTime ?? 0,
			endTime: timing?.endTime ?? 0,
			verset: verse.text,
		};
	});

	if (!data) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
				Erreur lors du chargement des versets ou chapitre introuvable.
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 bg-white mt-2">
			<Link
				href="/sourates"
				className="inline-block mb-4 text-blue-600 hover:underline"
			>
				&larr; Retour aux chapitres
			</Link>
			
			<div className="container mx-auto">
				<AudioVerseHighlighter audioUrl={audio} verses={versesWithTiming} infoSourate={infoSourate}>
					<h1
						className="text-4xl w-full md:text-5xl text-center font-sura text-gray-800 sticky top-[-10px] z-20 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 backdrop-blur-lg py-1 border-b border-gray-100 shadow-md"
					>
						<span>{data.id < 100 ? data.id < 10 ? "00" : "0": ""}{data.id}</span>
						<span>surah</span>
					</h1>
				</AudioVerseHighlighter>
			</div>
		</div>
	);
}
