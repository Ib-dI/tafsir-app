"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const DEFAULT_WORD_BY_WORD_ENABLED = true;

const STORAGE_KEY = "tafsir:wordByWord";

interface WordByWordContextValue {
  wordByWordEnabled: boolean;
  setWordByWordEnabled: (enabled: boolean) => void;
}

// Exporté (pas seulement le hook) pour permettre à AudioVerseHighlighter de
// fournir une valeur "effective" localement le temps de l'hydratation — voir
// AudioVerseHighlighter.tsx.
export const WordByWordContext =
  createContext<WordByWordContextValue | null>(null);

export function WordByWordProvider({ children }: { children: ReactNode }) {
  const [wordByWordEnabled, setWordByWordEnabled] = useState(DEFAULT_WORD_BY_WORD_ENABLED);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true" || stored === "false") {
      setWordByWordEnabled(stored === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(wordByWordEnabled));
  }, [wordByWordEnabled]);

  return (
    <WordByWordContext.Provider value={{ wordByWordEnabled, setWordByWordEnabled }}>
      {children}
    </WordByWordContext.Provider>
  );
}

export function useWordByWord() {
  const ctx = useContext(WordByWordContext);
  if (!ctx) {
    throw new Error("useWordByWord must be used within a WordByWordProvider");
  }
  return ctx;
}
