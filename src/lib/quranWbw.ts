import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Verse, VerseWord } from "@/types/types";

/**
 * Sourate mot par mot générée localement (voir tools/prepare-quran-wbw-data.mjs
 * et `pnpm prepare-quran-data`) — arabe QPC/IndoPak/DigitalKhatt, Tajweed, et
 * traductions (Hamidullah par verset, mot par mot en français), à la manière
 * d'extractor-quran.
 */
type WbwVerse = {
  key: string;
  number: number;
  words: VerseWord[];
  translation: string | null;
};

type SurahWbw = {
  number: number;
  verses: WbwVerse[];
};

async function getSurahWbwUncached(
  chapterId: number,
): Promise<SurahWbw | null> {
  const filePath = path.join(
    process.cwd(),
    "src/lib/data/quran-wbw/generated",
    `${chapterId}.json`,
  );

  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SurahWbw;
  } catch {
    return null;
  }
}

/** Une lecture disque par sourate et par requête. */
export const getSurahWbw = cache(getSurahWbwUncached);

/**
 * Fusionne les versets du CDN (quranSimpleApi — transliteration conservée
 * telle quelle) avec les données mot par mot locales (texte arabe et
 * traduction Hamidullah).
 *
 * Le dernier "mot" de chaque verset QPC est le repère de fin de verset (son
 * chiffre arabe, ex. "١٠") : `verse.words` le garde (comme extractor-quran),
 * pour que le rendu mot par mot puisse l'afficher via le même pipeline par
 * script que les autres mots — nécessaire pour Tajweed/DigitalKhatt, où
 * l'ornement de fin de verset dépend du script/police actifs (voir
 * src/lib/ayahMarker.ts). `verse.text` (le texte à plat, utilisé en repli et
 * par OverlayVerses, qui ajoute son propre chiffre via toArabicNumerals)
 * l'exclut pour ne pas le dupliquer.
 */
export function mergeVersesWithWbw(
  cdnVerses: Verse[],
  surahWbw: SurahWbw | null,
): Verse[] {
  const wbwByNumber = new Map(
    (surahWbw?.verses ?? []).map((v) => [v.number, v]),
  );

  return cdnVerses.map((verse) => {
    const wbwVerse = wbwByNumber.get(verse.id);
    if (!wbwVerse || wbwVerse.words.length === 0) {
      return { ...verse, words: [] };
    }

    const contentWords = wbwVerse.words.slice(0, -1);

    return {
      ...verse,
      text: contentWords.map((word) => word.arabic).join(" "),
      translation: wbwVerse.translation ?? verse.translation,
      words: wbwVerse.words,
    };
  });
}
