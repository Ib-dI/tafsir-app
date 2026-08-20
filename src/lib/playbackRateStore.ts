// Store externe minimal pour la vitesse de lecture, lue depuis localStorage.
//
// Pensé pour useSyncExternalStore plutôt qu'un useState + effet de
// hydratation séparé : ce dernier avait une fenêtre de course où l'effet de
// sauvegarde du premier montage pouvait écrire la valeur par défaut avant
// que l'effet de correction ait eu le temps de lire localStorage — et si le
// composant démontait entre-temps (double montage StrictMode, remount
// précoce pendant que l'audio se résout), la correction n'avait jamais lieu.
// useSyncExternalStore force la resynchronisation avec getSnapshot avant que
// le moindre effet passif (y compris celui de sauvegarde) ne s'exécute, donc
// cette fenêtre de course n'existe plus. Voir aussi son usage dans
// useAudioPlayback.ts.
const STORAGE_KEY = "tafsir:playbackRate";
const VALID_PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2];

function readFromLocalStorage(): number {
  if (typeof window === "undefined") return 1;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const parsed = stored !== null ? Number(stored) : null;
  return parsed !== null && VALID_PLAYBACK_RATES.includes(parsed)
    ? parsed
    : 1;
}

let cachedSnapshot = readFromLocalStorage();
const listeners = new Set<() => void>();

export function getPlaybackRateSnapshot(): number {
  return cachedSnapshot;
}

export function getServerPlaybackRateSnapshot(): number {
  return 1;
}

export function subscribeToPlaybackRate(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function setPlaybackRateStore(rate: number) {
  if (rate === cachedSnapshot) return;
  cachedSnapshot = rate;
  window.localStorage.setItem(STORAGE_KEY, String(rate));
  listeners.forEach((listener) => listener());
}
