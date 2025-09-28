import { ReactNode } from "react";

// Types et interfaces partagés SourateInteractiveContent
export type Verse = {
  id: number;
  text: string;
  translation: string;
  transliteration: string;
};

export type TafsirAudioTiming = {
  id: number;
  startTime: number;
  endTime: number;
  occurrence?: number; 
};

export type TafsirAudioPart = {
  id: string;
  title: string;
  url: string;
  timings: TafsirAudioTiming[];
};

export interface SourateInteractiveContentProps {
  verses: Verse[];
  audioParts: TafsirAudioPart[];
  infoSourate: (number | string)[];
  chapterId: number;
}

// Types et interfaces partagés AudioVerseHighlighter
export type VerseHighlight = {
  id: number;
  text: string;
  verset: string;
  transliteration: string;
  translation: string;
  noAudio?: boolean;
  occurrences: { startTime: number; endTime: number }[];
};

export type AudioVerseHighlighterProps = {
  audioUrl: string;
  verses: VerseHighlight[];
  infoSourate: string[];
  children?: ReactNode;
  onAudioFinished?: () => void;
  onNextChapter?: () => void;
  onPreviousChapter?: () => void;
  hasNextChapter?: boolean;
  hasPreviousChapter?: boolean;
  currentChapterId: number;
  totalChapters?: number;
  showOnlyWithAudio?: boolean;
  currentPartIndex: number;
  totalParts: number;
  onPartChange?: (partIndex: number) => void;
  onNavigateToPart?: (navigateFunction: (partIndex: number) => void) => void;
};

export interface ProgressData {
  chapterId: number;
  partId: string;
  currentTime: number;
  timestamp: number;
  audioUrl: string;
  currentPartIndex: number;
  totalParts: number;
}

// Types et interfaces partagés HeaderRight
export interface HeaderRightProps {
  audioParts: TafsirAudioPart[];
  currentPartIndex: number;
  setCurrentPartIndex: (index: number) => void;
  completedPartIds: Set<string>;
  colors: {
    card: string;
    border: string;
    text: string;
    primary: string;
    textSecondary: string;
    success?: string;
  };
  onNextPart?: () => void;
  onPreviousPart?: () => void;
}