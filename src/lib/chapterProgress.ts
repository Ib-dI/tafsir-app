// src/lib/chapterProgress.ts
import type { TafsirAudioPart } from "@/types/types";

export interface ChapterProgress {
  totalParts: number;
  completedParts: number;
  isFullyCompleted: boolean;
  progressPercent: number;
}

/**
 * Calcule la progression d'un chapitre à partir de ses parties et de
 * l'ensemble global des partId complétés. Les parties sans audio (ex:
 * "remaining-verses", détectées via `!part.url`) sont exclues du calcul.
 */
export function computeChapterProgress(
  parts: TafsirAudioPart[],
  completedPartIds: Set<string>,
): ChapterProgress {
  const audioParts = parts.filter((part) => part.url);
  const totalParts = audioParts.length;
  const completedParts = audioParts.filter((part) =>
    completedPartIds.has(part.id),
  ).length;
  const isFullyCompleted = totalParts > 0 && completedParts === totalParts;
  const progressPercent =
    totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

  return { totalParts, completedParts, isFullyCompleted, progressPercent };
}
