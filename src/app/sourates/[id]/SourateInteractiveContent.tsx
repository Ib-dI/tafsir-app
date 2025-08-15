"use client";

// Importez les instances pré-initialisées depuis votre fichier src/lib/firebase.ts
import { auth, db } from "@/lib/firebase";

import AudioVerseHighlighter from "@/components/AudioVerseHighlighter";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Importations Firestore spécifiques pour les opérations
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
	collection,
	doc,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	where,
} from "firebase/firestore";

// Import pour suraGlyphMap
import suraGlyphMap from "@/lib/data/surahGlyphMap.json";

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
	chapterId: number; // Réintroduit la prop chapterId
}

// Dans SourateInteractiveContent.tsx, ajoutez cette fonction helper juste avant le composant principal
const getRemainingVerses = (verses: Verse[], audioParts: TafsirAudioPart[]): Verse[] | null => {
  // Crée un Set de tous les IDs de versets couverts par les parties audio
  const coveredVerseIds = new Set(
    audioParts.flatMap(part => part.timings.map(timing => timing.id))
  );

  // Trouve les versets qui ne sont pas couverts
  const remainingVerses = verses.filter(verse => !coveredVerseIds.has(verse.id));

  // Retourne null si aucun verset restant, sinon retourne les versets
  return remainingVerses.length > 0 ? remainingVerses : null;
};

export default function SourateInteractiveContent({
	verses: initialVerses,
	audioParts: initialAudioParts,
	infoSourate,
	chapterId,
}: SourateInteractiveContentProps) {
	// Logs pour le débogage

	// Modification: Initialize audioParts state first
	const [audioParts] = useState(() => {
		// Créer un Set avec tous les IDs de versets déjà couverts
		const coveredVerseIds = new Set(
			initialAudioParts.flatMap((part) => part.timings.map((timing) => timing.id))
		);

		// Trouver les versets qui ne sont pas dans les parties existantes
		const remainingVerses = initialVerses.filter(
			(verse) => !coveredVerseIds.has(verse.id)
		);

		// Si on trouve des versets restants, créer une nouvelle partie
		if (remainingVerses.length > 0) {
			const newPart = {
				id: "remaining-verses",
				title: `Partie ${initialAudioParts.length + 1}`,
				url: "", // pas d'audio
				timings: remainingVerses.map((verse) => ({
					id: verse.id,
					startTime: 0,
					endTime: 0,
				})),
			};

			// Retourner le tableau avec la nouvelle partie ajoutée
			return [...initialAudioParts, newPart];
		}

		return initialAudioParts;
	});

	const [selectedPart, setSelectedPart] = useState<TafsirAudioPart | null>(
		null
	);
	const [userId, setUserId] = useState<string | null>(null);
	const [isAuthReady, setIsAuthReady] = useState(false);

	const [completedPartIds, setCompletedPartIds] = useState<Set<string>>(
		new Set()
	);

	const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

	// // Etats pour la gestion du swipe
	// const touchStartX = useRef(0);
	// const touchEndX = useRef(0);
	// const swipeThreshold = 50; // Distance minimale pour considérer un swipe (en pixels)

	// Initialise selectedPart lorsque le composant est monté ou que les parties audio changent
	useEffect(() => {
		if (audioParts.length > 0 && !selectedPart) {
			setSelectedPart(audioParts[0]);
		}
	}, [audioParts, selectedPart]); // Garde selectedPart pour éviter un loop infini si initialement null

	// Défilement vers le haut de la page lorsque la partie sélectionné change
	useEffect(() => {
		if (selectedPart) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, [selectedPart]); // Déclanché à chaque fois que selectedPart change

	useEffect(() => {
		if (selectedPart) {
			const button = buttonRefs.current.get(selectedPart.id);
			if (button) {
				button.scrollIntoView({
					behavior: "smooth",
					inline: "center",
					block: "nearest",
				});
			}
		}
	}, [selectedPart]);

	// useEffect: Gère l'authentification et récupère l'ID utilisateur
	useEffect(() => {
		if (!auth) {
			console.error(
				"SourateInteractiveContent: ERREUR - Firebase Auth n'est pas initialisé. Vérifiez src/lib/firebase.ts et .env.local."
			);
			setUserId(crypto.randomUUID()); // Fallback pour éviter de bloquer l'app si Firebase est mal configuré
			setIsAuthReady(true);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
			} else {
				console.log(
					"SourateInteractiveContent: Aucun utilisateur Firebase. Tentative de connexion anonyme..."
				);
				try {
					await signInAnonymously(auth); // Utilise l'instance 'auth' importée
					const newUid = auth.currentUser?.uid;
					setUserId(newUid || crypto.randomUUID());
				} catch (error) {
					console.error(
						"SourateInteractiveContent: ERREUR - Erreur d'authentification anonyme Firebase:",
						error
					);
					setUserId(crypto.randomUUID()); // Fallback si l'authentification échoue
				}
			}
			setIsAuthReady(true);
		});

		return () => unsubscribe(); // Nettoyage de l'écouteur
	}, []); // S'exécute une seule fois au montage

	// useEffect: Écoute les changements de progression depuis Firestore
	useEffect(() => {
		if (!isAuthReady || !db || !userId) {
			return;
		}

		// Utilisez process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID comme projectId pour le chemin Firestore
		const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
		if (!projectId) {
			console.error(
				"SourateInteractiveContent: ERREUR - NEXT_PUBLIC_FIREBASE_PROJECT_ID n'est pas défini. Vérifiez .env.local."
			);
			return;
		}

		const progressCollectionRef = collection(
			db,
			`artifacts/${projectId}/users/${userId}/progress`
		);
		const q = query(progressCollectionRef, where("chapterId", "==", chapterId));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const newCompletedPartIds = new Set<string>();
				snapshot.forEach((doc) => {
					const data = doc.data();
					if (data.partId) {
						newCompletedPartIds.add(data.partId);
					}
				});
				setCompletedPartIds(newCompletedPartIds);
			},
			(error: Error) => {
				console.error(
					"SourateInteractiveContent: ERREUR d'écoute de la progression Firestore:",
					error
				);
			}
		);

		return () => unsubscribe(); // Nettoyage de l'écouteur de snapshot
	}, [isAuthReady, db, userId, chapterId]);

	// Fonction pour marquer une partie comme complétée
	const markPartAsCompleted = useCallback(
		async (completedChapterId: number, completedPartId: string) => {
			console.log(
				"markPartAsCompleted called",
				completedChapterId,
				completedPartId
			);
			if (!db || !userId) {
				console.warn(
					"SourateInteractiveContent: AVERTISSEMENT - Firestore ou User ID non disponible. Impossible de marquer la partie comme complétée."
				);
				return;
			}

			const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
			if (!projectId) {
				console.error("Project ID not found");
				return;
			}

			try {
				const progressRef = doc(
					db,
					`artifacts/${projectId}/users/${userId}/progress/${completedPartId}`
				);
				await setDoc(progressRef, {
					chapterId: completedChapterId,
					partId: completedPartId,
					completedAt: serverTimestamp(),
				});
			} catch (error) {
				console.error("Error marking part as completed:", error);
			}
		},
		[db, userId]
	);

	// Modification du versesToDisplay pour gérer les versets restants
	const versesToDisplay = selectedPart
  ? initialVerses
      .filter((verse) => {
        if (selectedPart.id === "remaining-verses") {
          const coveredVerseIds = new Set(
            initialAudioParts.flatMap((part) => part.timings.map((timing) => timing.id))
          );
          return !coveredVerseIds.has(verse.id);
        }
        return selectedPart.timings.some((timing) => timing.id === verse.id);
      })
      .map((verse) => {
        if (selectedPart.id === "remaining-verses") {
          return {
            ...verse,
            startTime: 0,
            endTime: 0,
            verset: verse.text,
            noAudio: true
          };
        }
        // Récupérer le timing correspondant au verset pour les parties avec audio
        const timing = selectedPart.timings.find((t) => t.id === verse.id);
        return {
          ...verse,
          startTime: timing?.startTime || 0,
          endTime: timing?.endTime || 0,
          verset: verse.text,
          noAudio: false
        };
      })
  : initialVerses.map((verse) => ({
      ...verse,
      startTime: 0,
      endTime: 0,
      verset: verse.text
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

	// // Fonctions de gestion des événements tactiles (swipe)
	// const handleTouchStart = (e: React.TouchEvent) => {
	// 	touchStartX.current = e.touches[0].clientX;
	// 	touchEndX.current = e.touches[0].clientX; // Réinitialise touchEndX
	// };

	// const handleTouchMove = (e: React.TouchEvent) => {
	// 	touchEndX.current = e.touches[0].clientX;
	// };

	// const handleTouchEnd = () => {
	// 	const deltaX = touchEndX.current - touchStartX.current;

	// 	if (Math.abs(deltaX) >= swipeThreshold) {
	// 		if (deltaX > 0 && canGoPrevious) {
	// 			// Swipe vers la droite
	// 			goToPreviousPart();
	// 		} else if (deltaX < 0 && canGoNext) {
	// 			// Swipe vers la gauche
	// 			goToNextPart();
	// 		}
	// 	}
	// };

	// MODIFICATION ICI: Appel goToNextPart si possible
	const handleAudioFinished = useCallback(() => {
		if (!selectedPart) return;

		// Marquer comme complété si ce n’est pas déjà fait
		if (!completedPartIds.has(selectedPart.id)) {
			markPartAsCompleted(chapterId, selectedPart.id);
		}

		// Passer à la suite
		const currentIndex = audioParts.findIndex((p) => p.id === selectedPart.id);
		if (currentIndex !== -1 && currentIndex < audioParts.length - 1) {
			const nextPart = audioParts[currentIndex + 1];
			setSelectedPart(nextPart);
		}
	}, [selectedPart, chapterId, completedPartIds, audioParts, markPartAsCompleted]);

	const memoizedVersesToDisplay = useMemo(
		() => versesToDisplay,
		[selectedPart, initialVerses]
	);
	const memoizedInfoSourate = useMemo(
		() => infoSourate.map(String),
		[infoSourate]
	);

	// console.log("SourateInteractiveContent render", {
	// 	currentAudioUrl,
	// 	memoizedVersesToDisplayLength: memoizedVersesToDisplay.length,
	// });
	if (!isAuthReady || !db || !userId) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50 text-blue-600">
				Initialisation de la connexion...
			</div>
		);
	}
	return (
		<div className="container mx-auto ">
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
					className="flex flex-row items-center gap-2 mb-2 p-3  bg-gray-50 rounded-lg shadow-inner justify-center"
				>
					{/* Flèche Gauche */}
					<motion.button
						onClick={goToPreviousPart}
						disabled={!canGoPrevious}
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
							className=" w-4 md:w-6 h-4 md:h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M15.75 19.5L8.25 12l7.5-7.5"
							/>
						</svg>
					</motion.button>

					{/* Select universel (desktop et mobile) */}
					<div className="flex flex-grow items-center justify-center gap-2 w-full">
						<Select
							value={selectedPart?.id || ""}
							onValueChange={(value) => {
								const part = audioParts.find((p) => p.id === value);
								if (part) setSelectedPart(part);
							}}
						>
							<SelectTrigger className="w-full max-w-[220px] md:max-w-[260px]">
								<SelectValue placeholder="Sélectionner une partie" />
							</SelectTrigger>
							<SelectContent className="font-sans">
								{audioParts.map((part, index) => (
									<SelectItem
                    key={part.id}
                    value={part.id}
                    className={part.id === 'remaining-verses' ? 'text-blue-600 font-medium' : ''}
                  >
										<span className="flex items-center gap-2">
											{part.id === 'remaining-verses' ? (
												<>
													{part.title} ({part.timings.length})
													<span className="text-xs text-blue-500">(sans audio)</span>
												</>
											) : (
												<>
													{part.title || `Partie ${index + 1}`}
													{completedPartIds.has(part.id) && (
														<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow z-10">
															<svg width="5" height="85" viewBox="0 0 20 20" fill="none">
																<path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
															</svg>
														</span>
													)}
												</>
											)}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Flèche Droite */}
					<motion.button
						onClick={goToNextPart}
						disabled={!canGoNext}
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
							className="w-4 md:w-6 h-4 md:h-6"
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

			{/* Affichage de l'ID utilisateur (pour le débogage/vérification) */}
			{isAuthReady && !userId && (
				<div className="text-center text-xs text-red-500 mb-2">
					Erreur : Impossible d&#39;obtenir l&#39;ID utilisateur. Progression
					non sauvegardée. Vérifiez votre configuration Firebase et vos règles
					de sécurité.
				</div>
			)}
			{/* Affichage de la pastille de complétion uniquement pour les parties avec audio */}
			{selectedPart && selectedPart.id !== 'remaining-verses' && (
  <div className="flex justify-center mb-2">
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        completedPartIds.has(selectedPart.id)
          ? "bg-green-100 text-green-800"
          : "bg-gray-200 text-gray-600"
      }`}
    >
      {completedPartIds.has(selectedPart.id) ? (
        <>
          <svg
            className="w-4 h-4 mr-1 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Partie complétée
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 mr-1 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          Partie non complétée
        </>
      )}
    </span>
  </div>
)}

			{/* Le composant AudioVerseHighlighter est TOUJOURS rendu */}
			<div
				className="container mx-auto"
				// onTouchStart={handleTouchStart} // Ecoute les événements tactiles
				// onTouchMove={handleTouchMove} // Met à jour la position du doigt
				// onTouchEnd={handleTouchEnd} // Gère la fin du swipe
			>
				<AudioVerseHighlighter
					key={selectedPart?.id}
					audioUrl={currentAudioUrl}
					verses={memoizedVersesToDisplay}
					infoSourate={memoizedInfoSourate}
					onAudioFinished={handleAudioFinished}
				>
					<div
						className="w-full md:text-5xl  text-center text-gray-800 sticky top-[-10px] z-20 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500/80 backdrop-blur-lg py-6 border-b border-gray-100 shadow flex items-center justify-center md:min-h-[3.8rem] "
					>
						<h1 className="z-30 font-quran absolute w-full flex items-center justify-center h-full">
							<div
								className="w-fit max-w-3xl bg-white/90 shadow rounded-2xl px-4 md:px-8 py-2 flex items-center h-4/5 min-h-0 justify-center mx-auto"
							>
								<span
									className="md:text-9xl text-8xl font-normal leading-normal text-gray-800 bg-clip-text "
									style={{
										textShadow: "0 2px 6px rgba(0,0,0,0.18)",
									}}
								>
									{
										suraGlyphMap[
											String(infoSourate[0]) as keyof typeof suraGlyphMap
										]
									}
								</span>
							</div>
						</h1>
            
					</div>
          
				</AudioVerseHighlighter>
			</div>
		</div>
	);
}
