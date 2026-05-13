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

### Réinitialisation (Reset)
Action qui supprime tous les documents `progress` d'un chapitre pour un utilisateur donné. Disponible dès `completedParts >= 1`. Requiert une confirmation explicite (AlertDialog). Coupe l'audio en cours et remet `finishHandledRef` à `false` pour permettre une re-complétion normale.
