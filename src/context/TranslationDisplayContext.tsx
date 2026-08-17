"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const DEFAULT_SHOW_TRANSLATION = true;
export const DEFAULT_SHOW_TRANSLITERATION = false;

// Paliers de taille du texte de traduction, en px. Index 2 (16px) = valeur
// par défaut, identique à l'ancien `text-base` fixe.
export const TRANSLATION_SCALE_STEPS = [14, 15, 16, 17, 18, 20, 22] as const;
export const DEFAULT_TRANSLATION_SCALE_INDEX = 2;

const TRANSLATION_STORAGE_KEY = "tafsir:showTranslation";
// v2 : la translitération passe à false par défaut — nouvelle clé pour que
// les préférences "true" déjà enregistrées ne l'emportent plus sur ce défaut.
const TRANSLITERATION_STORAGE_KEY = "tafsir:showTransliteration:v2";
const TRANSLATION_SCALE_STORAGE_KEY = "tafsir:translationScaleIndex";

interface TranslationDisplayContextValue {
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  showTransliteration: boolean;
  setShowTransliteration: (show: boolean) => void;
  translationScaleIndex: number;
  increaseTranslationScale: () => void;
  decreaseTranslationScale: () => void;
  resetTranslationScale: () => void;
}

const TranslationDisplayContext =
  createContext<TranslationDisplayContextValue | null>(null);

export function TranslationDisplayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [showTranslation, setShowTranslation] = useState(
    DEFAULT_SHOW_TRANSLATION,
  );
  const [showTransliteration, setShowTransliteration] = useState(
    DEFAULT_SHOW_TRANSLITERATION,
  );
  const [translationScaleIndex, setTranslationScaleIndex] = useState(
    DEFAULT_TRANSLATION_SCALE_INDEX,
  );

  useEffect(() => {
    const storedTranslation = window.localStorage.getItem(
      TRANSLATION_STORAGE_KEY,
    );
    if (storedTranslation === "true" || storedTranslation === "false") {
      setShowTranslation(storedTranslation === "true");
    }

    const storedTransliteration = window.localStorage.getItem(
      TRANSLITERATION_STORAGE_KEY,
    );
    if (storedTransliteration === "true" || storedTransliteration === "false") {
      setShowTransliteration(storedTransliteration === "true");
    }

    const storedScale = window.localStorage.getItem(
      TRANSLATION_SCALE_STORAGE_KEY,
    );
    if (storedScale !== null) {
      const parsed = Number(storedScale);
      if (
        Number.isInteger(parsed) &&
        parsed >= 0 &&
        parsed < TRANSLATION_SCALE_STEPS.length
      ) {
        setTranslationScaleIndex(parsed);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      TRANSLATION_STORAGE_KEY,
      String(showTranslation),
    );
  }, [showTranslation]);

  useEffect(() => {
    window.localStorage.setItem(
      TRANSLITERATION_STORAGE_KEY,
      String(showTransliteration),
    );
  }, [showTransliteration]);

  useEffect(() => {
    window.localStorage.setItem(
      TRANSLATION_SCALE_STORAGE_KEY,
      String(translationScaleIndex),
    );
    document.documentElement.style.setProperty(
      "--verse-translation-font-size",
      `${TRANSLATION_SCALE_STEPS[translationScaleIndex]}px`,
    );
  }, [translationScaleIndex]);

  const increaseTranslationScale = () =>
    setTranslationScaleIndex((i) =>
      Math.min(i + 1, TRANSLATION_SCALE_STEPS.length - 1),
    );
  const decreaseTranslationScale = () =>
    setTranslationScaleIndex((i) => Math.max(i - 1, 0));
  const resetTranslationScale = () =>
    setTranslationScaleIndex(DEFAULT_TRANSLATION_SCALE_INDEX);

  return (
    <TranslationDisplayContext.Provider
      value={{
        showTranslation,
        setShowTranslation,
        showTransliteration,
        setShowTransliteration,
        translationScaleIndex,
        increaseTranslationScale,
        decreaseTranslationScale,
        resetTranslationScale,
      }}
    >
      {children}
    </TranslationDisplayContext.Provider>
  );
}

export function useTranslationDisplay() {
  const ctx = useContext(TranslationDisplayContext);
  if (!ctx) {
    throw new Error(
      "useTranslationDisplay must be used within a TranslationDisplayProvider",
    );
  }
  return ctx;
}
