// src/hooks/useChapterProgress.ts
"use client";

import { subscribeToChapterProgress } from "@/lib/data/progress";
import { useEffect, useState } from "react";

export function useChapterProgress(
  chapterId: number,
  userId: string | null,
): Set<string> {
  const [completedPartIds, setCompletedPartIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!userId) return;
    return subscribeToChapterProgress(chapterId, userId, setCompletedPartIds, (error) =>
      console.error("useChapterProgress: écoute Firestore en échec", error),
    );
  }, [chapterId, userId]);

  return completedPartIds;
}
