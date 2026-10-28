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
  // La sauvegarde dans localStorage se fait uniquement sur action de
  // l'utilisateur, jamais dans un effet : un effet d'écriture tournerait au
  // montage avec la valeur par défaut et, en dev (StrictMode rejoue les
  // effets), la relecture suivante récupérerait ce défaut à la place de la
  // préférence enregistrée.
  const [wordByWordEnabled, setWordByWordEnabledState] = useState(DEFAULT_WORD_BY_WORD_ENABLED);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true" || stored === "false") {
      setWordByWordEnabledState(stored === "true");
    }
  }, []);

  const setWordByWordEnabled = (enabled: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
    setWordByWordEnabledState(enabled);
  };

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
