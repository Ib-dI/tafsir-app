// src/hooks/useUserId.ts
"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { useEffect, useState } from "react";

const ANONYMOUS_USER_ID_KEY = "tafsir-app:anonymousUserId";

function getPersistedFallbackUserId(): string {
  const existing = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(ANONYMOUS_USER_ID_KEY, generated);
  return generated;
}

export function useUserId(): { userId: string | null; isAuthReady: boolean } {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthReady(true);
        return;
      }

      try {
        await signInAnonymously(auth);
        setUserId(auth.currentUser?.uid ?? getPersistedFallbackUserId());
      } catch (error) {
        console.error("useUserId: échec de la connexion anonyme Firebase", error);
        setUserId(getPersistedFallbackUserId());
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return { userId, isAuthReady };
}
