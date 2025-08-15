"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";
// import confetti from "canvas-confetti";

type Verse = {
	id: number;
	text: string;
	verset: string;
	startTime: number; // en secondes
	endTime: number; // en secondes
	transliteration: string;
	translation: string;
	noAudio?: boolean; // nouveau flag
};

type AudioVerseHighlighterProps = {
	audioUrl: string;
	verses: Verse[];
	infoSourate: string[];
	children?: ReactNode;
	onAudioFinished?: () => void;
	// remainingVerses?: Verse[]; // Nouvel prop pour les versets restants
};

const toArabicNumerals = (n: number): string => {
	if (n < 0) return String(n);
	const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
	return n
		.toString()
		.split("")
		.map((digit) => arabicNumerals[parseInt(digit)])
		.join("");
};

const AudioVerseHighlighter = ({
	audioUrl,
	verses,
	infoSourate,
	children,
	onAudioFinished,
}: AudioVerseHighlighterProps) => {
	const waveformRef = useRef(null);
	const versesRef = useRef<HTMLDivElement>(null);
	const wavesurferRef = useRef<WaveSurfer | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoading, setIsLoading] = useState(true); // Initialisé à true
	const [currentVerseId, setCurrentVerseId] = useState<number | null>(null);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [audioError, setAudioError] = useState<boolean>(false); // Nouvel état pour les erreurs audio
	const [hasFinished, setHasFinished] = useState(false);
	

	// NOUVEAU: Référence pour le Wake Lock
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);
	// const launchConfetti = () => {
	// 	confetti({
	// 		particleCount: 100,
	// 		spread: 70,
	// 		origin: { y: 0.6 },
	// 		colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d","#ff36ff"],
	// 	});
	// 	confetti({
	// 		particleCount: 50,
	// 		angle: 120,
	// 		spread: 55,
	// 		origin: {x:0.5, y: 1 },
	// 	});
	// 	confetti({
	// 		particleCount: 50,
	// 		angle: 60,
	// 		spread: 55,
	// 		origin: { y: 1 },
	// 	});
	// };

	// Initialisation de WaveSurfer et gestion du chargement
	useEffect(() => {
		setHasFinished(false);
		// Détruire l’ancienne instance si elle existe
		if (wavesurferRef.current) {
			wavesurferRef.current.destroy();
			wavesurferRef.current = null;
		}

		// Réinitialiser les états de lecture et d'erreur à chaque nouvelle tentative de chargement
		setIsPlaying(false);
		setCurrentTime(0);
		setDuration(0);
		setAudioError(false);
		setCurrentVerseId(null);

		// Gérer le cas où audioUrl est vide (pas d'audio disponible)
		if (!audioUrl) {
			setIsLoading(false); // Pas de chargement si pas d'URL
			return; // Ne pas tenter d'initialiser WaveSurfer
		}

		// Si une audioUrl est présente, on commence le chargement
		setIsLoading(true); // Démarre le spinner de chargement

		if (!waveformRef.current) return;

		const wavesurfer = WaveSurfer.create({
			container: waveformRef.current,
			waveColor: "#e2e8f0",
			progressColor: "#1961fc",
			cursorColor: "#7ca7fc",
			barWidth: 2,
			barRadius: 3,
			cursorWidth: 1,
			height: 50,
			barGap: 2,
			// responsive: true,
		});

		wavesurfer.load(audioUrl).catch((err) => {
			if (err.name !== "AbortError") {
				setAudioError(true);
				setIsLoading(false);
			}
		});

		wavesurfer.on("ready", () => {
			wavesurferRef.current = wavesurfer;
			setDuration(wavesurfer.getDuration());
			setIsLoading(false); // Arrête le spinner une fois prêt
		});

		// Gérer les erreurs de chargement
		wavesurfer.on("error", (err) => {
			// Ignore AbortError, c'est normal lors d'un changement rapide
			if (
				err instanceof Error &&
				(err as Error & { name?: string }).name === "AbortError"
			) {
				// Ne rien faire
			} else {
				setAudioError(true); // Indique une vraie erreur
				setIsLoading(false); // Arrête le spinner en cas d'erreur
				setIsPlaying(false); // S'assurer que la lecture est arrêtée
			}
		});

		wavesurfer.on("audioprocess", () => {
			const time = wavesurfer.getCurrentTime();
			setCurrentTime(time);

			const currentVerse = verses.find(
				(v) => time >= v.startTime && time <= v.endTime
			);
			setCurrentVerseId(currentVerse?.id || null);

			if (currentVerse && versesRef.current) {
				const verseElement = document.getElementById(
					`verse-${currentVerse.id}`
				);
				if (verseElement) {
					// Utilise scrollIntoView avec 'center' pour un défilement plus agréable
					verseElement.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}
		});

		wavesurfer.on("play", () => setIsPlaying(true));
		wavesurfer.on("pause", () => setIsPlaying(false));
		wavesurfer.on("finish", () => {
			if (!hasFinished) {
				setHasFinished(true);
				setIsPlaying(false);
				setCurrentVerseId(null);
				// 🎉 Lancer les confettis ici
				// confetti({
				// 	particleCount: 150,
				// 	spread: 100,
				// 	origin: { y: 0.6 },
				// 	scalar: 1.2,
				// });
				// launchConfetti()
				onAudioFinished?.();
			}
		});

		// Cleanup à chaque changement
		return () => {
			try {
				wavesurfer.destroy();
			} catch (e) {
				if (
					e instanceof Error &&
					(e as Error & { name?: string }).name === "AbortError"
				) {
					// Ignore AbortError, c'est normal lors d'un changement rapide
				} else {
					console.error(e);
				}
			}
			wavesurferRef.current = null;
		};
	}, [audioUrl, verses]); // Dépend de audioUrl et verses uniquement

	// NOUVEAU HOOK POUR GÉRER LE WAKE LOCK
	useEffect(() => {
		const requestWakeLock = async () => {
			if ("wakeLock" in navigator && navigator.wakeLock) {
				// Vérifie la prise en charge de l'API
				try {
					// Demande un wake lock de type 'screen' pour empêcher l'écran de s'éteindre
					wakeLockRef.current = await navigator.wakeLock.request("screen");

					// Gérer la perte de wake lock (ex: l'utilisateur change d'onglet)
					wakeLockRef.current.addEventListener("release", () => {
						wakeLockRef.current = null; // Réinitialise la référence
					});
				} catch (err) {
					if (err instanceof Error) {
						console.error(`Erreur Wake Lock: ${err.name}, ${err.message}`);
					} else {
						console.error("Erreur Wake Lock inconnue", err);
					}
					wakeLockRef.current = null;
				}
			} else {
				console.warn("API Wake Lock non supportée par ce navigateur.");
			}
		};

		const releaseWakeLock = () => {
			if (wakeLockRef.current) {
				wakeLockRef.current.release();
				wakeLockRef.current = null;
			}
		};

		// Demande le wake lock si la lecture est active ET qu'il y a un audio ET pas d'erreur
		if (isPlaying && audioUrl && !audioError) {
			requestWakeLock();
		} else {
			// Relâche le wake lock si la lecture est en pause/arrêtée ou s'il n'y a pas d'audio
			releaseWakeLock();
		}

		// Cleanup: relâcher le wake lock lorsque le composant est démonté ou si audioUrl change
		return () => {
			releaseWakeLock();
		};
	}, [isPlaying, audioUrl, audioError]); // Dépend de l'état de lecture, de la présence d'une URL audio et de l'état d'erreur

	useEffect(() => {
		if (versesRef.current) {
			versesRef.current.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		}
	}, [audioUrl]); // Déclanché quand l'URL audio change

	// Mise à jour de la vitesse de lecture
	useEffect(() => {
		if (wavesurferRef.current) {
			wavesurferRef.current.setPlaybackRate(playbackRate);
		}
	}, [playbackRate]);

	const togglePlayPause = () => {
		if (wavesurferRef.current && !audioError) {
			// Ne permet pas de jouer si erreur
			wavesurferRef.current.playPause();
		}
	};

	// Modification de la fonction seekToVerse
	const seekToVerse = (verse: Verse) => {
		if (verse.noAudio) {
			return; // Ne rien faire pour les versets sans audio
		}
		
		if (wavesurferRef.current && (verse.startTime > 0 || verse.endTime > 0)) {
			// Calcul de la position de seek en fonction de la durée totale
			// Assurez-vous que duration est > 0 pour éviter la division par zéro
			const seekPosition = duration > 0 ? verse.startTime / duration : 0;
			wavesurferRef.current.seekTo(seekPosition);
			setCurrentVerseId(verse.id);
		} else {
			console.warn(
				`Verset ${verse.id} n'a pas de timing audio ou audio non chargé.`
			);
		}
	};

	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
	};

	// useEffect(() => {
	// 	console.log("AudioVerseHighlighter mounted");
	// 	return () => {
	// 		console.log("AudioVerseHighlighter unmounted");
	// 	};
	// }, []);

	return (
		<div
			className="flex flex-col w-full max-w-4xl mx-auto p-1 sm:p-4 bg-white rounded-lg shadow relative overflow-visible"
			style={{ height: "100vh", maxHeight: "100dvh" }}
		>
			{/* Overlay pour verset long en cours de lecture */}
			{(() => {
				const currentVerse = verses.find((v) => v.id === currentVerseId);
				if (currentVerse && currentVerse.text.length > 290 && audioUrl) {
					return (
						<>
							{/* BACKDROP FLUO */}
							<div className="fixed inset-0 z-[90] bg-black/10  pointer-events-none" />
							{/* OVERLAY */}
							<motion.div
								initial={{ opacity: 0, y: -30 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={{ type: "spring", stiffness: 100, damping: 10 }}
								className="fixed bottom-[20px] md:top-[265px] left-0 w-full z-[100] flex justify-center pointer-events-none overflow-y-auto"
								style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
							>
								<div
									className="bg-yellow-50 rounded-lg shadow-lg border border-yellow-400 px-4 py-3 max-w-2xl w-full mx-2 flex flex-col items-end animate-fade-in"
									style={{ direction: "rtl" }}
								>
									<div className="text-gray-800 text-[22px] md:text-3xl font-uthmanic leading-relaxed text-right flex items-center gap-1">
										<span>{currentVerse.text} {toArabicNumerals(currentVerse.id)}</span>
									</div>
									{currentVerse.transliteration.length < 350 && (
										<p
											className="text-gray-500 text-md mt-[-5px] self-end font-medium"
											style={{ direction: "ltr" }}
										>
											{currentVerse.transliteration}
										</p>
									)}
									<p
										className="text-gray-700 self-start"
										style={{ direction: "ltr" }}
									>
										{currentVerse.id}. {currentVerse.translation}
									</p>
								</div>
							</motion.div>
						</>
					);
				}
				return null;
			})()}
			{/* Waveform et contrôles ou message d'audio non disponible */}
			<div className="relative flex flex-col flex-shrink-0 mt-4 md:mt-6">
				{/* Le conteneur du waveform */}
				{audioUrl && (
					<div
						ref={waveformRef}
						className="relative w-full transition-opacity duration-300"
						style={{ minHeight: 60 }} // Hauteur fixe pour le loader
					/>
				)}

				{/* Loader superposé */}
				{isLoading && audioUrl && (
					<div className="absolute left-0 top-0 w-full h-[60px] md:h-[80px] z-10 flex flex-col items-center justify-center bg-transparent rounded">
						<p className="text-blue-500 text-sm mb-2">
							Chargement de l’audio...
						</p>
						<div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{/* Message d'erreur audio si applicable */}
				{audioError &&
					!isLoading && ( // Affiche l'erreur si pas en chargement
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 100,
								damping: 10,
								delay: 0.1,
							}}
							className="absolute left-0 top-0 w-full h-[80px] z-10 flex flex-col items-center justify-center bg-red-50/80 border border-red-200 rounded"
						>
							<p className="text-red-700 font-semibold">
								Erreur de chargement audio.
							</p>
							<p className="text-red-600 text-sm">
								Veuillez réessayer plus tard.
							</p>
						</motion.div>
					)}

				{/* Contrôles audio (visibles si pas en chargement et pas d'erreur, ou si audioUrl est vide) */}
				{audioUrl && (
					<div
						className={`flex items-center justify-between w-full ${
							isLoading || audioError ? "opacity-50 pointer-events-none" : ""
						}`}
					>
						<button
							onClick={togglePlayPause}
							className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700"
						>
							{isPlaying ? <PauseIcon /> : <PlayIcon />}
						</button>

						<div className="font-mono spacing-[0.86px] text-xs md:text-sm whitespace-nowrap text-gray-600">
							{infoSourate[0]} {infoSourate[1]}
						</div>

						<div className="flex items-center gap-2">
							<div className="font-mono text-xs md:text-sm text-gray-600 whitespace-nowrap">
								{formatTime(currentTime)} / {formatTime(duration)}
							</div>
							<SpeedControl
								playbackRate={playbackRate}
								onChange={setPlaybackRate}
							/>
						</div>
					</div>
				)}

				{/* Message "Tafsir audio non disponible" si audioUrl est vide et pas en chargement */}
				{!audioUrl && !isLoading && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							type: "spring",
							stiffness: 100,
							damping: 10,
							delay: 0.1,
						}}
						className="flex -mt-3 items-center justify-center w-full h-[60px]" // Style pour centrer le message
					>
						<div className="relative mx-auto w-fit inline-flex max-w-full items-center gap-2 rounded-lg bg-blue-50/80 border border-[#2563eb]/30 px-3 py-1 font-medium text-gray-900 ring-1 shadow-lg shadow-blue-400/20 ring-black/10 filter backdrop-blur-[1px] transition-colors hover:bg-blue-100/80 focus:outline-hidden sm:text-sm">
							<Info className="text-[#2563eb] w-5 h-5 mr-2 flex-shrink-0 drop-shadow" />
							<p className="text-center w-full text-[#2563eb] truncate inline-block">
								Tafsir audio non disponible !
							</p>
						</div>
					</motion.div>
				)}
				{/* Carte de traduction AU-DESSUS VISUELLEMENT */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 140,
						damping: 10,
						delay: 0.4,
					}}
					className="absolute w-fit text-red-800 text-nowrap -bottom-7 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 rounded-sm shadow uppercase bg-yellow-50/40 z-10 text-sm font-medium pointer-events-none"
				>
					{infoSourate[2]}
				</motion.div>
			</div>

			{/* Liste des versets */}
			<div
				ref={versesRef}
				className="overflow-y-auto z-20 relative p-2 border border-gray-200 rounded-lg mt-5 flex-1"
				style={{ minHeight: 0 }}
			>
				{children}
				{Number(infoSourate[0])!== 1 && Number(infoSourate[0])!== 9 && verses[0]?.id === 1 && (
					<p className="text-gray-800 text-center text-5xl font-bismillah">5</p>
				)}

				{verses.map((verse: Verse) => (
					<div
						key={verse.id}
						id={`verse-${verse.id}`}
						onClick={() => !verse.noAudio && seekToVerse(verse)}
						className={`p-3 my-1 rounded-lg ${!verse.noAudio ? 'cursor-pointer' : ''} transition-colors ${
							currentVerseId === verse.id && audioUrl // Surligne seulement si audioUrl est présent
								? "bg-yellow-100/40 border-l-4 border-[0.7px] border-yellow-500 shadow"
								: verse.noAudio 
									? "bg-gray-50/50 border-l-4 border-[0.7px] border-blue-200" 
									: "hover:bg-gray-50"
						}`}
					>
						<div className="flex flex-col gap-2 justify-end items-end">
							{verse.noAudio && (
								<span className="self-start text-xs text-blue-500 font-medium mb-1">
									Verset sans audio
								</span>
							)}
							<div className="text-gray-800 mt-2 text-[23px] md:text-3xl font-uthmanic leading-relaxed text-right flex items-center md:gap-1"
								style={{ direction: "rtl" }}>
								<span style={{ direction: "rtl" }}>
									{verse.text} {toArabicNumerals(verse.id)}
								</span>
							</div>
							<p className="text-gray-500 text-right text-md mt-[-8px] font-medium">
								{verse.transliteration}
							</p>
							<p className="text-gray-700 -mt-2 self-start">
								{verse.id}. {verse.translation}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

// Composants d'icônes et contrôles
const PlayIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="w-6 h-6"
	>
		<path
			fillRule="evenodd"
			d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
			clipRule="evenodd"
		/>
	</svg>
);

const PauseIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="w-6 h-6"
	>
		<path
			fillRule="evenodd"
			d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
			clipRule="evenodd"
		/>
	</svg>
);

const SpeedControl = ({
	playbackRate,
	onChange,
}: {
	playbackRate: number;
	onChange: (rate: number) => void;
}) => {
	const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
	const [isOpen, setIsOpen] = useState(false);

	const handleSelectSpeed = (speed: number) => {
		onChange(speed);
		setIsOpen(false);
	};

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md"
			>
				x{playbackRate}
			</button>
			{isOpen && (
				<div className="absolute right-0 mb-2 bg-white shadow-lg rounded-md p-1 z-50">
					{speeds.map((speed) => (
						<button
							key={speed}
							onClick={() => handleSelectSpeed(speed)}
							className={`block w-full px-3 py-1 text-left text-sm rounded ${
								speed === playbackRate
									? "bg-blue-100 text-blue-600"
									: "hover:bg-gray-100"
							}`}
						>
							x{speed}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default AudioVerseHighlighter;
