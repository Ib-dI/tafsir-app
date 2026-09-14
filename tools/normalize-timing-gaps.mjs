#!/usr/bin/env node
// Ecarte de GAP secondes les frontieres mot/mot et verset/verset qui se
// touchent exactement (endTime[i] === startTime[i+1]) dans audios.ts, en
// raccourcissant l'endTime du segment precedent. startTime n'est jamais
// modifie. Idempotent : ne touche que les paires encore a ecart zero exact,
// donc rejouable sans risque au fur et a mesure que de nouveaux versets
// marques a l'ancienne (chainage a zero) sont colles dans le fichier.
//
// Usage:
//   node tools/normalize-timing-gaps.mjs            # dry-run, affiche le rapport
//   node tools/normalize-timing-gaps.mjs --apply     # ecrit le fichier

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GAP = 0.01;
const FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "lib",
  "data",
  "audios.ts",
);

function round2(n) {
  return Math.round(n * 100) / 100;
}

function loadData(source) {
  const js = source.replace(/^export /gm, "").replace(/:\s*number\[\]/g, "");
  // eslint-disable-next-line no-eval
  return eval(`(function(){ ${js}\n return { audiosTafsir }; })()`);
}

function flatten(audiosTafsir) {
  const nodes = [];
  const skipped = [];

  for (const chapter of audiosTafsir) {
    for (const part of chapter.parts || []) {
      const timings = part.timings || [];
      for (let j = 0; j < timings.length; j++) {
        const verse = timings[j];
        const next = timings[j + 1];
        const loc = { chapter: chapter.id, part: part.id, verse: verse.id };
        let newEnd = null;

        if (verse.endTime <= verse.startTime) {
          skipped.push({
            level: "verse",
            ...loc,
            start: verse.startTime,
            end: verse.endTime,
            reason: "duree deja invalide (endTime <= startTime)",
          });
        } else if (next && next.startTime === verse.endTime) {
          const candidate = round2(verse.endTime - GAP);
          if (candidate > verse.startTime) {
            newEnd = candidate;
          } else {
            skipped.push({
              level: "verse",
              ...loc,
              start: verse.startTime,
              end: verse.endTime,
              reason: "duree trop courte pour un ecart de 0.01s",
            });
          }
        }

        nodes.push({
          type: "verse",
          startTime: verse.startTime,
          endTime: verse.endTime,
          newEnd,
        });

        const words = verse.words;
        if (!words) continue;

        // Le dernier mot prononce d'un verset se termine exactement quand le
        // verset se termine (meme instant, pas deux frontieres qui se
        // touchent). Si le verset est raccourci ci-dessus, l'occurrence de
        // mot qui portait l'ancien endTime doit suivre la meme nouvelle
        // valeur, sinon le mot deborde du verset.
        const verseWordNodes = [];

        for (let w = 0; w < words.length; w++) {
          const curWord = words[w];
          const nextWord = w + 1 < words.length ? words[w + 1] : null;

          for (const occ of curWord) {
            let wordNewEnd = null;

            if (occ.endTime <= occ.startTime) {
              skipped.push({
                level: "word",
                ...loc,
                wordIndex: w,
                start: occ.startTime,
                end: occ.endTime,
                reason: "duree deja invalide (endTime <= startTime)",
              });
            } else if (nextWord && nextWord.some((o) => o.startTime === occ.endTime)) {
              const candidate = round2(occ.endTime - GAP);
              if (candidate > occ.startTime) {
                wordNewEnd = candidate;
              } else {
                skipped.push({
                  level: "word",
                  ...loc,
                  wordIndex: w,
                  start: occ.startTime,
                  end: occ.endTime,
                  reason: "duree trop courte pour un ecart de 0.01s",
                });
              }
            }

            verseWordNodes.push({
              type: "word",
              startTime: occ.startTime,
              endTime: occ.endTime,
              newEnd: wordNewEnd,
            });
          }
        }

        if (newEnd != null) {
          for (const wordNode of verseWordNodes) {
            if (wordNode.endTime !== verse.endTime) continue;
            if (newEnd > wordNode.startTime) {
              wordNode.newEnd = newEnd;
            } else {
              wordNode.newEnd = null;
              skipped.push({
                level: "word",
                ...loc,
                start: wordNode.startTime,
                end: wordNode.endTime,
                reason: "ancre du verset mais duree trop courte pour suivre le raccourcissement du verset",
              });
            }
          }
        }

        nodes.push(...verseWordNodes);
      }
    }
  }

  return { nodes, skipped };
}

function applyToSource(source, nodes) {
  // Groupes separes pour ne reecrire que la valeur numerique de endTime et
  // preserver exactement le texte original (espaces, retours a la ligne).
  const pattern = /(startTime:\s*)(-?\d+(?:\.\d+)?)(\s*,\s*endTime:\s*)(-?\d+(?:\.\d+)?)/g;
  let idx = 0;
  let appliedCount = 0;

  const newSource = source.replace(pattern, (full, startPrefix, startStr, sep, endStr) => {
    const node = nodes[idx];
    if (!node) {
      throw new Error(`Plus de correspondances dans le texte que de noeuds analyses (index ${idx})`);
    }
    const startVal = Number(startStr);
    const endVal = Number(endStr);
    if (startVal !== node.startTime || endVal !== node.endTime) {
      throw new Error(
        `Desaccord a l'index ${idx}: texte=(${startVal}, ${endVal}) vs arbre=(${node.startTime}, ${node.endTime})`,
      );
    }
    idx++;

    if (node.newEnd == null) return full;
    appliedCount++;
    return `${startPrefix}${startStr}${sep}${String(node.newEnd)}`;
  });

  if (idx !== nodes.length) {
    throw new Error(`Moins de correspondances dans le texte (${idx}) que de noeuds analyses (${nodes.length})`);
  }

  return { newSource, appliedCount };
}

function main() {
  const apply = process.argv.includes("--apply");
  const source = fs.readFileSync(FILE, "utf8");
  const { audiosTafsir } = loadData(source);
  const { nodes, skipped } = flatten(audiosTafsir);
  const { newSource, appliedCount } = applyToSource(source, nodes);

  const verseShrinks = nodes.filter((n) => n.type === "verse" && n.newEnd != null).length;
  const wordShrinks = nodes.filter((n) => n.type === "word" && n.newEnd != null).length;

  console.log(`Noeuds analyses: ${nodes.length}`);
  console.log(`Ecarts a appliquer: ${appliedCount} (${verseShrinks} versets, ${wordShrinks} mots)`);
  console.log(`Entrees ignorees (deja invalides ou trop courtes): ${skipped.length}`);

  if (skipped.length) {
    console.log("\nEntrees a corriger manuellement dans versets-split:");
    for (const s of skipped) {
      const where =
        s.level === "verse"
          ? `chapitre ${s.chapter}, ${s.part}, verset ${s.verse}`
          : `chapitre ${s.chapter}, ${s.part}, verset ${s.verse}, mot #${s.wordIndex}`;
      console.log(`  - [${s.level}] ${where}: start=${s.start} end=${s.end} (${s.reason})`);
    }
  }

  if (!apply) {
    console.log("\nDry-run (aucune ecriture). Relance avec --apply pour ecrire le fichier.");
    return;
  }

  if (appliedCount === 0) {
    console.log("\nRien a ecrire (aucun ecart a appliquer).");
    return;
  }

  fs.writeFileSync(FILE, newSource, "utf8");
  console.log(`\nFichier ecrit: ${FILE}`);
}

main();
