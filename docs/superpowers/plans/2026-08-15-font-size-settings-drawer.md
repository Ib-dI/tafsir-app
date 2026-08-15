# Réglages taille du texte arabe + vitesse de lecture (drawer) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> **Ne pas implémenter avant confirmation explicite de l'utilisateur** — ce plan a été écrit pendant que d'autres modifications étaient en cours sur le repo (`SouratesClient.tsx`, `SourateInteractiveContent.tsx` modifiés non commités, `src/lib/chapterProgress.ts` non suivi au moment de l'écriture). Vérifier `git status` avant de commencer et resynchroniser le plan si ces fichiers ont bougé entre-temps.

**Goal:** Ajouter un drawer de réglages (inspiré du `SettingsDrawer` / `QuranFontSection` / `dls/Counter` de quran.com — style épuré, lignes `label ↔ compteur −/valeur/+`) permettant de régler la taille du texte arabe (5 paliers) et la vitesse de lecture (1/1.25/1.5/1.75/2), en remplacement du bouton `SpeedControl` actuel. Pas de sélecteur de police (une seule police Uthmani pour l'instant) — IndoPak et QCF (rendu par page façon Mushaf) sont hors périmètre, l'app affichant les versets en liste continue et non en pages paginées.

**Architecture:**
- Taille de texte : un `FontSettingsProvider` (React Context, `"use client"`) posé dans `layout.tsx`, persisté en `localStorage`. Il n'expose pas la taille via re-render des `VerseItem` — il pousse directement 2 CSS custom properties sur `document.documentElement` (mobile/desktop), consommées par une classe utilitaire `.verse-arabic-text` ajoutée dans `globals.css`. `VerseItem.tsx` et `OverlayVerses.tsx` n'ont donc pas besoin de lire le Context : ils portent juste la classe CSS, ce qui évite un re-render de toute la liste de versets à chaque changement de palier.
- Vitesse de lecture : reste portée par le hook `useAudioPlayback` existant (déjà dans `AudioVerseHighlighter.tsx`), passée en props au nouveau `SettingsDrawer` — pas de Context nécessaire, elle n'est utilisée qu'à cet endroit.
- UI : composant shadcn `sheet` (Radix, accessible), responsive — `side="bottom"` sur mobile (coins arrondis en haut) / `side="right"` sur desktop, via le hook `useMediaQuery` déjà présent dans le repo (`isMobile` calculé de la même façon qu'en ligne 51 de `AudioVerseHighlighter.tsx`).
- Un composant `Counter` réutilisable (`src/components/ui/counter.tsx`) reproduit le style de `dls/Counter` de quran.com : boutons ronds "fantôme" (`variant="ghost"`, `rounded-full`) Minus/Plus de part et d'autre d'une valeur, désactivés aux bornes. Utilisé pour les deux réglages (taille + vitesse) — pas de code couleur (on abandonne le style badge coloré actuel de `SpeedControl.tsx`).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (`sheet`, `button`), Lucide React (`Settings`, `Minus`, `Plus`), React Context + `localStorage`.

**Référence externe :** structure inspirée de `quran/quran.com-frontend-next` — `src/components/Navbar/SettingsDrawer/{SettingsDrawer,QuranFontSection}.tsx` et `src/components/dls/Counter/Counter.tsx` (consultés en lecture seule sur GitHub, non copiés — juste le pattern visuel/structurel).

---

## Fichiers touchés

| Action | Fichier |
|--------|---------|
| Installer | `src/components/ui/sheet.tsx` (via shadcn CLI) |
| Créer | `src/context/FontSettingsContext.tsx` |
| Créer | `src/components/ui/counter.tsx` |
| Créer | `src/components/SettingsDrawer.tsx` |
| Modifier | `src/app/layout.tsx` — monter `FontSettingsProvider` |
| Modifier | `src/app/globals.css` — classe `.verse-arabic-text` |
| Modifier | `src/components/VerseItem.tsx` — utiliser `.verse-arabic-text` |
| Modifier | `src/components/OverlayVerses.tsx` — utiliser `.verse-arabic-text` |
| Modifier | `src/components/AudioVerseHighlighter.tsx` — remplacer `SpeedControl` par `SettingsDrawer` |
| Supprimer | `src/components/SpeedControl.tsx` (devient mort après le remplacement) |

---

## Task 1 : Installer le composant shadcn `sheet`

**Files:**
- Install: `src/components/ui/sheet.tsx`

- [x] **Step 1 : Installer via shadcn**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx shadcn@latest add sheet
```

- [x] **Step 2 : Vérifier le fichier créé et son API**

```bash
cat /Users/ibrahim/Documents/Projets/tafsir-app/src/components/ui/sheet.tsx
```

Confirmer que `SheetContent` accepte bien une prop `side` (`"top" | "right" | "bottom" | "left"`) et que `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle` sont exportés. Adapter les noms dans les tasks suivantes si l'API générée diffère.

- [x] **Step 3 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/components/ui/sheet.tsx && git commit -m "feat: install shadcn sheet component"
```

---

## Task 2 : Créer `FontSettingsContext`

**Files:**
- Create: `src/context/FontSettingsContext.tsx`

- [x] **Step 1 : Créer le fichier**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Paliers de taille du texte arabe, en px. Index 2 = valeur actuelle (par défaut).
export const FONT_SCALE_STEPS_MOBILE = [19, 21, 23.5, 26, 29] as const;
export const FONT_SCALE_STEPS_DESKTOP = [25, 27, 30, 33, 37] as const;
export const DEFAULT_FONT_SCALE_INDEX = 2;

const STORAGE_KEY = "tafsir:fontScaleIndex";

interface FontSettingsContextValue {
  fontScaleIndex: number;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
}

const FontSettingsContext = createContext<FontSettingsContextValue | null>(null);

export function FontSettingsProvider({ children }: { children: ReactNode }) {
  const [fontScaleIndex, setFontScaleIndex] = useState(DEFAULT_FONT_SCALE_INDEX);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return;
    const parsed = Number(stored);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS_MOBILE.length) {
      setFontScaleIndex(parsed);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(fontScaleIndex));
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-mobile",
      `${FONT_SCALE_STEPS_MOBILE[fontScaleIndex]}px`,
    );
    document.documentElement.style.setProperty(
      "--verse-arabic-font-size-desktop",
      `${FONT_SCALE_STEPS_DESKTOP[fontScaleIndex]}px`,
    );
  }, [fontScaleIndex]);

  const increaseFontScale = () =>
    setFontScaleIndex((i) => Math.min(i + 1, FONT_SCALE_STEPS_MOBILE.length - 1));
  const decreaseFontScale = () => setFontScaleIndex((i) => Math.max(i - 1, 0));

  return (
    <FontSettingsContext.Provider
      value={{ fontScaleIndex, increaseFontScale, decreaseFontScale }}
    >
      {children}
    </FontSettingsContext.Provider>
  );
}

export function useFontSettings() {
  const ctx = useContext(FontSettingsContext);
  if (!ctx) {
    throw new Error("useFontSettings must be used within a FontSettingsProvider");
  }
  return ctx;
}
```

- [x] **Step 2 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 3 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/context/FontSettingsContext.tsx && git commit -m "feat: add FontSettingsContext for Arabic text scale"
```

---

## Task 3 : Monter le Provider et ajouter la classe CSS `.verse-arabic-text`

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [x] **Step 1 : Importer et monter `FontSettingsProvider` dans `layout.tsx`**

Ajouter l'import en haut de `src/app/layout.tsx` :

```tsx
import { FontSettingsProvider } from "@/context/FontSettingsContext";
```

Envelopper `<Header />` et le `<Suspense>` existants (le Provider ne rend pas de DOM, juste un Fragment interne — n'affecte pas le layout flex du `<div>` parent) :

```tsx
<FontSettingsProvider>
  <Header />
  <Suspense
    fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner
          size="xl"
          color="blue"
          text="Chargement du contenu..."
          className="gap-4"
        />
      </div>
    }
  >
    {children}
  </Suspense>
</FontSettingsProvider>
```

- [x] **Step 2 : Ajouter la classe `.verse-arabic-text` dans `globals.css`**

Ajouter après le bloc `@theme { ... }` (après la ligne `}` qui suit `--font-quran-common: QuranCommon;`, avant `@theme inline {`) :

```css
.verse-arabic-text {
  font-size: var(--verse-arabic-font-size-mobile, 23.5px);
}

@media (min-width: 768px) {
  .verse-arabic-text {
    font-size: var(--verse-arabic-font-size-desktop, 30px);
  }
}
```

Les valeurs `23.5px` / `30px` sont les fallbacks (= taille actuelle) utilisés avant que le `useEffect` du Provider ne s'exécute côté client.

- [x] **Step 3 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 4 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/app/layout.tsx src/app/globals.css && git commit -m "feat: mount FontSettingsProvider and add verse-arabic-text CSS scale"
```

---

## Task 4 : Appliquer `.verse-arabic-text` dans `VerseItem.tsx` et `OverlayVerses.tsx`

**Files:**
- Modify: `src/components/VerseItem.tsx`
- Modify: `src/components/OverlayVerses.tsx`

- [x] **Step 1 : `VerseItem.tsx` ligne 90**

Remplacer :

```tsx
className="font-uthmanic mt-2 flex items-center text-right text-[23.5px] leading-relaxed text-gray-800 md:gap-1 md:text-3xl"
```

par :

```tsx
className="font-uthmanic verse-arabic-text mt-2 flex items-center text-right leading-relaxed text-gray-800 md:gap-1"
```

(Les classes `text-[23.5px]` et `md:text-3xl` sont retirées — la taille vient désormais de `.verse-arabic-text`.)

- [x] **Step 2 : `OverlayVerses.tsx` ligne 54**

Remplacer :

```tsx
className="font-uthmanic flex items-center gap-1 text-right text-[24px] leading-relaxed text-gray-800 md:text-3xl"
```

par :

```tsx
className="font-uthmanic verse-arabic-text flex items-center gap-1 text-right leading-relaxed text-gray-800"
```

Note : l'overlay utilisait `24px` sur mobile (vs `23.5px` dans `VerseItem`) — après ce changement les deux partagent exactement la même taille pilotée par le même réglage, ce qui est l'effet recherché (c'est le même verset, juste affiché en agrandi).

- [x] **Step 3 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 4 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/components/VerseItem.tsx src/components/OverlayVerses.tsx && git commit -m "feat: drive Arabic verse text size from font settings scale"
```

---

## Task 5 : Créer le composant `Counter`

**Files:**
- Create: `src/components/ui/counter.tsx`

- [x] **Step 1 : Créer le fichier**

```tsx
"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CounterProps {
  value: string | number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  className?: string;
}

export function Counter({ value, onIncrement, onDecrement, className }: CounterProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} data-testid="counter">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        disabled={!onDecrement}
        onClick={onDecrement}
        aria-label="Diminuer"
      >
        <Minus className="size-4" />
      </Button>
      <span className="w-8 text-center text-sm font-medium tabular-nums text-gray-700">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        disabled={!onIncrement}
        onClick={onIncrement}
        aria-label="Augmenter"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
```

- [x] **Step 2 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 3 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/components/ui/counter.tsx && git commit -m "feat: add reusable Counter UI primitive"
```

---

## Task 6 : Créer `SettingsDrawer`

**Files:**
- Create: `src/components/SettingsDrawer.tsx`

- [x] **Step 1 : Créer le fichier**

```tsx
"use client";

import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Counter } from "@/components/ui/counter";
import { useFontSettings, FONT_SCALE_STEPS_MOBILE } from "@/context/FontSettingsContext";
import { useMediaQuery } from "./UseMediaQuery";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

interface SettingsDrawerProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export default function SettingsDrawer({
  playbackRate,
  onPlaybackRateChange,
}: SettingsDrawerProps) {
  const { fontScaleIndex, increaseFontScale, decreaseFontScale } = useFontSettings();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const speedIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
  const canDecreaseSpeed = speedIndex > 0;
  const canIncreaseSpeed = speedIndex !== -1 && speedIndex < SPEEDS.length - 1;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Réglages"
          aria-label="Réglages"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Settings className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "rounded-t-2xl" : undefined}
      >
        <SheetHeader>
          <SheetTitle>Réglages</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-4">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-gray-700">Taille du texte</span>
            <Counter
              value={fontScaleIndex + 1}
              onDecrement={fontScaleIndex === 0 ? undefined : decreaseFontScale}
              onIncrement={
                fontScaleIndex === FONT_SCALE_STEPS_MOBILE.length - 1
                  ? undefined
                  : increaseFontScale
              }
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-gray-700">Vitesse de lecture</span>
            <Counter
              value={`x${playbackRate}`}
              onDecrement={
                canDecreaseSpeed
                  ? () => onPlaybackRateChange(SPEEDS[speedIndex - 1])
                  : undefined
              }
              onIncrement={
                canIncreaseSpeed
                  ? () => onPlaybackRateChange(SPEEDS[speedIndex + 1])
                  : undefined
              }
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Note : si `speedIndex` vaut `-1` (valeur de `playbackRate` hors du tableau `SPEEDS`, cas normalement impossible avec l'usage actuel), les deux boutons sont désactivés par sécurité plutôt que de planter.

- [x] **Step 2 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 3 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/components/SettingsDrawer.tsx && git commit -m "feat: add SettingsDrawer with text size and playback speed controls"
```

---

## Task 7 : Remplacer `SpeedControl` par `SettingsDrawer` dans `AudioVerseHighlighter`

**Files:**
- Modify: `src/components/AudioVerseHighlighter.tsx`
- Delete: `src/components/SpeedControl.tsx`

- [x] **Step 1 : Remplacer l'import**

Dans `src/components/AudioVerseHighlighter.tsx` ligne 11, remplacer :

```tsx
import SpeedControl from "./SpeedControl";
```

par :

```tsx
import SettingsDrawer from "./SettingsDrawer";
```

- [x] **Step 2 : Remplacer l'usage (lignes ~400-403)**

Remplacer :

```tsx
<SpeedControl
  playbackRate={audioPlayback.playbackRate}
  onChange={audioPlayback.setPlaybackRate}
/>
```

par :

```tsx
<SettingsDrawer
  playbackRate={audioPlayback.playbackRate}
  onPlaybackRateChange={audioPlayback.setPlaybackRate}
/>
```

- [x] **Step 3 : Supprimer le fichier `SpeedControl.tsx` devenu mort**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git rm src/components/SpeedControl.tsx
```

(Vérifier avant suppression qu'aucune autre référence n'est apparue entre-temps : `grep -rln "SpeedControl" src`.)

- [x] **Step 4 : Vérifier le typage**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && npx tsc --noEmit 2>&1 | head -20
```

- [x] **Step 5 : Commit**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add src/components/AudioVerseHighlighter.tsx && git commit -m "feat: replace SpeedControl button with SettingsDrawer trigger"
```

---

## Task 8 : Vérification manuelle finale

- [x] **Step 1 : Démarrer le serveur de dev**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && pnpm dev
```

- [x] **Step 2 : Tester le drawer sur une page de sourate avec audio**

1. Ouvrir une sourate ayant de l'audio (ex: `http://localhost:3000/sourates/1`)
2. Vérifier que l'icône engrenage apparaît à l'emplacement exact où était le bouton de vitesse (à droite, à côté du temps écoulé)
3. Cliquer l'icône — le drawer doit s'ouvrir : bottom-sheet (coins arrondis en haut) en largeur mobile, panneau latéral en largeur desktop (redimensionner la fenêtre pour vérifier les deux)
4. Vérifier les 2 lignes : "Taille du texte" et "Vitesse de lecture", chacune avec les boutons − / valeur / +

- [x] **Step 3 : Tester le réglage de taille**

1. Cliquer "+" sur "Taille du texte" plusieurs fois — le texte arabe affiché dans la liste des versets doit grossir en temps réel, y compris pendant que le drawer est ouvert
2. Vérifier que le bouton "+" se désactive au 5e palier, "−" au 1er
3. Rafraîchir la page (F5) — vérifier que le palier choisi est bien conservé (persistance `localStorage`)
4. Si un verset est assez long pour déclencher l'overlay (`OverlayVerses`), vérifier qu'il affiche la même taille que la liste

- [x] **Step 4 : Tester le réglage de vitesse**

1. Cliquer "+"/"−" sur "Vitesse de lecture" — vérifier que l'audio change effectivement de vitesse (à l'oreille) et que la valeur affichée (`x1.25`, `x1.5`, etc.) est cohérente
2. Vérifier la désactivation aux bornes (x1 et x2)

- [x] **Step 5 : Vérifier le build de production**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && pnpm build
```

Attendu : build sans erreurs.

- [x] **Step 6 : Commit final**

```bash
cd /Users/ibrahim/Documents/Projets/tafsir-app && git add -A && git commit -m "chore: verify font size and playback speed settings drawer complete"
```

---

## Hors périmètre (reporté, documenté pour référence future)

- **Sélecteur de police (Uthmani / IndoPak / Tajweed)** : reporté. Nécessite une seconde source de texte arabe (le texte actuel vient du package npm `quran-json@3.1.2` via `src/lib/quranSimpleApi.ts`, qui ne fournit qu'un seul script Uthmani-simple) — pas seulement une police. Fichier `public/fonts/indopak.woff2` déjà présent mais jamais câblé (pas de `@font-face`).
- **QCF paginé (glyphes par mot/page façon Mushaf imprimé, comme `QuranFont.MadaniV1/V2/QPCHafs` sur quran.com)** : reporté. Nécessite un rendu par page de Mushaf (604 pages) — incompatible avec le layout actuel en liste continue (`VerseItem.tsx` dans un scroll infini). Sur quran.com, même le mode IndoPak est pagé (réglage `mushafLines` 15/16 lignes) — donc à traiter dans le même chantier que le QCF le jour où l'app passera à un rendu paginé.
