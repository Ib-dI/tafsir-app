import { ReactNode } from "react";

// Types et interfaces partagés mot par mot (voir src/lib/quranWbw.ts)
export type TajweedSegment = {
  text: string;
  rule: string | null;
};

export type VerseWord = {
  arabic: string;
  arabicIndoPak: string;
  arabicDigitalKhatt: string;
  tajweed: TajweedSegment[];
  translation: string | null;
};

// Types et interfaces partagés SourateInteractiveContent
export type Verse = {
  id: number;
  text: string;
  translation: string;
  transliteration: string;
  words: VerseWord[];
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
  words: VerseWord[];
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
  onPlayingChange?: (isPlaying: boolean) => void;
  onAtTopChange?: (isAtTop: boolean) => void;
  onRegisterAudioControls?: (controls: AudioControls) => void;
};

export interface PlaybackPosition {
  chapterId: number;
  partId: string;
  currentTime: number;
  timestamp: number;
  audioUrl: string;
  currentPartIndex: number;
}

export type AudioControls = {
  pause: () => void;
  resetFinishState: () => void;
};

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
  onResetPart?: (partId: string) => void;
}