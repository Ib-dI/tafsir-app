import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Génère les données mot par mot du Coran à partir des sources brutes dans
// src/lib/data/quran-wbw/raw/ (importées depuis le projet extractor-quran).
// Contrairement à extractor-quran (un seul quran.json embarqué), on écrit un
// fichier par sourate — tafsir-app charge ses données chapitre par chapitre
// (comme le CDN quran-json), pas d'un coup.

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = resolve(rootDir, "src/lib/data/quran-wbw/raw");
const outputDir = resolve(rootDir, "src/lib/data/quran-wbw/generated");

const FOOTNOTE_PATTERN = /\[\[[\s\S]*?\]\]/g;

function cleanTranslation(raw) {
  return raw.replace(FOOTNOTE_PATTERN, "").trim();
}

const TAJWEED_OPEN_TAG_PATTERN =
  /^<rule class=(?:"([a-zA-Z_]+)"|'([a-zA-Z_]+)'|([a-zA-Z_]+))(?:\s[^>]*)?>/;
const TAJWEED_CLOSE_TAG = "</rule>";

// Le balisage source mélange attributs `class` non/simple/double-quotés et
// imbrique parfois des balises <rule> (ex. une règle madd autour d'une lettre
// muette), d'où un petit tokenizer plutôt qu'une seule regex.
function parseTajweedWord(text) {
  const segments = [];
  const ruleStack = [];
  let index = 0;

  while (index < text.length) {
    if (text.startsWith(TAJWEED_CLOSE_TAG, index)) {
      ruleStack.pop();
      index += TAJWEED_CLOSE_TAG.length;
      continue;
    }

    if (text[index] === "<") {
      const openMatch = TAJWEED_OPEN_TAG_PATTERN.exec(text.slice(index));
      if (openMatch) {
        const ruleName = openMatch[1] ?? openMatch[2] ?? openMatch[3];
        ruleStack.push(ruleName);
        index += openMatch[0].length;
        continue;
      }
    }

    let chunkEnd = index + 1;
    while (chunkEnd < text.length && text[chunkEnd] !== "<") {
      chunkEnd += 1;
    }

    segments.push({ text: text.slice(index, chunkEnd), rule: ruleStack.at(-1) ?? null });
    index = chunkEnd;
  }

  return segments;
}

function mergeTajweedSegments(segments) {
  const merged = [];

  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && previous.rule === segment.rule) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}

const slimSegment = ({ text, rule }) => (rule ? { text, rule } : { text });

function buildSurah(surahNumber, ayahMap, scripts, translations, wordTranslations, digitalKhattWords) {
  const ayahNumbers = [...ayahMap.keys()].sort((a, b) => a - b);
  const verses = [];

  for (const ayahNumber of ayahNumbers) {
    const wordEntries = ayahMap
      .get(ayahNumber)
      .slice()
      .sort((a, b) => Number(a.word.word) - Number(b.word.word));

    const key = `${surahNumber}:${ayahNumber}`;
    const translation = translations[key];

    const words = wordEntries.map(({ wordKey, word }) => {
      const indoPakWord = scripts.indopak[wordKey];
      const digitalKhattWord = digitalKhattWords[wordKey];
      const tajweedWord = scripts.tajweed[wordKey];
      const wordSegments = parseTajweedWord(tajweedWord ? tajweedWord.text : word.text);

      return {
        arabic: word.text,
        arabicIndoPak: indoPakWord ? indoPakWord.text : word.text,
        arabicDigitalKhatt: digitalKhattWord ? digitalKhattWord.text : word.text,
        tajweed: mergeTajweedSegments(wordSegments).map(slimSegment),
        translation: wordTranslations[wordKey] ?? null,
      };
    });

    verses.push({
      key,
      number: ayahNumber,
      words,
      translation: translation ? cleanTranslation(translation.t) : null,
    });
  }

  return { number: surahNumber, verses };
}

async function main() {
  const [uthmaniRaw, indopakRaw, tajweedRaw, translationsRaw, wordTranslationsRaw, digitalKhattRaw] =
    await Promise.all([
      readFile(resolve(rawDir, "qpc-hafs-word-by-word.json"), "utf8"),
      readFile(resolve(rawDir, "indopak-nastaleeq.json"), "utf8"),
      readFile(resolve(rawDir, "qpc-hafs-tajweed.json"), "utf8"),
      readFile(resolve(rawDir, "quran-fr-hamidullah-inline-footnotes.json"), "utf8"),
      readFile(resolve(rawDir, "french-wbw-translation.json"), "utf8"),
      readFile(resolve(rawDir, "digital-khatt-v2.json"), "utf8"),
    ]);

  const scripts = {
    uthmani: JSON.parse(uthmaniRaw),
    indopak: JSON.parse(indopakRaw),
    tajweed: JSON.parse(tajweedRaw),
  };
  const translations = JSON.parse(translationsRaw);
  const wordTranslations = JSON.parse(wordTranslationsRaw);
  const digitalKhattWords = JSON.parse(digitalKhattRaw);

  const versesBySurah = new Map();
  for (const [wordKey, word] of Object.entries(scripts.uthmani)) {
    const surahNumber = Number(word.surah);
    const ayahNumber = Number(word.ayah);

    let ayahMap = versesBySurah.get(surahNumber);
    if (!ayahMap) {
      ayahMap = new Map();
      versesBySurah.set(surahNumber, ayahMap);
    }

    let wordList = ayahMap.get(ayahNumber);
    if (!wordList) {
      wordList = [];
      ayahMap.set(ayahNumber, wordList);
    }

    wordList.push({ wordKey, word });
  }

  await mkdir(outputDir, { recursive: true });

  // Purge les fichiers générés précédemment (ex. sourates supprimées d'une
  // source obsolète) avant de réécrire — évite les fichiers orphelins.
  const existingFiles = await readdir(outputDir).catch(() => []);
  await Promise.all(
    existingFiles.filter((name) => name.endsWith(".json")).map((name) => unlink(resolve(outputDir, name))),
  );

  const surahNumbers = [...versesBySurah.keys()].sort((a, b) => a - b);

  await Promise.all(
    surahNumbers.map(async (surahNumber) => {
      const surah = buildSurah(
        surahNumber,
        versesBySurah.get(surahNumber),
        scripts,
        translations,
        wordTranslations,
        digitalKhattWords,
      );
      await writeFile(resolve(outputDir, `${surahNumber}.json`), JSON.stringify(surah), "utf8");
    }),
  );

  console.log(`Wrote ${surahNumbers.length} surah files to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
