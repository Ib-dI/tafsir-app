import type { ArabicFontStyle } from "@/context/FontSettingsContext";

// Ayah-number "words" in the Quran data are bare Arabic-Indic digits (e.g.
// U+0661 U+0661 U+0661 for "111"). UthmanicHafs/IndoPak bake the ornamental
// circle directly into their own digit glyphs, so a bare digit already
// renders as the ornament. DigitalKhatt fonts instead treat U+06DD (ARABIC
// END OF AYAH) as a combining mark that frames digit(s) placed AFTER it
// (mark-then-digits) — ported as-is from extractor-quran's src/lib/ayah-marker.ts,
// confirmed there both in-browser and against DigitalKhatt's own official
// text dataset (src/lib/data/quran-wbw/raw/digital-khatt-v2.json stores ayah
// markers as "۝" followed by the digits).
const TRAILING_ARABIC_INDIC_DIGITS = /([٠-٩]+)$/;
const END_OF_AYAH = "۝";

export function withDigitalKhattAyahOrnament(text: string): string {
  return text.replace(TRAILING_ARABIC_INDIC_DIGITS, `${END_OF_AYAH}$1`);
}

function identity(text: string): string {
  return text;
}

export function isDigitalKhattFontStyle(fontStyle: ArabicFontStyle): boolean {
  return fontStyle === "digitalkhatt-v1" || fontStyle === "digitalkhatt-v2";
}

/** Which font styles need `withDigitalKhattAyahOrnament`, and the no-op for the ones that don't — the single place that knows the answer to both. */
export function applyOrnamentFor(
  fontStyle: ArabicFontStyle,
): (text: string) => string {
  return isDigitalKhattFontStyle(fontStyle)
    ? withDigitalKhattAyahOrnament
    : identity;
}
