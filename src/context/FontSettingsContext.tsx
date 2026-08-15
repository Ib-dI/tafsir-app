"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Paliers de taille du texte arabe, en px. Index 2 = valeur actuelle (par défaut).
export const FONT_SCALE_STEPS_MOBILE = [19, 21, 23.5, 26, 29] as const;
export const FONT_SCALE_STEPS_DESKTOP = [25, 27, 30, 33, 37] as const;
export const DEFAULT_FONT_SCALE_INDEX = 2;

const STORAGE_KEY = "tafsir:fontScaleIndex";

interface FontSettingsContextValue {
  fontScaleIndex: number;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  resetFontScale: () => void;
}

const FontSettingsContext = createContext<FontSettingsContextValue | null>(null);

export function FontSettingsProvider({ children }: { children: ReactNode }) {
  const [fontScaleIndex, setFontScaleIndex] = useState(DEFAULT_FONT_SCALE_INDEX);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return;
    const parsed = Number(stored);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS_MOBILE.length) {
      setFontScaleIndex(parsed);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(fontScaleIndex));
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-mobile",
      `${FONT_SCALE_STEPS_MOBILE[fontScaleIndex]}px`,
    );
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-desktop",
      `${FONT_SCALE_STEPS_DESKTOP[fontScaleIndex]}px`,
    );
  }, [fontScaleIndex]);

  const increaseFontScale = () =>
    setFontScaleIndex((i) => Math.min(i + 1, FONT_SCALE_STEPS_MOBILE.length - 1));
  const decreaseFontScale = () => setFontScaleIndex((i) => Math.max(i - 1, 0));
  const resetFontScale = () => setFontScaleIndex(DEFAULT_FONT_SCALE_INDEX);

  return (
    <FontSettingsContext.Provider
      value={{ fontScaleIndex, increaseFontScale, decreaseFontScale, resetFontScale }}
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
