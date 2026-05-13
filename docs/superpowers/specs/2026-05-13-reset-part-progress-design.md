# Réinitialisation de la progression par partie

**Date** : 2026-05-13  
**Statut** : Approuvé

## Contexte

Le reset chapitre entier existe déjà. Cette spec ajoute la granularité **par partie** : l'utilisateur peut réinitialiser une seule partie complétée pour la réviser, sans toucher aux autres parties du chapitre.

## Fonctionnalité

- **Pastille "Partie complétée"** : long-press (600ms) → `ResetProgressDialog` pour la partie en cours
- **SelectItem des parties complétées** : long-press (600ms) → `ResetProgressDialog` pour cette partie spécifique
- **Hint** : texte `"↓ Maintenir pour réviser"` sous la pastille + `"⟳ Maintenir"` dans le SelectItem
- **Feedback visuel** : anneau SVG progressif autour de la pastille, assombrissement du fond dans le SelectItem

## Hook `useLongPress`

**`src/hooks/useLongPress.ts`**

```ts
useLongPress(callback: () => void, duration = 600): {
  handlers: {
    onMouseDown, onMouseUp, onMouseLeave,
    onContextMenu, onTouchStart, onTouchEnd, onTouchCancel
  };
  pressing: boolean;
  progress: number; // 0–100, animé via requestAnimationFrame
}
```

- `progress` monte de 0 à 100 sur `duration` ms via `requestAnimationFrame`
- Relâcher avant la fin annule sans déclencher le callback
- `onContextMenu` bloque le menu natif mobile pendant le hold

## Composant `LongPressPartBadge`

**`src/components/LongPressPartBadge.tsx`**

Remplace la pastille statique actuelle ("Partie complétée" / "Partie non complétée") dans `SourateInteractiveContent`.

Props :
```ts
{
  isCompleted: boolean;
  partName: string;
  onReset: () => void;
}
```

- Quand `isCompleted === false` : affiche "Partie non complétée" (identique à l'état actuel, pas de long-press)
- Quand `isCompleted === true` :
  - Badge vert "Partie complétée" avec anneau SVG overlay animé pendant le hold
  - Hint `"↓ Maintenir pour réviser"` en dessous (`text-xs text-gray-400`)
  - Long-press → ouvre `ResetProgressDialog` avec `name={partName}`

## SelectItem custom pour parties complétées

Dans `SourateInteractiveContent`, les `SelectItem` des parties complétées sont remplacés par une version qui applique `useLongPress` sur un wrapper `div`.

- `onMouseDown` / `onTouchStart` démarre le timer
- Au déclenchement : `e.preventDefault()` pour bloquer la sélection Radix + ouvre `ResetProgressDialog`
- Hint visible sur l'item : `"⟳ Maintenir"` en `text-xs text-gray-400` à droite du ✓

**Attention** : Radix Select intercepte les événements. Le long-press doit être appliqué via un `div` wrapper dans le `SelectItem` avec `onPointerDown`/`onPointerUp` plutôt que `onMouseDown` pour compatibilité Radix.

## Logique `resetPartProgress`

**Dans `SourateInteractiveContent.tsx`**

```ts
const resetPartProgress = useCallback(async (partId: string) => {
  const isCurrentPart = selectedPart?.id === partId;
  if (isCurrentPart) {
    audioControlsRef.current?.pause();
    audioControlsRef.current?.resetFinishState();
  }
  if (!db || !userId) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;
  await deleteDoc(
    doc(db, `artifacts/${projectId}/users/${userId}/progress/${partId}`)
  );
}, [selectedPart, userId]);
```

Un seul `deleteDoc` — pas de query nécessaire, le `partId` est l'ID du document.

## Mise à jour `ResetProgressDialog`

Renommer la prop `chapterName` → `name` pour usage générique (chapitre ET partie). Mettre à jour les deux callsites (`SouratesClient` et `SourateInteractiveContent`).

## Flux de données

1. User maintient sur pastille/SelectItem → `useLongPress.progress` monte → feedback visuel
2. 600ms atteints → `ResetProgressDialog` s'ouvre avec `name={partName}`
3. Confirmation → `resetPartProgress(partId)` exécuté
4. `onSnapshot` réagit → `completedPartIds` perd ce `partId` → badge repasse à "non complétée", SelectItem perd son ✓

## Ce qui ne change pas

- La logique de complétion automatique (fin audio) est inchangée
- Le reset chapitre entier reste disponible dans le header
- Les favoris ne sont pas affectés
