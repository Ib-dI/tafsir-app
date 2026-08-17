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

const TRANSLATION_STORAGE_KEY = "tafsir:showTranslation";
const TRANSLITERATION_STORAGE_KEY = "tafsir:showTransliteration";

interface TranslationDisplayContextValue {
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  showTransliteration: boolean;
  setShowTransliteration: (show: boolean) => void;
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

  return (
    <TranslationDisplayContext.Provider
      value={{
        showTranslation,
        setShowTranslation,
        showTransliteration,
        setShowTransliteration,
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
