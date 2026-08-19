"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Paliers de taille du texte arabe, en px. Index 2 = valeur par défaut.
// 7 paliers pour correspondre à la plage d'extractor-quran (ARABIC_SIZE_MIN=1
// à ARABIC_SIZE_MAX=7) ; les 5 premiers sont inchangés, 2 paliers ajoutés en
// haut de l'échelle.
export const FONT_SCALE_STEPS_MOBILE = [19, 21, 23.5, 26, 29, 33, 37] as const;
export const FONT_SCALE_STEPS_DESKTOP = [25, 27, 30, 33, 37, 42, 47] as const;
export const DEFAULT_FONT_SCALE_INDEX = 2;

export type ArabicScript = "uthmani" | "indopak" | "tajweed";
export const DEFAULT_ARABIC_SCRIPT: ArabicScript = "uthmani";

// Matches quran.com's own naming for the default font (QuranFont.QPCHafs).
// The other two are DigitalKhatt (https://digitalkhatt.org) engine fonts —
// full Unicode Uthmani-script faces, ported from extractor-quran. Only
// meaningful when arabicScript is "uthmani" or "tajweed" — IndoPak always
// uses its own dedicated font.
export type ArabicFontStyle = "default" | "digitalkhatt-v1" | "digitalkhatt-v2";
export const DEFAULT_ARABIC_FONT_STYLE: ArabicFontStyle = "default";

const SCRIPT_FONT_FAMILY: Record<ArabicScript, string> = {
  uthmani: "Uthmanic",
  indopak: "IndoPak",
  tajweed: "Uthmanic",
};

const SCALE_STORAGE_KEY = "tafsir:fontScaleIndex";
const SCRIPT_STORAGE_KEY = "tafsir:arabicScript";
const FONT_STYLE_STORAGE_KEY = "tafsir:arabicFontStyle";

interface FontSettingsContextValue {
  fontScaleIndex: number;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  resetFontScale: () => void;
  arabicScript: ArabicScript;
  setArabicScript: (script: ArabicScript) => void;
  fontStyle: ArabicFontStyle;
  setFontStyle: (fontStyle: ArabicFontStyle) => void;
}

// Exporté (pas seulement le hook) pour permettre à AudioVerseHighlighter de
// fournir une valeur "effective" localement le temps de l'hydratation — voir
// AudioVerseHighlighter.tsx.
export const FontSettingsContext =
  createContext<FontSettingsContextValue | null>(null);

export function FontSettingsProvider({ children }: { children: ReactNode }) {
  const [fontScaleIndex, setFontScaleIndex] = useState(
    DEFAULT_FONT_SCALE_INDEX,
  );
  const [arabicScript, setArabicScript] = useState<ArabicScript>(
    DEFAULT_ARABIC_SCRIPT,
  );
  const [fontStyle, setFontStyle] = useState<ArabicFontStyle>(
    DEFAULT_ARABIC_FONT_STYLE,
  );

  useEffect(() => {
    const storedScale = window.localStorage.getItem(SCALE_STORAGE_KEY);
    if (storedScale !== null) {
      const parsed = Number(storedScale);
      if (
        Number.isInteger(parsed) &&
        parsed >= 0 &&
        parsed < FONT_SCALE_STEPS_MOBILE.length
      ) {
        setFontScaleIndex(parsed);
      }
    }

    const storedScript = window.localStorage.getItem(SCRIPT_STORAGE_KEY);
    if (
      storedScript === "uthmani" ||
      storedScript === "indopak" ||
      storedScript === "tajweed"
    ) {
      setArabicScript(storedScript);
    }

    const storedFontStyle = window.localStorage.getItem(FONT_STYLE_STORAGE_KEY);
    if (
      storedFontStyle === "default" ||
      storedFontStyle === "digitalkhatt-v1" ||
      storedFontStyle === "digitalkhatt-v2"
    ) {
      setFontStyle(storedFontStyle);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SCALE_STORAGE_KEY, String(fontScaleIndex));
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-mobile",
      `${FONT_SCALE_STEPS_MOBILE[fontScaleIndex]}px`,
    );
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-desktop",
      `${FONT_SCALE_STEPS_DESKTOP[fontScaleIndex]}px`,
    );
  }, [fontScaleIndex]);

  useEffect(() => {
    window.localStorage.setItem(SCRIPT_STORAGE_KEY, arabicScript);
    document.documentElement.style.setProperty(
      "--verse-arabic-font-family",
      SCRIPT_FONT_FAMILY[arabicScript],
    );
  }, [arabicScript]);

  useEffect(() => {
    window.localStorage.setItem(FONT_STYLE_STORAGE_KEY, fontStyle);
    if (fontStyle === "default") {
      delete document.documentElement.dataset.fontStyle;
    } else {
      document.documentElement.dataset.fontStyle = fontStyle;
    }
  }, [fontStyle]);

  const increaseFontScale = () =>
    setFontScaleIndex((i) =>
      Math.min(i + 1, FONT_SCALE_STEPS_MOBILE.length - 1),
    );
  const decreaseFontScale = () => setFontScaleIndex((i) => Math.max(i - 1, 0));
  const resetFontScale = () => {
    setFontScaleIndex(DEFAULT_FONT_SCALE_INDEX);
    setArabicScript(DEFAULT_ARABIC_SCRIPT);
    setFontStyle(DEFAULT_ARABIC_FONT_STYLE);
  };

  return (
    <FontSettingsContext.Provider
      value={{
        fontScaleIndex,
        increaseFontScale,
        decreaseFontScale,
        resetFontScale,
        arabicScript,
        setArabicScript,
        fontStyle,
        setFontStyle,
      }}
    >
      {children}
    </FontSettingsContext.Provider>
  );
}

export function useFontSettings() {
  const ctx = useContext(FontSettingsContext);
  if (!ctx) {
    throw new Error(
      "useFontSettings must be used within a FontSettingsProvider",
    );
  }
  return ctx;
}
