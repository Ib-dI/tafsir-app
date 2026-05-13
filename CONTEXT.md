# Contexte du domaine — tafsir-app

## Glossaire

### Chapitre (Chapter)
Une sourate du Coran, identifiée par son `chapterId` (1–114). Un chapitre peut avoir zéro ou plusieurs parties audio.

### Partie (Part)
Segment audio d'un chapitre, identifié par un `partId` unique. Une partie sans URL audio est dite "sans audio" (ex : `remaining-verses`). Seules les parties avec URL audio participent au calcul de complétion et de réinitialisation.

### Progression complétée (Completed Part)
Une partie est "complétée" quand son audio a été écouté jusqu'à la fin. Stockée dans Firestore sous `progress/${partId}` avec `chapterId` et `completedAt`.

### Chapitre avec progression (Chapter with Progress)
Un chapitre dont au moins une partie audio est complétée (`completedParts >= 1`). Le bouton de réinitialisation est visible dès cet état, que le chapitre soit partiellement ou entièrement terminé.

### Chapitre terminé (Fully Completed Chapter)
Un chapitre dont toutes les parties audio sont complétées (`completedParts === totalAudioParts`). Affiché avec le style visuel vert (emerald) dans la liste.

### Réinitialisation chapitre (Chapter Reset)
Action qui supprime tous les documents `progress` d'un chapitre pour un utilisateur donné. Disponible dès `completedParts >= 1`. Requiert une confirmation explicite. Coupe l'audio en cours et remet `finishHandledRef` à `false` pour permettre une re-complétion normale.

### Réinitialisation par partie (Per-Part Reset)
Action qui supprime un seul document `progress/${partId}`. Déclenché par long-press (600ms) sur la pastille "Partie complétée" ou sur une partie complétée dans le sélecteur mobile (HeaderRight). Ouvre `ResetProgressDialog` avec le nom de la partie. Si la partie en cours est réinitialisée, coupe l'audio et remet `finishHandledRef` à `false`.

### Long-press
Maintien de 600ms sur un élément interactif. Implémenté via le hook `useLongPress` (`src/hooks/useLongPress.ts`) avec `requestAnimationFrame` pour l'animation de progression (0→100). Relâcher avant la fin annule sans déclencher le callback. Feedback visuel : anneau SVG sur la pastille, assombrissement du bouton dans les sélecteurs.

### SelectItem personnalisé (Custom SelectItem)
Pour les parties complétées dans le Select desktop (`SelectContent`), le `SelectItem` Radix est **entièrement remplacé** par un `div` personnalisé. Nécessaire car Radix UI intercepte `onPointerDown` et sélectionne l'item avant qu'un long-press puisse être détecté. Les parties non complétées conservent le `SelectItem` standard.
