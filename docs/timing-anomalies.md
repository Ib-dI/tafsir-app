# Timings invalides dans `audios.ts`

Genere par `tools/normalize-timing-gaps.mjs` (mode dry-run). Ces entrees ont
`endTime < startTime` (duree negative) et n'ont pas ete touchees par la
normalisation des ecarts (0.01s). A corriger manuellement dans
`versets-split`.

`mot #N` = index du mot dans le tableau `words` du verset (0-indexe).

Depuis le 2026-09-17, `endTime === startTime` (largeur nulle exacte) n'est
plus liste ici : c'est desormais le marqueur intentionnel pose par
`skipWord()` cote versets-split pour un mot non prononce dans l'instance de
recitation (voir sa note plus bas) — le detecteur ne le signale plus comme
anomalie. Les cas negatifs (`<`) ci-dessous restent de vraies erreurs.

| # | Niveau | Chapitre | Partie | Verset | Mot | start | end |
|---|--------|----------|--------|--------|-----|-------|-----|
| 1 | mot | 2 | al-baqarah-4 | 37 | #2 | 1065.77 | 1065.59 |
| 2 | mot | 2 | al-baqarah-8 | 67 | #16 | 901.25 | 901.13 |
| 3 | mot | 2 | al-baqarah-11 | 102 | #61 | 846.62 | 846.16 |
| 4 | mot | 2 | al-baqarah-11 | 102 | #71 | 867.57 | 867.29 |
| 5 | mot | 2 | al-baqarah-11 | 103 | #7 | 888.88 | 888.77 |
| 6 | verset | 15 | al-hijr-3 | 64 | — | 596.58 | 596.56 |
| 7 | mot | 59 | al-hashr-2 | 17 | #3 | 936.21 | 936.19 |
| 8 | mot | 67 | al-mulk-2 | 23 | #11 | 558.64 | 514.16 |

Chapitre 2, al-baqarah-2, verset 19, mot #9 corrigé le 2026-09-14 (n'apparaît plus).
Chapitre 107, al-maun-1, verset 3, mot #2 : introduit le 2026-09-14 lors de la correction du chevauchement du même chapitre, corrigé le jour même (n'apparaît plus).
Chapitre 87, al-ala-1, verset 1, mot #1 corrigé le 2026-09-16 (re-marquage manuel, n'apparaît plus).
Chapitre 77, al-mursalat-1, verset 3, mot #1 corrigé le 2026-09-16 (mot fantôme à durée nulle, jamais prononcé dans l'audio — entrée retirée plutôt que remarquée, n'apparaît plus).
Chapitre 85, al-buruj-1, verset 5, mot #2 corrigé le 2026-09-16 lors de la correction du chevauchement du même chapitre (n'apparaît plus).
Chapitre 68, al-qalam-1, verset 32, mots #6 à #9 corrigés le 2026-09-16 : mots fantômes jamais cités dans l'audio, entrées retirées, `endTime` du verset ramené à la fin du dernier vrai mot (1975.38, n'apparaît plus).
Chapitre 73, al-muzzammil-1, verset 6, mot #3 corrigé le 2026-09-16 : saut de mot lors du premier passage (occurrence 0 à durée nulle), le mot est bien cité plus loin dans le verset (3 occurrences valides restantes) — occurrence fantôme retirée (n'apparaît plus).
Chapitre 92, al-layl-1, verset 11, mots #2 à #4 corrigés le 2026-09-16 : le récitateur s'est arrêté après 2 mots pour reprendre le verset 10, mots fantômes forcés par l'ancienne limite de versets-split (impossible de terminer un verset sans marquer tous ses mots) — les 4 entrées fantômes retirées (dont le mot #5, `endTime` auto-calé sur la fin du verset par le même mécanisme), `endTime` du verset ramené à la fin du dernier vrai mot (346.53). Le verset 11 est correctement redit en entier juste après (occurrence suivante).
Chapitre 73, al-muzzammil-1, verset 6, mot #3 : le chevauchement du même chapitre corrigé le 2026-09-17 a réintroduit une occurrence fantôme à durée négative (654.32-654.31, même mot sauté qu'au 2026-09-16) — retirée à nouveau (n'apparaît plus).
Chapitre 59, al-hashr-2, verset 17, mot #8 (947.54-947.54) reclassifié le 2026-09-17 : plus une anomalie, le detecteur reconnaît désormais la largeur nulle exacte comme marqueur intentionnel de mot non prononcé (voir plus haut) — retiré du tableau sans modification de la donnée.

Suite à ces cas récurrents (chap 77, 92, 68, 73), versets-split a gagné le
2026-09-17 un bouton/raccourci dédié « Mot non prononcé » (`k`,
`skipWord()`) qui pose directement un marqueur à largeur nulle propre
(calé sur la fin du mot précédent, jamais sur l'instant de lecture) au lieu
de forcer un faux timestamp — plus besoin de ce nettoyage manuel pour les
futurs marquages. Le détecteur ne signale plus ces largeurs nulles exactes
comme anomalies (voir l'intro de ce document).

## A part : versets sans mot correspondant a leur fin

27 versets ont un `endTime` qui ne correspond a aucun mot de leur propre
tableau `words` (silence en fin de verset, deja present avant toute
normalisation — pas une erreur introduite par le script). Liste complete
disponible via le script (comparaison verse.endTime / dernier mot).

## Occurrences du meme mot qui se chevauchent (551 cas, 2026-09-14)

Detecte par `tools/normalize-timing-gaps.mjs` (section dediee du rapport,
pas touchee par `--apply` — lecture seule). Motif : l'occurrence 0 (la
principale) d'un mot englobe une autre occurrence du meme mot dont la FIN
coincide exactement avec la sienne (ex: principale 269.2-277.73, occurrence
273.41-277.73 — la seconde est entierement contenue dans la premiere).

Suspecte : un bug/mauvaise config de versets-split actif sur une periode
donnee plutot qu'une erreur aleatoire — repartition tres inegale entre
chapitres :

| Chapitre(s) | Occurrences |
|---|---|
| 2 (al-baqarah) | 103 |
| 58 (al-mujadila) | 32 |
| 59-79 (plage continue) | ~250 au total (34, 24, 22, 21, 20, 19x2, 18, 17, 16x2, 12x2, 11, 8, 7x2...) |
| 80-99, 104, 112 | 1 a 5 chacun |

Cas le plus severe trouve manuellement : **chapitre 58, al-mujadila-2,
verset 13, mot #6** (0-indexe — "mot 7" cote UI) — principale
1208.51-1269.58 (61s !) englobant DEUX occurrences distinctes
(1235.83-1240.65 et 1250.26-1269.58), dont une seule partage la fin de la
principale (l'autre a sa propre fin independante — rompt le motif habituel
"fin identique"). Cause probable du bug visuel signale sur ce mot pendant
la lecture (le mot reste actif bien plus longtemps qu'il ne devrait).

Aucune correction automatique possible sans reecoute audio (impossible de
deviner la bonne valeur depuis les chiffres seuls). Liste complete
reproductible via `node tools/normalize-timing-gaps.mjs` (dry-run).

Fixes preventifs appliques cote versets-split (2026-09-14, voir son
CONTEXT.md) : `markWord` ecrasait silencieusement la fin d'un mot deja
ferme via "Terminer ce mot" ; `#shrinkLastWordEndIfNeeded` ratait le cas
d'egalite exacte (`<` au lieu de `<=`) ; nouveau mecanisme pour resserrer
la fin d'un mot termine si une occurrence est ajoutee au meme instant
juste apres. Corrige la recurrence de ce motif pour les futurs marquages,
mais ne repare pas les 551 entrees historiques.
