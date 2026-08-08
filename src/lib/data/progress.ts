// src/lib/data/progress.ts
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";

function requireProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID non défini");
  }
  return projectId;
}

function progressCollection(firestore: Firestore, userId: string) {
  return collection(
    firestore,
    `artifacts/${requireProjectId()}/users/${userId}/progress`,
  );
}

function favoritesCollection(firestore: Firestore, userId: string) {
  return collection(
    firestore,
    `artifacts/${requireProjectId()}/users/${userId}/favorites`,
  );
}

function extractPartIds(snapshot: { forEach: (cb: (doc: { data: () => { partId?: string } }) => void) => void }) {
  const partIds = new Set<string>();
  snapshot.forEach((doc) => {
    const partId = doc.data().partId;
    if (partId) partIds.add(partId);
  });
  return partIds;
}

export async function markPartCompleted(
  chapterId: number,
  partId: string,
  userId: string,
  firestore: Firestore = db,
): Promise<void> {
  const progressRef = doc(progressCollection(firestore, userId), partId);
  await setDoc(progressRef, {
    chapterId,
    partId,
    completedAt: serverTimestamp(),
  });
}

export async function resetChapterProgress(
  chapterId: number,
  userId: string,
  firestore: Firestore = db,
): Promise<void> {
  const q = query(
    progressCollection(firestore, userId),
    where("chapterId", "==", chapterId),
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

export async function resetPartProgress(
  partId: string,
  userId: string,
  firestore: Firestore = db,
): Promise<void> {
  await deleteDoc(doc(progressCollection(firestore, userId), partId));
}

export function subscribeToChapterProgress(
  chapterId: number,
  userId: string,
  onChange: (completedPartIds: Set<string>) => void,
  onError?: (error: Error) => void,
  firestore: Firestore = db,
): () => void {
  const q = query(
    progressCollection(firestore, userId),
    where("chapterId", "==", chapterId),
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(extractPartIds(snapshot)),
    (error) => onError?.(error),
  );
}

export function subscribeToAllProgress(
  userId: string,
  onChange: (completedPartIds: Set<string>) => void,
  onError?: (error: Error) => void,
  firestore: Firestore = db,
): () => void {
  return onSnapshot(
    progressCollection(firestore, userId),
    (snapshot) => onChange(extractPartIds(snapshot)),
    (error) => onError?.(error),
  );
}

export async function toggleFavorite(
  chapterId: number,
  userId: string,
  isCurrentlyFavorite: boolean,
  firestore: Firestore = db,
): Promise<void> {
  const favoriteRef = doc(
    favoritesCollection(firestore, userId),
    chapterId.toString(),
  );
  if (isCurrentlyFavorite) {
    await deleteDoc(favoriteRef);
  } else {
    await setDoc(favoriteRef, {
      chapterId,
      createdAt: new Date().toISOString(),
    });
  }
}

export function subscribeToFavorites(
  userId: string,
  onChange: (favoriteChapterIds: Set<number>) => void,
  onError?: (error: Error) => void,
  firestore: Firestore = db,
): () => void {
  return onSnapshot(
    favoritesCollection(firestore, userId),
    (snapshot) => {
      const favoriteChapterIds = new Set<number>();
      snapshot.forEach((doc) => {
        const chapterId = parseInt(doc.id, 10);
        if (!isNaN(chapterId)) favoriteChapterIds.add(chapterId);
      });
      onChange(favoriteChapterIds);
    },
    (error) => onError?.(error),
  );
}
