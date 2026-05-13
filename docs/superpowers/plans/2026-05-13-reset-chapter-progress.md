# Reset de la progression d'un chapitre — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de réinitialiser la progression d'un chapitre (dès qu'au moins une partie est complétée), depuis la liste des chapitres et depuis la page du chapitre, avec confirmation via AlertDialog shadcn.

**Architecture:** Un nouveau composant `ResetProgressDialog` encapsule l'AlertDialog shadcn et reçoit un trigger, un nom de chapitre et un callback de confirmation. `AudioVerseHighlighter` expose ses contrôles audio (`pause`, `resetFinishState`) au parent via un nouveau prop `onRegisterAudioControls`, suivant le pattern existant `onNavigateToPart`. La suppression Firestore requête tous les documents `progress` du chapitre par `chapterId` et les supprime en parallèle.

**Tech Stack:** Next.js App Router, TypeScript, Firebase Firestore, shadcn/ui (AlertDialog), Lucide React (RotateCcw), Framer Motion (déjà en place)

---

## Fichiers touchés

| Action | Fichier |
|--------|---------|
| Installer | `src/components/ui/alert-dialog.tsx` (via shadcn CLI) |
| Modifier | `src/types/types.ts` — ajouter type `AudioControls` + prop `onRegisterAudioControls` |
| Créer | `src/components/ResetProgressDialog.tsx` |
| Modifier | `src/components/AudioVerseHighlighter.tsx` — exposer `onRegisterAudioControls` |
| Modifier | `src/app/sourates/[id]/SourateInteractiveContent.tsx` — reset + bouton header |
| Modifier | `src/app/sourates/SouratesClient.tsx` — reset + bouton carte |

---

## Task 1 : Installer AlertDialog et ajouter le type `AudioControls`

**Files:**
- Install: `src/components/ui/alert-dialog.tsx`
- Modify: `src/types/types.ts`

- [ ] **Step 1 : Installer le composant AlertDialog via shadcn**

```bash
cd "E:/Cortex/tafsir-app" && npx shadcn@latest add alert-dialog
```

Répondre `y` à toute confirmation. Le fichier `src/components/ui/alert-dialog.tsx` sera créé automatiquement.

- [ ] **Step 2 : Vérifier que le fichier a été créé**

```bash
ls "E:/Cortex/tafsir-app/src/components/ui"
```

Attendu : `alert-dialog.tsx` apparaît dans la liste.

- [ ] **Step 3 : Ajouter le type `AudioControls` dans `src/types/types.ts`**

Ouvrir `src/types/types.ts`. Ajouter après la définition de `ProgressData` (ligne 72) :

```ts
export type AudioControls = {
  pause: () => void;
  resetFinishState: () => void;
};
```

- [ ] **Step 4 : Ajouter `onRegisterAudioControls` à `AudioVerseHighlighterProps`**

Dans `src/types/types.ts`, dans l'interface `AudioVerseHighlighterProps`, ajouter après la ligne `onAtTopChange?: (isAtTop: boolean) => void;` :

```ts
  onRegisterAudioControls?: (controls: AudioControls) => void;
```

- [ ] **Step 5 : Vérifier le typage**

```bash
cd "E:/Cortex/tafsir-app" && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur liée aux nouveaux types.

- [ ] **Step 6 : Commit**

```bash
cd "E:/Cortex/tafsir-app" && git add src/components/ui/alert-dialog.tsx src/types/types.ts && git commit -m "feat: add AlertDialog component and AudioControls type"
```

---

## Task 2 : Créer `ResetProgressDialog`

**Files:**
- Create: `src/components/ResetProgressDialog.tsx`

- [ ] **Step 1 : Créer le fichier `src/components/ResetProgressDialog.tsx`**

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReactNode } from "react";

interface ResetProgressDialogProps {
  chapterName: string;
  onConfirm: () => void;
  trigger: ReactNode;
}

export default function ResetProgressDialog({
  chapterName,
  onConfirm,
  trigger,
}: ResetProgressDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser la progression ?</AlertDialogTitle>
          <AlertDialogDescription>
            Toute la progression du chapitre{" "}
            <strong className="text-foreground">{chapterName}</strong> sera
            effacée. Vous pourrez recommencer depuis le début.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Réinitialiser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
cd "E:/Cortex/tafsir-app" && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
cd "E:/Cortex/tafsir-app" && git add src/components/ResetProgressDialog.tsx && git commit -m "feat: add ResetProgressDialog component with AlertDialog confirmation"
```

---

## Task 3 : Étendre `AudioVerseHighlighter` avec `onRegisterAudioControls`

**Files:**
- Modify: `src/components/AudioVerseHighlighter.tsx`

- [ ] **Step 1 : Ajouter `onRegisterAudioControls` à la destructuration des props**

Dans `src/components/AudioVerseHighlighter.tsx`, trouver la destructuration des props (ligne ~61). Ajouter `onRegisterAudioControls` à la fin de la liste, juste avant `}: AudioVerseHighlighterProps` :

```tsx
const AudioVerseHighlighter = ({
  audioUrl,
  verses,
  infoSourate,
  children,
  onAudioFinished,
  onNextChapter,
  onPreviousChapter,
  hasNextChapter = true,
  hasPreviousChapter = true,
  currentChapterId,
  totalChapters = 114,
  currentPartIndex,
  totalParts,
  onPartChange,
  onNavigateToPart,
  onPlayingChange,
  onAtTopChange,
  onRegisterAudioControls,
}: AudioVerseHighlighterProps & {
  currentChapterId: number;
  totalChapters?: number;
}) => {
```

- [ ] **Step 2 : Exposer les contrôles audio au parent**

Dans `src/components/AudioVerseHighlighter.tsx`, ajouter ce `useEffect` immédiatement **après** le `useEffect` qui expose `onNavigateToPart` (après la ligne `}, [onNavigateToPart, navigateToPart]);`) :

```tsx
useEffect(() => {
  if (onRegisterAudioControls) {
    onRegisterAudioControls({
      pause: () => wavesurferRef.current?.pause(),
      resetFinishState: () => {
        finishHandledRef.current = false;
        setHasAudioFinished(false);
      },
    });
  }
}, [onRegisterAudioControls]);
```

- [ ] **Step 3 : Vérifier le typage**

```bash
cd "E:/Cortex/tafsir-app" && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
cd "E:/Cortex/tafsir-app" && git add src/components/AudioVerseHighlighter.tsx && git commit -m "feat: expose onRegisterAudioControls from AudioVerseHighlighter"
```

---

## Task 4 : Modifier `SourateInteractiveContent` — reset + bouton dans le header

**Files:**
- Modify: `src/app/sourates/[id]/SourateInteractiveContent.tsx`

- [ ] **Step 1 : Mettre à jour les imports Firestore**

Remplacer le bloc d'imports Firestore existant dans `SourateInteractiveContent.tsx` :

```tsx
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
} from "firebase/firestore";
```

- [ ] **Step 2 : Ajouter les imports manquants en haut du fichier**

Ajouter après les imports existants (avant la première ligne du composant) :

```tsx
import { RotateCcw } from "lucide-react";
import ResetProgressDialog from "@/components/ResetProgressDialog";
import { AudioControls } from "@/types/types";
```

- [ ] **Step 3 : Ajouter `audioControlsRef` et `handleRegisterAudioControls`**

Dans le corps du composant `SourateInteractiveContent`, ajouter après `const navigateToPartRef = useRef<...>` (ligne ~103) :

```tsx
const audioControlsRef = useRef<AudioControls | null>(null);

const handleRegisterAudioControls = useCallback((controls: AudioControls) => {
  audioControlsRef.current = controls;
}, []);
```

- [ ] **Step 4 : Ajouter la fonction `resetChapterProgress`**

Ajouter après `handleRegisterAudioControls` :

```tsx
const resetChapterProgress = useCallback(async () => {
  audioControlsRef.current?.pause();
  audioControlsRef.current?.resetFinishState();

  if (!db || !userId) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;

  const progressRef = collection(
    db,
    `artifacts/${projectId}/users/${userId}/progress`,
  );
  const q = query(progressRef, where("chapterId", "==", chapterId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}, [userId, chapterId]);
```

- [ ] **Step 5 : Dériver `completedAudioPartsCount`**

Ajouter après la ligne `const canGoNext = ...` (ligne ~354) :

```tsx
const completedAudioPartsCount = audioParts.filter(
  (p) => p.id !== "remaining-verses" && completedPartIds.has(p.id),
).length;
```

- [ ] **Step 6 : Ajouter le bouton reset dans la barre de navigation du header**

Dans le JSX, trouver le `<div className="flex flex-col items-center text-center">` (le bloc "Nom du chapitre centré"). Ajouter le bouton reset à la fin de ce div, après le bloc `{chapterTranslation && ...}` :

```tsx
{/* Bouton reset progression */}
{completedAudioPartsCount >= 1 && (
  <ResetProgressDialog
    chapterName={chapterName || `Sourate ${chapterNumber}`}
    onConfirm={resetChapterProgress}
    trigger={
      <button
        title="Réinitialiser la progression"
        className="mt-0.5 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    }
  />
)}
```

- [ ] **Step 7 : Passer `onRegisterAudioControls` à `AudioVerseHighlighter`**

Dans le JSX, trouver `<AudioVerseHighlighter` et ajouter la prop après `onAtTopChange={setIsVerseContainerAtTop}` :

```tsx
onRegisterAudioControls={handleRegisterAudioControls}
```

- [ ] **Step 8 : Vérifier le typage**

```bash
cd "E:/Cortex/tafsir-app" && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 9 : Commit**

```bash
cd "E:/Cortex/tafsir-app" && git add src/app/sourates/[id]/SourateInteractiveContent.tsx && git commit -m "feat: add chapter progress reset to chapter page header"
```

---

## Task 5 : Modifier `SouratesClient` — reset + bouton sur les cartes

**Files:**
- Modify: `src/app/sourates/SouratesClient.tsx`

- [ ] **Step 1 : Mettre à jour les imports Firestore**

Remplacer la ligne d'imports Firestore existante dans `SouratesClient.tsx` :

```tsx
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
```

- [ ] **Step 2 : Ajouter les imports manquants**

Dans le bloc d'imports lucide-react existant, ajouter `RotateCcw` :

```tsx
import { AudioLines, RotateCcw, Search, Heart } from "lucide-react";
```

Ajouter l'import de `ResetProgressDialog` après les imports existants :

```tsx
import ResetProgressDialog from "@/components/ResetProgressDialog";
```

- [ ] **Step 3 : Ajouter la fonction `resetChapterProgress`**

Dans le corps du composant `SouratesClient`, ajouter après `toggleFavorite` (vers la ligne 260) :

```tsx
const resetChapterProgress = async (targetChapterId: number) => {
  if (!db || !userId) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;

  const progressRef = collection(
    db,
    `artifacts/${projectId}/users/${userId}/progress`,
  );
  const q = query(progressRef, where("chapterId", "==", targetChapterId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
};
```

- [ ] **Step 4 : Ajouter le bouton reset sur les cartes**

Dans le JSX de la carte (`motion.li`), après le bouton favori (le `<button onClick={(e) => toggleFavorite(...)}>`), ajouter :

```tsx
{/* Bouton reset progression */}
{completedParts >= 1 && (
  <ResetProgressDialog
    chapterName={chapter.transliteration}
    onConfirm={() => resetChapterProgress(chapter.id)}
    trigger={
      <button
        onClick={(e) => e.stopPropagation()}
        title="Réinitialiser la progression"
        className={`absolute top-0 left-2 z-20 p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
          isFullyCompleted
            ? "text-white hover:text-red-200"
            : "text-gray-400 hover:text-red-500"
        }`}
      >
        <RotateCcw size={16} />
      </button>
    }
  />
)}
```

- [ ] **Step 5 : Vérifier le typage**

```bash
cd "E:/Cortex/tafsir-app" && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
cd "E:/Cortex/tafsir-app" && git add src/app/sourates/SouratesClient.tsx && git commit -m "feat: add chapter progress reset to chapter list cards"
```

---

## Task 6 : Vérification manuelle finale

- [ ] **Step 1 : Démarrer le serveur de développement**

```bash
cd "E:/Cortex/tafsir-app" && pnpm dev
```

- [ ] **Step 2 : Tester depuis la liste des chapitres**

1. Ouvrir `http://localhost:3000/sourates`
2. Naviguer vers un chapitre avec audio, écouter une partie jusqu'à la fin
3. Revenir à la liste — vérifier que l'icône `RotateCcw` apparaît en haut à gauche de la carte
4. Cliquer l'icône — l'AlertDialog doit s'ouvrir avec le nom du chapitre
5. Cliquer "Annuler" — dialog se ferme, progression inchangée
6. Rouvrir le dialog, cliquer "Réinitialiser" — la barre de progression revient à 0%, l'icône reset disparaît

- [ ] **Step 3 : Tester depuis la page du chapitre**

1. Naviguer vers un chapitre avec progression (au moins une partie complétée)
2. Vérifier que l'icône `RotateCcw` apparaît dans la barre de navigation du header
3. Si l'audio joue, cliquer l'icône — l'audio doit se mettre en pause automatiquement à la confirmation
4. Confirmer le reset — la pastille "Partie complétée" doit repasser à "Partie non complétée"
5. Réécouter la partie jusqu'à la fin — vérifier que `finishHandledRef` est bien réinitialisé : la partie doit se re-compléter normalement (pastille verte + SuccessCard si c'est la dernière partie)

- [ ] **Step 4 : Vérifier le build de production**

```bash
cd "E:/Cortex/tafsir-app" && pnpm build
```

Attendu : build sans erreurs.

- [ ] **Step 5 : Commit final**

```bash
cd "E:/Cortex/tafsir-app" && git add -A && git commit -m "chore: verify reset chapter progress feature complete"
```
