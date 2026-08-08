// src/hooks/useFavorites.ts
"use client";

import {
  subscribeToFavorites,
  toggleFavorite as toggleFavoriteInFirestore,
} from "@/lib/data/progress";
import { useCallback, useEffect, useState } from "react";

export function useFavorites(userId: string | null) {
  const [favoriteChapters, setFavoriteChapters] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (!userId) return;
    return subscribeToFavorites(userId, setFavoriteChapters, (error) =>
      console.error("useFavorites: écoute Firestore en échec", error),
    );
  }, [userId]);

  const toggleFavorite = useCallback(
    async (chapterId: number) => {
      if (!userId) return;
      await toggleFavoriteInFirestore(chapterId, userId, favoriteChapters.has(chapterId));
    },
    [userId, favoriteChapters],
  );

  return { favoriteChapters, toggleFavorite };
}
