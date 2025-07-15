"use client";

import AudioVerseHighlighter from "@/components/AudioVerseHighlighter";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

// Définitions des types 
type Verse = {
	id: number;
	text: string;
	translation: string;
	transliteration: string;
};

type TafsirAudioPart = {
	id: string;
	title: string;
	url: string;
	timings: { id: number; startTime: number; endTime: number }[];
};
interface SourateInteractiveContentProps {
	verses: Verse[];
	audioParts: TafsirAudioPart[];
	infoSourate: (number | string)[];
	chapterId: number; 
}

export default function SourateInteractiveContent({
	verses: initialVerses,
	audioParts,
	infoSourate,
}: SourateInteractiveContentProps) {
	const [selectedPart, setSelectedPart] = useState<TafsirAudioPart | null>(
		null
	);

	// Etats pour la gestion du swipe
	const touchStartX = useRef(0);
	const touchEndX = useRef(0);
	const swipeThreshold = 50; // Distance minimale pour considérer un swipe (en pixels)

	// Initialise selectedPart lorsque le composant est monté ou que les parties audio changent
	useEffect(() => {
		if (audioParts.length > 0 && !selectedPart) {
			setSelectedPart(audioParts[0]);
		}
	}, [audioParts, selectedPart]); // Dépendances pour réagir aux changements

	// Défilement vers le haut de la page lorsque la partie sélectionné change
	useEffect(() => {
		if (selectedPart) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, [selectedPart]); // Déclanché à chaque fois que selectedPart change

	// Recalcule les versets à afficher pour la partie sélectionnée.
	// Si aucune partie n'est sélectionnée (ex: pas d'audio du tout),
	// on passe tous les versets pour qu'ils soient affichés sans surlignage audio.
	const versesToDisplay = selectedPart
		? initialVerses
				.filter((verse) => {
					// Vérifie si l'ID du verset est présent dans les timings de la partie sélectionnée
					return selectedPart.timings.some((timing) => timing.id === verse.id);
				})
				.map((verse) => {
					// Ajoute les informations de timing et 'verset'
					const timing = selectedPart.timings.find((t) => t.id === verse.id);
					return {
						...verse,
						startTime: timing?.startTime ?? 0,
						endTime: timing?.endTime ?? 0,
						verset: verse.text,
					};
				})
		: initialVerses.map((verse) => ({
				// Si pas de partie sélectionnée, affiche tous les versets sans timings audio
				...verse,
				startTime: 0,
				endTime: 0,
				verset: verse.text,
		  }));

	// Déterminer l'URL audio à passer. Si pas de partie sélectionnée, c'est vide.
	const currentAudioUrl = selectedPart?.url || "";

	// Logique de navigation entre les parties audio
	const currentPartIndex = selectedPart
		? audioParts.findIndex((p) => p.id === selectedPart.id)
		: -1;
	const canGoPrevious = currentPartIndex > 0;
	const canGoNext =
		currentPartIndex !== -1 && currentPartIndex < audioParts.length - 1;

	const goToPreviousPart = useCallback(() => {
		if (canGoPrevious) {
			setSelectedPart(audioParts[currentPartIndex - 1]);
		}
	}, [canGoPrevious, currentPartIndex, audioParts]);

	const goToNextPart = useCallback(() => {
		if (canGoNext) {
			setSelectedPart(audioParts[currentPartIndex + 1]);
		}
	}, [canGoNext, currentPartIndex, audioParts]);

  // Fonctions de gestion des événements tactiles (swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX // Réinitialise touchEndX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const deltaX = touchEndX.current - touchStartX.current

    if(Math.abs(deltaX) >= swipeThreshold) {
      if(deltaX > 0 && canGoPrevious) { // Swipe vers la droite
        goToPreviousPart()
      } else if(deltaX < 0 && canGoNext) { // Swipe vers la gauche
        goToNextPart()
      }
    }
  }

	return (
		<div className="container mx-auto">
			{/* Barre de sélection des parties audio AVEC les flèches */}
			{/* Cette section n'est rendue que s'il y a plus d'une partie audio disponible */}
			{audioParts.length > 1 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 100,
						damping: 10,
						delay: 0.3,
					}}
					className="flex flex-row items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg shadow-inner justify-center"
				>
					{/* Flèche Gauche */}
					<motion.button
						onClick={goToPreviousPart}
						disabled={!canGoPrevious} // Désactive si on ne peut pas aller en arrière
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						className={`p-2 rounded-full transition-colors duration-200 ${
							canGoPrevious
								? "bg-blue-600 text-white hover:bg-blue-700"
								: "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2.5"
							stroke="currentColor"
							className="w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M15.75 19.5L8.25 12l7.5-7.5"
							/>
						</svg>
					</motion.button>

					{/* Boutons de sélection de partie pour Desktop */}
					<div className="hidden md:flex flex-wrap gap-2 justify-center flex-grow">
						<span className="text-gray-700 font-medium self-center">
							Parties Tafsir :
						</span>
						{audioParts.map((part) => (
							<motion.button
								key={part.id}
								onClick={() => setSelectedPart(part)}
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
									selectedPart?.id === part.id
										? "bg-blue-600 text-white shadow-md"
										: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
								}`}
							>
								{part.title || `Partie ${audioParts.indexOf(part) + 1}`}
							</motion.button>
						))}
					</div>

					{/* Dropdown de sélection de partie pour Mobile */}
					<div className="flex flex-grow md:hidden items-center justify-center gap-2">
						<label htmlFor="part-select" className="sr-only">
							Sélectionner une partie
						</label>
						<select
							id="part-select"
							value={selectedPart?.id || ""}
							onChange={(e) => {
								const selectedId = e.target.value;
								const part = audioParts.find((p) => p.id === selectedId);
								if (part) setSelectedPart(part);
							}}
							className="block w-full max-w-[200px] px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						>
							{audioParts.map((part, index) => (
								<option key={part.id} value={part.id}>
									{part.title || `Partie ${index + 1}`}
								</option>
							))}
						</select>
					</div>

					{/* Flèche Droite */}
					<motion.button
						onClick={goToNextPart}
						disabled={!canGoNext} // Désactive si on ne peut pas aller en avant
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						className={`p-2 rounded-full transition-colors duration-200 ${
							canGoNext
								? "bg-blue-600 text-white hover:bg-blue-700"
								: "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2.5"
							stroke="currentColor"
							className="w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M8.25 4.5l7.5 7.5-7.5 7.5"
							/>
						</svg>
					</motion.button>
				</motion.div>
			)}

			{/* Le composant AudioVerseHighlighter est TOUJOURS rendu */}
			<div className="container mx-auto"
      onTouchStart={handleTouchStart} // Ecoute les événements tactiles
      onTouchMove={handleTouchMove} // Met à jour la position du doigt
      onTouchEnd={handleTouchEnd} // Gère la fin du swipe
      >  

				<AudioVerseHighlighter
					audioUrl={currentAudioUrl} // Passe l'URL (peut être vide)
					verses={versesToDisplay} // Passe les versets (filtrés ou tous)
					infoSourate={infoSourate.map(String)} // Assure que infoSourate est un tableau de strings pour la prop
				>
					<h1 className="text-4xl w-full md:text-5xl text-center font-sura text-gray-800 sticky top-[-10px] z-20 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 backdrop-blur-lg py-1 border-b border-gray-100 shadow-md">
						<span>
							{Number(infoSourate[0]) < 100
								? Number(infoSourate[0]) < 10
									? "00"
									: "0"
								: ""}
							{infoSourate[0]}
						</span>
						<span className="">surah</span>
					</h1>
				</AudioVerseHighlighter>
			</div>
		</div>
	);
}
