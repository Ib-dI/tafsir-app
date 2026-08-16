import type { ArabicScript } from "@/context/FontSettingsContext";
import type { TajweedSegment, VerseWord } from "@/types/types";
import type { ReactNode } from "react";

// Découpe les segments tajweed d'un mot en spans colorés par règle (classes
// .tajweed-rule--* dans globals.css) — porté depuis arabic-verse-text.tsx
// d'extractor-quran.
export function tajweedSpans(
  segments: TajweedSegment[],
  keyPrefix: string,
  transform: (text: string) => string,
) {
  return segments.map((segment, index) => {
    const text = transform(segment.text);
    return segment.rule ? (
      <span
        key={`${keyPrefix}-${index}`}
        className={`tajweed-rule--${segment.rule}`}
      >
        {text}
      </span>
    ) : (
      <span key={`${keyPrefix}-${index}`}>{text}</span>
    );
  });
}

// Calcule le contenu d'un mot selon le script/la police arabe actifs :
// Tajweed colore par règle, IndoPak/DigitalKhatt utilisent leur propre texte
// source, Uthmani (par défaut) applique l'ornement de fin de verset requis
// par les polices DigitalKhatt le cas échéant. Porté depuis la logique de
// ArabicVerseText (extractor-quran). Partagé entre VerseItem (rendu réel) et
// SettingsDrawer (aperçu en direct) pour ne pas dupliquer cette logique.
export function wordContent(
  word: VerseWord,
  index: number,
  script: ArabicScript,
  useDigitalKhattText: boolean,
  applyOrnament: (text: string) => string,
): ReactNode {
  if (script === "tajweed") {
    return tajweedSpans(word.tajweed, `word-${index}`, applyOrnament);
  }
  if (script === "indopak") {
    return word.arabicIndoPak;
  }
  if (useDigitalKhattText && word.arabicDigitalKhatt) {
    return word.arabicDigitalKhatt;
  }
  return applyOrnament(word.arabic);
}
