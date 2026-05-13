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

Dans `SourateInteractiveContent`, les `SelectItem` des parties complétées sont **entièrement remplacés** par un `div` personnalisé directement dans `SelectContent`. Le `SelectItem` Radix est retiré pour les parties complétées car il intercepte `onPointerDown` et sélectionne l'item avant que le long-press puisse être détecté. Les parties non complétées conservent le `SelectItem` standard.

Structure du `div` personnalisé :
- Stylé pour imiter l'apparence d'un `SelectItem` (même padding, hover, cursor, focus visible)
- `onClick` → `handlePartChange(index)` (navigation normale)
- `useLongPress` via `onPointerDown` / `onPointerUp` → ouvre `ResetProgressDialog`
- Fond s'assombrit pendant le hold (via `pressing` state du hook : `bg-green-200` quand pressing)
- Hint : `"⟳ Maintenir"` en `text-xs text-gray-400` à droite du ✓

## Long-press dans HeaderRight (mobile)

Dans la modal de sélection des parties de `HeaderRight`, les boutons des parties complétées supportent également le long-press.

**Modifications de `HeaderRight.tsx`** :
- Import `useLongPress` et `ResetProgressDialog`
- Nouvelle prop : `onResetPart?: (partId: string) => void` dans `HeaderRightProps`
- État local : `dialogPart: { id: string; name: string } | null`

Sur les boutons de parties complétées dans la liste de la modal :
- `useLongPress` appliqué sur le bouton
- Long-press → `setDialogPart({ id: part.id, name: part.title || \`Partie ${idx + 1}\` })`
- Un seul `ResetProgressDialog` contrôlé rendu en dehors de la liste :
  - `open={dialogPart !== null}`
  - `onOpenChange={(o) => { if (!o) setDialogPart(null); }}`
  - `name={dialogPart?.name ?? ""}`
  - `onConfirm={() => { if (dialogPart) { onResetPart?.(dialogPart.id); setDialogPart(null); } }}`
- Feedback visuel : `pressing` assombrit le fond du bouton en cours de long-press
- Hint : `"⟳ Maintenir"` affiché à droite du ✓ pour les parties complétées

**`SourateInteractiveContent`** : passe `onResetPart={resetPartProgress}` à `HeaderRight`.

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

Renommer la prop `chapterName` → `name` pour usage générique (chapitre ET partie).

Ajouter un **mode contrôlé** optionnel pour les callsites qui ne peuvent pas passer un trigger (ex. HeaderRight) :
```ts
interface ResetProgressDialogProps {
  name: string;
  onConfirm: () => void;
  trigger?: ReactNode;       // optionnel en mode contrôlé
  open?: boolean;            // contrôlé de l'extérieur si fourni
  onOpenChange?: (open: boolean) => void;
}
```
- Quand `open` est fourni : le composant utilise `open`/`onOpenChange` directement, le `trigger` n'est pas rendu
- Quand `open` n'est pas fourni : comportement actuel (trigger + state interne)

Mettre à jour les callsites : `SouratesClient` et `SourateInteractiveContent` (reset chapitre — utilisent le mode trigger).

## Flux de données

1. User maintient sur pastille/SelectItem → `useLongPress.progress` monte → feedback visuel
2. 600ms atteints → `ResetProgressDialog` s'ouvre avec `name={partName}`
3. Confirmation → `resetPartProgress(partId)` exécuté
4. `onSnapshot` réagit → `completedPartIds` perd ce `partId` → badge repasse à "non complétée", SelectItem perd son ✓

## Ce qui ne change pas

- La logique de complétion automatique (fin audio) est inchangée
- Le reset chapitre entier reste disponible dans le header
- Les favoris ne sont pas affectés
