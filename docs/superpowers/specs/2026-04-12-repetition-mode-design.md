# Mode Répétition Guidée — Design Spec

**Date:** 2026-04-12  
**Statut:** Approuvé  

---

## Contexte

L'application est un lecteur audio de tafsir coranique (Next.js 16, React 19, WaveSurfer.js, Firebase). Chaque sourate dispose de segments audio découpés par verset, avec des timings précis. L'objectif de ce mode est d'aider l'utilisateur à ancrer sa compréhension en répétant un verset (audio + texte arabe + traduction française) un nombre de fois choisi, sur une plage de versets sélectionnée.

---

## Fonctionnalité

**Mode Répétition Guidée** : l'utilisateur sélectionne une plage de versets par appui long + glissement, choisit un nombre de répétitions, puis lance une lecture en boucle de chaque verset de la plage.

---

## Architecture

### Composants modifiés

**`SourateInteractiveContent`**  
Nouveau state :
```ts
selectionMode: boolean           // liste en mode sélection
selectedRange: { start: number; end: number } | null  // plage par verse id
repetitionCount: number          // défaut : 3, plage : 1–10
repetitionActive: boolean        // répétition en cours
```

**`VerseItem`**  
Nouvelles props :
- `isSelected: boolean` — verset dans la plage sélectionnée (surlignage coloré)
- `isRangeStart / isRangeEnd: boolean` — extrémités de la plage
- `onLongPress: () => void` — déclenche l'entrée en mode sélection
- `repetitionProgress?: { current: number; total: number }` — affiche "Répétition 2/3" sous le verset actif

**`AudioVerseHighlighter`**  
Nouvelle prop optionnelle :
```ts
repetitionMode?: {
  range: { start: number; end: number };
  count: number;
  onComplete: () => void;
}
```
Quand définie, remplace la logique d'avancement normal par la machine d'états de répétition (voir ci-dessous).

### Nouveau composant

**`RepetitionBar`**  
Barre flottante positionnée en bas de page (`fixed bottom`). Apparaît quand `selectedRange !== null`.

États :
1. **Configuration** : affiche "Versets X à Y", spinner +/- pour N, bouton "Lancer", icône ✕
2. **En cours** : affiche "Verset Z/total", bouton "Arrêter"

### Nouveau hook

**`useRepetitionPlayer`** (interne à `AudioVerseHighlighter`)  
Encapsule la machine d'états de répétition, isolée du flux de lecture normale.

---

## Flux d'interaction

1. **Appui long (500ms)** sur un `VerseItem` → `selectionMode = true`, `selectedRange = { start: id, end: id }`, feedback vibration si disponible
2. **Glissement vertical** (touch `touchmove` sur mobile, `mousemove` sur desktop) → mise à jour de `selectedRange.end` en temps réel, label flottant "Versets X → Y". La plage est toujours normalisée : `start = min(initial, current)`, `end = max(initial, current)` — l'utilisateur peut donc glisser vers le haut ou vers le bas.
3. **`RepetitionBar` apparaît** → l'utilisateur règle N (défaut 3), appuie sur "Lancer"
4. `repetitionActive = true`, `AudioVerseHighlighter` reçoit `repetitionMode`
5. **Boucle par verset** :
   - Le segment audio est joué
   - Texte arabe + traduction française mis en évidence (comportement existant)
   - Indicateur "Répétition K/N" affiché sous le verset
   - À la fin du segment : si `currentRepeat < N` → seek au `startTime` du verset ; sinon → verset suivant, `currentRepeat = 0`
6. **Fin de plage** → `onComplete()` appelé → `repetitionActive = false`, `RepetitionBar` disparaît, lecture normale reprend

---

## Logique de seek

WaveSurfer expose `wavesurfer.seekTo(ratio)` où `ratio = startTime / duration`.  
Le `startTime` de chaque verset est disponible dans le tableau `timings` de l'audio part courant (`TafsirAudioTiming.startTime`).

---

## Gestion des cas limites

- **Verset sans timing** : si un verset de la plage n'a pas de segment dans le part audio courant, il est sauté silencieusement.
- **Changement de part** : si la plage chevauche plusieurs audio parts, seul le part courant est utilisé ; les versets hors-part sont ignorés.
- **Appui "Arrêter"** : `repetitionActive = false` immédiatement, l'audio s'arrête, la sélection est conservée (l'utilisateur peut relancer ou annuler).
- **Navigation** : quitter la page ou changer de part annule le mode répétition.

---

## Ce qui ne change pas

- Aucune nouvelle route ou page
- Aucun appel Firebase supplémentaire
- Aucune nouvelle dépendance npm
- La progression Firestore existante n'est pas écrite pendant le mode répétition (les versets répétés ne comptent pas comme "écoutés" au sens de la progression)

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/app/sourates/[id]/SourateInteractiveContent.tsx` | Nouveau state, handlers long press / glissement, passage de props |
| `src/components/VerseItem.tsx` | Props `isSelected`, `onLongPress`, `repetitionProgress` |
| `src/components/AudioVerseHighlighter.tsx` | Prop `repetitionMode`, hook `useRepetitionPlayer` |
| `src/components/RepetitionBar.tsx` | Nouveau composant (créer) |
| `src/types/types.ts` | Nouveaux types : `RepetitionMode`, `SelectedRange` |
