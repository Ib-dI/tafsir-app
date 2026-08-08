// src/hooks/useAllProgress.ts
"use client";

import { subscribeToAllProgress } from "@/lib/data/progress";
import { useEffect, useState } from "react";

export function useAllProgress(userId: string | null): Set<string> {
  const [completedPartIds, setCompletedPartIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!userId) return;
    return subscribeToAllProgress(userId, setCompletedPartIds, (error) =>
      console.error("useAllProgress: écoute Firestore en échec", error),
    );
  }, [userId]);

  return completedPartIds;
}
