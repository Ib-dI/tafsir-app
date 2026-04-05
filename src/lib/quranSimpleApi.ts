import type { Verse } from "@/types/types";
import { cache } from "react";

const QURAN_JSON_BASE =
  "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/fr";

/** Revalidation CDN : contenu stable (ISR côté serveur). */
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** Entrée de l’index des chapitres (quran-json). */
export type SimpleChapterIndexEntry = {
  id: number;
  transliteration: string;
  name: string;
  translation: string;
  total_verses: number;
  type: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Échec HTTP ${res.status} : ${url}`);
  }
  return res.json() as Promise<T>;
}

async function getSimpleChaptersUncached(): Promise<SimpleChapterIndexEntry[]> {
  const url = `${QURAN_JSON_BASE}/index.json`;
  return fetchJson<SimpleChapterIndexEntry[]>(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
}

/**
 * Liste des sourates — à appeler depuis les Server Components.
 * `cache` : une seule exécution par requête HTTP.
 */
export const getSimpleChapters = cache(getSimpleChaptersUncached);

export type SimpleChapterPayload = {
  id: number;
  transliteration: string;
  translation: string;
  verses: Verse[];
};

async function getSimpleChapterVersesUncached(
  id: string | number,
): Promise<SimpleChapterPayload | null> {
  const url = `${QURAN_JSON_BASE}/${id}.json`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Échec HTTP ${res.status} : ${url}`);
  }
  return res.json() as Promise<SimpleChapterPayload>;
}

/**
 * Données d’une sourate — pour les Server Components.
 * `cache` : une seule exécution par requête pour un même `id` (complément au memo `fetch` de Next).
 */
export const getSimpleChapterVerses = cache(getSimpleChapterVersesUncached);
