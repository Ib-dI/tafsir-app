"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Paliers de taille du texte arabe, en px. Index 2 = valeur actuelle (par défaut).
export const FONT_SCALE_STEPS_MOBILE = [19, 21, 23.5, 26, 29] as const;
export const FONT_SCALE_STEPS_DESKTOP = [25, 27, 30, 33, 37] as const;
export const DEFAULT_FONT_SCALE_INDEX = 2;

export type ArabicScript = "uthmani" | "indopak";
export const DEFAULT_ARABIC_SCRIPT: ArabicScript = "uthmani";

const SCRIPT_FONT_FAMILY: Record<ArabicScript, string> = {
  uthmani: "Uthmanic",
  indopak: "IndoPak",
};

const SCALE_STORAGE_KEY = "tafsir:fontScaleIndex";
const SCRIPT_STORAGE_KEY = "tafsir:arabicScript";

interface FontSettingsContextValue {
  fontScaleIndex: number;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  resetFontScale: () => void;
  arabicScript: ArabicScript;
  setArabicScript: (script: ArabicScript) => void;
}

const FontSettingsContext = createContext<FontSettingsContextValue | null>(null);

export function FontSettingsProvider({ children }: { children: ReactNode }) {
  const [fontScaleIndex, setFontScaleIndex] = useState(DEFAULT_FONT_SCALE_INDEX);
  const [arabicScript, setArabicScript] = useState<ArabicScript>(DEFAULT_ARABIC_SCRIPT);

  useEffect(() => {
    const storedScale = window.localStorage.getItem(SCALE_STORAGE_KEY);
    if (storedScale !== null) {
      const parsed = Number(storedScale);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS_MOBILE.length) {
        setFontScaleIndex(parsed);
      }
    }

    const storedScript = window.localStorage.getItem(SCRIPT_STORAGE_KEY);
    if (storedScript === "uthmani" || storedScript === "indopak") {
      setArabicScript(storedScript);
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

  const increaseFontScale = () =>
    setFontScaleIndex((i) => Math.min(i + 1, FONT_SCALE_STEPS_MOBILE.length - 1));
  const decreaseFontScale = () => setFontScaleIndex((i) => Math.max(i - 1, 0));
  const resetFontScale = () => {
    setFontScaleIndex(DEFAULT_FONT_SCALE_INDEX);
    setArabicScript(DEFAULT_ARABIC_SCRIPT);
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
      }}
    >
      {children}
    </FontSettingsContext.Provider>
  );
}

export function useFontSettings() {
  const ctx = useContext(FontSettingsContext);
  if (!ctx) {
    throw new Error("useFontSettings must be used within a FontSettingsProvider");
  }
  return ctx;
}
