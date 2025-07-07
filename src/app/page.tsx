import AudioVerseHighlighter from "@/components/AudioVerseHighlighter";
import Image from "next/image";

const sampleVerses = [
	{
		id: 1,
		name_simple: "Al-Fatihah",
		verses: [
			{
				id: 1,
				text: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux.",
				verset: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
				startTime: 6.0,
				endTime: 11.0,
			},
			{
				id: 2,
				text: "Louange à Allah, Seigneur de l'univers.",
				verset: "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ",
				startTime: 11.0,
				endTime: 16.0,
			},
			{
				id: 3,
				text: "Le Tout Miséricordieux, le Très Miséricordieux.",
				verset: "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
				startTime: 16.0,
				endTime: 20.0,
			},
			{
				id: 4,
				text: "Maître du Jour de la rétribution.",
				verset: "مَٰلِكِ يَوۡمِ ٱلدِّينِ",
				startTime: 20.0,
				endTime: 26.0,
			},
			{
				id: 5,
				text: "C'est Toi [Seul] que nous adorons, et c'est Toi [Seul] dont nous implorons secours.",
				verset: "إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ",
				startTime: 26.0,
				endTime: 32.0,
			},
			{
				id: 6,
				text: "Guide-nous dans le droit chemin,",
				verset: "ٱهۡدِنَا ٱلصِّرَٰطَ ٱلۡمُسۡتَقِيمَ",
				startTime: 32.9,
				endTime: 38.0,
			},
			{
				id: 7,
				text: "Le chemin de ceux que Tu as comblés de faveurs, non pas de ceux qui ont encouru Ta colère, ni des égarés.",
				verset:
					"صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ ٱلۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا ٱلضَّآلِّينَ ",
				startTime: 38.8,
				endTime: 55.0,
			},
		],
	},
	{
		id: 2,
		name_simple: "Al-Baqara",
		verses: [
			{
				id: 1,
				text: "Alif, Lâm, Mim.",
				verset: "الۤمۤ",
				startTime: 0.0,
				endTime: 5.0,
			},
		],
	},
];

export default function Home() {
	const audioUrl = "/al-fatiha.mp3";
	return (
		<div className="text-center pt-12 flex flex-col items-center">
			<Image src="/quran-logo.webp" alt="quran logo" width={200} height={200} />
			<h1 className="text-[clamp(3rem,5vw,5rem)] text-gray-800 font-[500] tracking-[-0.03em] leading-[0.9278] capitalize mb-4">
				Tafsir-Platform
			</h1>
			<p className="font-mono text-[16px] mb-4">This is a Next.js blog.</p>
			
			
		</div>
	);
}
