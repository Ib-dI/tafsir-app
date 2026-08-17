"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const DEFAULT_SHOW_TRANSLATION = true;

const STORAGE_KEY = "tafsir:showTranslation";

interface TranslationDisplayContextValue {
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
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

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true" || stored === "false") {
      setShowTranslation(stored === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(showTranslation));
  }, [showTranslation]);

  return (
    <TranslationDisplayContext.Provider
      value={{ showTranslation, setShowTranslation }}
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
