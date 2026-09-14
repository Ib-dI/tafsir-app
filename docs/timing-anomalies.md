# Timings invalides dans `audios.ts`

Genere par `tools/normalize-timing-gaps.mjs` (mode dry-run). Ces entrees ont
`endTime <= startTime` (duree nulle ou negative) et n'ont pas ete touchees
par la normalisation des ecarts (0.01s). A corriger manuellement dans
`versets-split`.

`mot #N` = index du mot dans le tableau `words` du verset (0-indexe).

| # | Niveau | Chapitre | Partie | Verset | Mot | start | end |
|---|--------|----------|--------|--------|-----|-------|-----|
| 1 | mot | 2 | al-baqarah-2 | 19 | #9 | 330.18 | 309.77 |
| 2 | mot | 2 | al-baqarah-4 | 37 | #2 | 1065.77 | 1065.59 |
| 3 | mot | 2 | al-baqarah-8 | 67 | #16 | 901.25 | 901.13 |
| 4 | mot | 2 | al-baqarah-11 | 102 | #61 | 846.62 | 846.16 |
| 5 | mot | 2 | al-baqarah-11 | 102 | #71 | 867.57 | 867.29 |
| 6 | mot | 2 | al-baqarah-11 | 103 | #7 | 888.88 | 888.77 |
| 7 | verset | 15 | al-hijr-3 | 64 | — | 596.58 | 596.56 |
| 8 | mot | 59 | al-hashr-2 | 17 | #3 | 936.21 | 936.19 |
| 9 | mot | 59 | al-hashr-2 | 17 | #8 | 947.54 | 947.54 |
| 10 | mot | 67 | al-mulk-2 | 23 | #11 | 558.64 | 514.16 |
| 11 | mot | 68 | al-qalam-1 | 32 | #6 | 1975.39 | 1975.39 |
| 12 | mot | 68 | al-qalam-1 | 32 | #7 | 1975.39 | 1975.39 |
| 13 | mot | 68 | al-qalam-1 | 32 | #8 | 1975.39 | 1975.39 |
| 14 | mot | 68 | al-qalam-1 | 32 | #9 | 1975.39 | 1975.39 |
| 15 | mot | 73 | al-muzzammil-1 | 6 | #3 | 654.9 | 654.9 |
| 16 | mot | 77 | al-mursalat-1 | 3 | #1 | 252.05 | 252.05 |
| 17 | mot | 85 | al-buruj-1 | 5 | #2 | 139.11 | 133.4 |
| 18 | mot | 87 | al-ala-1 | 1 | #1 | 61.7 | 61.59 |
| 19 | mot | 92 | al-layl-1 | 11 | #2 | 346.54 | 346.54 |
| 20 | mot | 92 | al-layl-1 | 11 | #3 | 346.54 | 346.54 |
| 21 | mot | 92 | al-layl-1 | 11 | #4 | 346.54 | 346.54 |

## A part : versets sans mot correspondant a leur fin

27 versets ont un `endTime` qui ne correspond a aucun mot de leur propre
tableau `words` (silence en fin de verset, deja present avant toute
normalisation — pas une erreur introduite par le script). Liste complete
disponible via le script (comparaison verse.endTime / dernier mot).
