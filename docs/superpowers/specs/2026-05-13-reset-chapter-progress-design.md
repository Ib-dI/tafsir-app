# Reset de la progression d'un chapitre

**Date** : 2026-05-13  
**Statut** : Approuvé (post-grill)

## Contexte

Un chapitre est "complètement terminé" quand toutes ses parties audio ont été écoutées jusqu'à la fin. Ce statut est stocké dans Firestore sous `artifacts/${projectId}/users/${userId}/progress/`. Une fois terminé, le chapitre affiche un style visuel vert (emerald) dans la liste.

L'utilisateur veut pouvoir réinitialiser ce statut pour réviser un chapitre, que ce soit partiellement ou entièrement complété.

## Fonctionnalité

Permettre à l'utilisateur de réinitialiser la progression d'un chapitre **dès qu'au moins une partie est complétée** (`completedParts >= 1`), avec confirmation obligatoire, depuis deux endroits : la liste des chapitres et la page du chapitre.

## Condition d'affichage du bouton reset

`completedParts >= 1` — au moins une partie audio complétée pour ce chapitre.  
Cela couvre les chapitres partiellement complétés ET les chapitres entièrement terminés.

## Visuel du bouton

Icône seule `RotateCcw` (Lucide) + `title="Réinitialiser la progression"` pour l'accessibilité. Pas de label texte dans les deux endroits pour ne pas surcharger l'UI.

## Architecture

### Nouveau composant

**`src/components/ResetProgressDialog.tsx`**  
Composant `AlertDialog` shadcn encapsulant la confirmation. Reçoit :
- `chapterName` : nom du chapitre pour personnaliser le message
- `onConfirm` : callback exécuté à la confirmation
- `trigger` : élément React affiché comme déclencheur

Contenu du dialog :
- Titre : "Réinitialiser la progression ?"
- Description : "Toute la progression du chapitre [chapterName] sera effacée. Vous pourrez recommencer depuis le début."
- Bouton "Annuler" (variante ghost/gris)
- Bouton "Réinitialiser" (variante destructive/rouge)

### Prérequis shadcn

Installer `AlertDialog` qui n'est pas encore dans le projet :
```bash
npx shadcn@latest add alert-dialog
```

### Extension de `AudioVerseHighlighter` — `onRegisterAudioControls`

Nouveau prop sur AVH suivant le pattern `onNavigateToPart` existant :

```ts
onRegisterAudioControls?: (controls: {
  pause: () => void;
  resetFinishState: () => void;
}) => void;
```

- `pause` : appelle `wavesurferRef.current?.pause()`
- `resetFinishState` : fait `finishHandledRef.current = false` + `setHasAudioFinished(false)`

Le parent `SourateInteractiveContent` stocke ce contrôle dans un ref `audioControlsRef`.

### Logique de réinitialisation

```ts
const resetChapterProgress = async (targetChapterId: number) => {
  // 1. Couper l'audio et réinitialiser l'état finish (page chapitre uniquement)
  audioControlsRef.current?.pause();
  audioControlsRef.current?.resetFinishState();

  // 2. Supprimer les docs Firestore
  if (!db || !userId) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;
  const progressRef = collection(db, `artifacts/${projectId}/users/${userId}/progress`);
  const q = query(progressRef, where("chapterId", "==", targetChapterId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
};
```

Dans `SouratesClient`, pas d'`audioControlsRef` (pas de lecteur audio) — on supprime directement les docs Firestore.

### Fichiers modifiés

**`src/components/AudioVerseHighlighter.tsx`**
- Ajouter prop `onRegisterAudioControls`
- Exposer `{ pause, resetFinishState }` au parent via `useEffect`

**`src/components/ResetProgressDialog.tsx`** _(nouveau)_
- `AlertDialog` shadcn avec trigger, titre, description, boutons Annuler/Réinitialiser

**`src/app/sourates/SouratesClient.tsx`**
- Ajouter `resetChapterProgress(chapterId)` (query Firestore + deleteDoc)
- Ajouter imports : `getDocs`, `query`, `where` depuis `firebase/firestore`
- Sur chaque carte avec `completedParts >= 1` : bouton `RotateCcw` en **haut à gauche**, `event.stopPropagation()`

**`src/app/sourates/[id]/SourateInteractiveContent.tsx`**
- Ajouter `audioControlsRef` + `resetChapterProgress`
- Ajouter imports : `getDocs`, `query` depuis `firebase/firestore`
- Dériver `completedAudioPartsCount` : `audioParts.filter(p => p.id !== "remaining-verses" && completedPartIds.has(p.id)).length`
- Afficher bouton `RotateCcw` dans la **barre de navigation du header** quand `completedAudioPartsCount >= 1`

## Flux de données

1. User clique `RotateCcw` → `ResetProgressDialog` s'ouvre
2. User confirme → `resetChapterProgress(chapterId)` s'exécute
3. _(page chapitre uniquement)_ Audio mis en pause + `finishHandledRef` remis à `false`
4. Firestore supprime tous les docs `progress` du chapitre pour cet utilisateur
5. `onSnapshot` existant réagit → `completedPartIds` revient à `Set()` vide
6. UI se met à jour : carte perd son style vert, bouton reset disparaît, le user peut re-compléter normalement

## Ce qui ne change pas

- La logique de marquage automatique à la fin de l'audio reste identique
- Le `SuccessCard` reste inchangé (`closeOverlay` remet déjà `hasAudioFinished` à `false`)
- Les favoris ne sont pas affectés
- La progression localStorage (`PROGRESS_KEY`) n'est pas effacée lors du reset (expire après 24h)
- Les parties `remaining-verses` (sans audio) ne sont jamais dans Firestore et sont exclues du calcul
