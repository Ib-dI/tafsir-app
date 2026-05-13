# Reset de la progression d'un chapitre terminé

**Date** : 2026-05-13  
**Statut** : Approuvé

## Contexte

Un chapitre est "complètement terminé" quand toutes ses parties audio ont été écoutées jusqu'à la fin. Ce statut est stocké dans Firestore sous `artifacts/${projectId}/users/${userId}/progress/`. Une fois terminé, le chapitre affiche un style visuel vert (emerald) dans la liste.

L'utilisateur veut pouvoir réinitialiser ce statut pour réviser un chapitre depuis zéro, tout en gardant la garantie que la complétion est permanente tant qu'il ne choisit pas explicitement de réinitialiser.

## Fonctionnalité

Permettre à l'utilisateur de réinitialiser la progression d'un chapitre complètement terminé, avec confirmation obligatoire, depuis deux endroits : la liste des chapitres et la page du chapitre.

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

### Logique de réinitialisation

```ts
const resetChapterProgress = async (targetChapterId: number) => {
  if (!db || !userId) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;
  const progressRef = collection(db, `artifacts/${projectId}/users/${userId}/progress`);
  const q = query(progressRef, where("chapterId", "==", targetChapterId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
};
```

### Fichiers modifiés

**`src/app/sourates/SouratesClient.tsx`**
- Ajouter `resetChapterProgress` (identique à ci-dessus, `userId` et `db` déjà disponibles)
- Ajouter imports : `getDocs`, `deleteDoc`, `query`, `where` depuis `firebase/firestore`
- Sur chaque carte `isFullyCompleted` : ajouter un bouton trigger `RotateCcw` (Lucide) en haut à gauche, à côté du bouton favori
- Le trigger doit appeler `event.stopPropagation()` pour ne pas naviguer vers le chapitre

**`src/app/sourates/[id]/SourateInteractiveContent.tsx`**
- Ajouter `resetChapterProgress` (même logique, `userId` et `db` déjà disponibles)
- Ajouter imports : `getDocs`, `deleteDoc` depuis `firebase/firestore`
- Dériver `isChapterFullyCompleted` : `audioParts.filter(p => p.id !== "remaining-verses").every(p => completedPartIds.has(p.id))`
- Afficher un bouton "Réinitialiser la progression" avec icône `RotateCcw` uniquement quand `isChapterFullyCompleted === true`, dans la zone de la pastille de complétion

## Flux de données

1. User clique le bouton `RotateCcw` → `ResetProgressDialog` s'ouvre (AlertDialog)
2. User clique "Réinitialiser" → `resetChapterProgress(chapterId)` s'exécute
3. Firestore supprime tous les documents `progress` du chapitre pour cet utilisateur
4. Le `onSnapshot` existant réagit automatiquement → `completedPartIds` revient à `Set()` vide
5. `isFullyCompleted` repasse à `false` → la carte perd son style vert, le bouton reset disparaît

Aucun state supplémentaire n'est nécessaire — la réactivité est gérée par les listeners Firestore déjà en place.

## Ce qui ne change pas

- La logique de marquage automatique à la fin de l'audio reste identique
- Le `SuccessCard` qui s'affiche à la fin d'un chapitre reste inchangé
- Les favoris ne sont pas affectés par la réinitialisation
- La progression localStorage (`PROGRESS_KEY`) n'est pas effacée lors du reset (elle expire après 24h naturellement)
