// src/lib/data/playbackPosition.ts
//
// Position de lecture (Playback Position) : dernier instant écouté au sein
// d'une partie audio, sauvegardé dans localStorage. Distinct de la
// "Progression complétée" (Firestore, voir src/lib/data/progress.ts) — voir
// CONTEXT.md.
import { PlaybackPosition } from "@/types/types";

const KEY = "audioVerseProgress:v1";
const KEY_LEGACY = "audioVerseProgress";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function readStoredJson(): string | null {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return current;
    const legacy = localStorage.getItem(KEY_LEGACY);
    if (legacy) {
      localStorage.setItem(KEY, legacy);
      localStorage.removeItem(KEY_LEGACY);
    }
    return legacy;
  } catch {
    return null;
  }
}

function readFresh(): PlaybackPosition | null {
  const raw = readStoredJson();
  if (!raw) return null;

  try {
    const position: PlaybackPosition = JSON.parse(raw);
    if (Date.now() - position.timestamp > TWENTY_FOUR_HOURS) {
      return null;
    }
    return position;
  } catch (error) {
    console.warn("Position de lecture illisible:", error);
    return null;
  }
}

export function savePlaybackPosition(position: PlaybackPosition): void {
  try {
    if (position.currentTime < 0 || !isFinite(position.currentTime)) {
      console.warn("Temps invalide pour sauvegarde:", position.currentTime);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(position));
    if (localStorage.getItem(KEY_LEGACY)) {
      localStorage.removeItem(KEY_LEGACY);
    }
  } catch (error) {
    console.warn("Erreur lors de la sauvegarde de la position de lecture:", error);
  }
}

export function loadPlaybackPosition(chapterId: number): PlaybackPosition | null {
  const position = readFresh();
  if (!position || position.chapterId !== chapterId) return null;
  return position;
}

export function loadLastPlaybackPosition(): PlaybackPosition | null {
  return readFresh();
}

export function clearPlaybackPosition(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_LEGACY);
  } catch {
    /* quota / privé */
  }
}
