# Reset Part Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add long-press (600ms) on completed-part badges and part-selectors to let users reset a single part's progress without touching the rest of the chapter.

**Architecture:** A `useLongPress` hook drives visual feedback (progress 0→100 via RAF) and fires a callback at 600ms. A `LongPressPartBadge` wraps the existing completion badge. Completed parts in the desktop Select are replaced by plain `div` elements (Radix `SelectItem` intercepts `pointerdown` before long-press can fire). `HeaderRight`'s modal part list buttons also gain long-press. All paths open a shared `ResetProgressDialog` (updated to support both trigger-based and controlled modes) and then call `resetPartProgress(partId)`.

**Tech Stack:** Next.js App Router, TypeScript, React, Firebase Firestore (`deleteDoc`), Framer Motion, Radix UI Select, Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useLongPress.ts` | RAF-animated long-press hook |
| Create | `src/components/LongPressPartBadge.tsx` | Completion badge with long-press reset |
| Modify | `src/components/ResetProgressDialog.tsx` | Rename prop + add controlled mode |
| Modify | `src/types/types.ts` | Add `onResetPart` to `HeaderRightProps` |
| Modify | `src/app/sourates/[id]/SourateInteractiveContent.tsx` | `resetPartProgress` + badge swap + custom div in Select + pass prop to HeaderRight |
| Modify | `src/components/HeaderRight.tsx` | Long-press on completed part buttons in modal |
| Modify | `src/app/sourates/SouratesClient.tsx` | Rename `chapterName` → `name` prop |

---

## Task 1: `useLongPress` hook

**Files:**
- Create: `src/hooks/useLongPress.ts`

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/useLongPress.ts
import { useCallback, useRef, useState } from "react";

export function useLongPress(callback: () => void, duration = 600) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setPressing(true);
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!activeRef.current) return;
      const elapsed = now - (startRef.current ?? now);
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
      cleanup();
      setPressing(false);
      setProgress(0);
      callback();
    }, duration);
  }, [callback, cleanup, duration]);

  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    cleanup();
    setPressing(false);
    setProgress(0);
  }, [cleanup]);

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); start(); },
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
    pressing,
    progress,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors about `src/hooks/useLongPress.ts`.

---

## Task 2: Update `ResetProgressDialog` — rename prop + controlled mode

**Files:**
- Modify: `src/components/ResetProgressDialog.tsx:8-18`

The current component has a `chapterName: string` prop and no controlled mode. We rename it to `name` and add optional `open`/`onOpenChange` props so HeaderRight can control the dialog without a trigger element.

- [ ] **Step 1: Update the interface and component signature**

Replace the existing interface and function signature (lines 8–18):

```tsx
interface ResetProgressDialogProps {
  name: string;
  onConfirm: () => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ResetProgressDialog({
  name,
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: ResetProgressDialogProps) {
```

- [ ] **Step 2: Switch internal state to respect controlled mode**

Replace the two `useState` declarations and the `clonedTrigger` block (lines 19–36) with:

```tsx
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => onControlledOpenChange?.(v)
    : setInternalOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clonedTrigger =
    !isControlled && React.isValidElement(trigger)
      ? React.cloneElement(
          trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>,
          {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              setOpen(true);
            },
          },
        )
      : trigger;
```

- [ ] **Step 3: Replace `chapterName` with `name` in the dialog body**

Find the paragraph (around line 99):
```tsx
                  La progression de{" "}
                  <span className="font-semibold text-gray-700">{chapterName}</span>{" "}
```

Replace `{chapterName}` with `{name}`.

- [ ] **Step 4: Update the return to conditionally render trigger**

Replace the final return (around line 131):
```tsx
  return (
    <>
      {!isControlled && clonedTrigger}
      {mounted && createPortal(modal, document.body)}
    </>
  );
```

- [ ] **Step 5: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: errors only about callsites still using `chapterName` (fixed in Tasks 3 and 5).

---

## Task 3: Fix `SouratesClient` callsite — rename `chapterName` → `name`

**Files:**
- Modify: `src/app/sourates/SouratesClient.tsx`

- [ ] **Step 1: Find and rename the prop**

Search for `chapterName=` in `SouratesClient.tsx` and change it to `name=`.

```powershell
# Verify the location first
Select-String -Path "src\app\sourates\SouratesClient.tsx" -Pattern "chapterName="
```

Expected output: one match showing the `<ResetProgressDialog chapterName=` line.

- [ ] **Step 2: Make the rename**

Change:
```tsx
<ResetProgressDialog
  chapterName={/* whatever value */}
```
to:
```tsx
<ResetProgressDialog
  name={/* same value */}
```

- [ ] **Step 3: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors about `chapterName` in `SouratesClient.tsx`.

---

## Task 4: `LongPressPartBadge` component

**Files:**
- Create: `src/components/LongPressPartBadge.tsx`

This replaces the static "Partie complétée / Partie non complétée" `<span>` in `SourateInteractiveContent`. When completed, it wraps the badge with long-press handlers and shows a growing `box-shadow` ring (visual feedback) plus a hint text below.

- [ ] **Step 1: Create the component**

```tsx
// src/components/LongPressPartBadge.tsx
"use client";

import { useState } from "react";
import ResetProgressDialog from "./ResetProgressDialog";
import { useLongPress } from "@/hooks/useLongPress";

interface LongPressPartBadgeProps {
  isCompleted: boolean;
  partName: string;
  onReset: () => void;
}

export default function LongPressPartBadge({
  isCompleted,
  partName,
  onReset,
}: LongPressPartBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { handlers, pressing, progress } = useLongPress(() => {
    setDialogOpen(true);
  }, 600);

  if (!isCompleted) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
        <svg
          className="mr-1 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
        Partie non complétée
      </span>
    );
  }

  const shadowSize = pressing ? Math.round(2 + (progress / 100) * 4) : 0;

  return (
    <>
      <div className="flex select-none flex-col items-center gap-1">
        <span
          {...handlers}
          className={`inline-flex cursor-default items-center rounded-full px-3 py-1 text-sm font-medium transition-colors duration-75 ${
            pressing ? "bg-green-200 text-green-900" : "bg-green-100 text-green-800"
          }`}
          style={{
            boxShadow:
              shadowSize > 0
                ? `0 0 0 ${shadowSize}px rgba(34, 197, 94, 0.55)`
                : undefined,
          }}
        >
          <svg
            className="mr-1 h-4 w-4 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Partie complétée
        </span>
        <span className="text-xs text-gray-400">↓ Maintenir pour réviser</span>
      </div>

      <ResetProgressDialog
        name={partName}
        onConfirm={onReset}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

---

## Task 5: `SourateInteractiveContent` — wire everything up

**Files:**
- Modify: `src/app/sourates/[id]/SourateInteractiveContent.tsx`

This task has four parts:
1. Add `resetPartProgress` callback
2. Add `resetDialogPart` state for Select-item long-press
3. Swap the static badge for `LongPressPartBadge`
4. Replace `SelectItem` for completed parts with custom `div`
5. Control `Select` open state so custom divs can close it
6. Pass `onResetPart` to `HeaderRight`
7. Update `chapterName` → `name` in the chapter-reset `ResetProgressDialog`

### Step 1: Add imports

- [ ] At the top of the file, add `LongPressPartBadge` to imports:

```tsx
import LongPressPartBadge from "@/components/LongPressPartBadge";
```

### Step 2: Add `resetPartProgress` and `resetDialogPart` state

- [ ] After the existing `resetChapterProgress` callback (around line 129), add:

```tsx
  const resetPartProgress = useCallback(
    async (partId: string) => {
      const isCurrentPart = selectedPart?.id === partId;
      if (isCurrentPart) {
        audioControlsRef.current?.pause();
        audioControlsRef.current?.resetFinishState();
      }
      if (!db || !userId) return;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) return;
      await deleteDoc(
        doc(db, `artifacts/${projectId}/users/${userId}/progress/${partId}`),
      );
    },
    [selectedPart, userId],
  );

  const [resetDialogPart, setResetDialogPart] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isSelectOpen, setIsSelectOpen] = useState(false);
```

### Step 3: Update the chapter-reset `ResetProgressDialog` callsite

- [ ] Find the `<ResetProgressDialog chapterName=` inside the `{/* Nom du chapitre centré */}` div (around line 532) and rename the prop:

```tsx
<ResetProgressDialog
  name={chapterName || `Sourate ${chapterNumber}`}
  onConfirm={resetChapterProgress}
  trigger={
    <button
      title="Réinitialiser la progression"
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-red-200 hover:text-red-700 active:scale-95"
    >
      <RotateCcw className="h-2.5 w-2.5" />
      <span>Réviser</span>
    </button>
  }
/>
```

### Step 4: Swap static badge for `LongPressPartBadge`

- [ ] Find the `{/* Pastille de complétion */}` block (around line 732). Replace the entire `<span>` block (the conditional spanning from `<span className={...inline-flex...}>` to its closing `</span>`) with:

```tsx
            {selectedPart && selectedPart.id !== "remaining-verses" && (
              <div className="flex w-full items-center justify-center">
                <LongPressPartBadge
                  isCompleted={completedPartIds.has(selectedPart.id)}
                  partName={selectedPart.title || `Partie ${currentPartIndex + 1}`}
                  onReset={() => resetPartProgress(selectedPart.id)}
                />
              </div>
            )}
```

### Step 5: Control the Select open state + replace completed SelectItems with custom divs

- [ ] Find the `<Select` opening tag (around line 622) and add `open`/`onOpenChange`:

```tsx
                <Select
                  value={selectedPart?.id || ""}
                  onValueChange={(value) => {
                    const partIndex = audioParts.findIndex((p) => p.id === value);
                    if (partIndex !== -1) handlePartChange(partIndex);
                  }}
                  open={isSelectOpen}
                  onOpenChange={setIsSelectOpen}
                >
```

- [ ] Inside `SelectContent`, replace the `audioParts.map(...)` return to use a custom `div` for completed non-remaining parts:

```tsx
                  {audioParts.map((part, index) => {
                    const uniqueVerses = new Set(part.timings.map((t) => t.id));
                    const hasMultipleOccurrences =
                      part.timings.length > uniqueVerses.size;
                    const isCompleted =
                      part.id !== "remaining-verses" &&
                      completedPartIds.has(part.id);

                    if (isCompleted) {
                      return (
                        <CompletedSelectItem
                          key={part.id}
                          part={part}
                          index={index}
                          hasMultipleOccurrences={hasMultipleOccurrences}
                          onSelect={() => {
                            handlePartChange(index);
                            setIsSelectOpen(false);
                          }}
                          onResetRequest={() => {
                            setIsSelectOpen(false);
                            setResetDialogPart({
                              id: part.id,
                              name: part.title || `Partie ${index + 1}`,
                            });
                          }}
                        />
                      );
                    }

                    return (
                      <SelectItem
                        key={part.id}
                        value={part.id}
                        className={
                          part.id === "remaining-verses"
                            ? "font-medium text-blue-600"
                            : ""
                        }
                      >
                        <span className="flex items-center gap-2">
                          {part.id === "remaining-verses" ? (
                            <>
                              {part.title} ({part.timings.length})
                              <span className="text-xs text-blue-500">(sans audio)</span>
                            </>
                          ) : (
                            <>
                              {part.title || `Partie ${index + 1}`}
                              {hasMultipleOccurrences && (
                                <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">
                                  +occurrences
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
```

- [ ] Add the `CompletedSelectItem` component as a module-level function **above** `SourateInteractiveContent` (not inside it, to avoid re-creation on every render):

```tsx
// Above the SourateInteractiveContent function export, around line 56 (after buildAudioParts)

interface CompletedSelectItemProps {
  part: TafsirAudioPart;
  index: number;
  hasMultipleOccurrences: boolean;
  onSelect: () => void;
  onResetRequest: () => void;
}

function CompletedSelectItem({
  part,
  index,
  hasMultipleOccurrences,
  onSelect,
  onResetRequest,
}: CompletedSelectItemProps) {
  const firedRef = useRef(false);
  const { handlers, pressing } = useLongPress(() => {
    firedRef.current = true;
    onResetRequest();
  }, 600);

  return (
    <div
      {...handlers}
      onClick={() => {
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        onSelect();
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors ${
        pressing
          ? "bg-green-200"
          : "hover:bg-green-50"
      }`}
    >
      <span className="flex items-center gap-2">
        {part.title || `Partie ${index + 1}`}
        {hasMultipleOccurrences && (
          <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">
            +occurrences
          </span>
        )}
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow">
          <svg width="8" height="8" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 10.5L8.5 14L15 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-xs text-gray-400">⟳ Maintenir</span>
      </span>
    </div>
  );
}
```

- [ ] Add `useRef` to the `SourateInteractiveContent.tsx` imports (it's already imported, but `CompletedSelectItem` also needs `useLongPress`). Add import at the top of the file:

```tsx
import { useLongPress } from "@/hooks/useLongPress";
```

### Step 6: Render the controlled dialog for Select long-press + pass `onResetPart` to HeaderRight

- [ ] After the closing `</Select>` tag (around line 698), add the controlled reset dialog:

```tsx
              {resetDialogPart && (
                <ResetProgressDialog
                  name={resetDialogPart.name}
                  onConfirm={() => resetPartProgress(resetDialogPart.id)}
                  open={true}
                  onOpenChange={(o) => {
                    if (!o) setResetDialogPart(null);
                  }}
                />
              )}
```

- [ ] Find the `<HeaderRight` usage (around line 786) and add the `onResetPart` prop:

```tsx
                  <HeaderRight
                    audioParts={audioParts}
                    currentPartIndex={currentPartIndex}
                    setCurrentPartIndex={handlePartChange}
                    completedPartIds={completedPartIds}
                    colors={headerColors}
                    onNextPart={handleNextPart}
                    onPreviousPart={handlePreviousPart}
                    onResetPart={resetPartProgress}
                  />
```

- [ ] **Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: errors about `onResetPart` not existing in `HeaderRightProps` — this is fixed in the next task.

---

## Task 6: `HeaderRight` — long-press on completed part buttons in modal

**Files:**
- Modify: `src/types/types.ts:81-96` — add `onResetPart` to interface
- Modify: `src/components/HeaderRight.tsx`

### Step 1: Add `onResetPart` to `HeaderRightProps`

- [ ] In `src/types/types.ts`, add `onResetPart` to `HeaderRightProps`:

```ts
export interface HeaderRightProps {
  audioParts: TafsirAudioPart[];
  currentPartIndex: number;
  setCurrentPartIndex: (index: number) => void;
  completedPartIds: Set<string>;
  colors: {
    card: string;
    border: string;
    text: string;
    primary: string;
    textSecondary: string;
    success?: string;
  };
  onNextPart?: () => void;
  onPreviousPart?: () => void;
  onResetPart?: (partId: string) => void;
}
```

### Step 2: Add imports to `HeaderRight.tsx`

- [ ] At the top of `src/components/HeaderRight.tsx`, add:

```tsx
import { useLongPress } from "@/hooks/useLongPress";
import ResetProgressDialog from "./ResetProgressDialog";
import type { TafsirAudioPart } from "@/types/types";
```

### Step 3: Destructure `onResetPart` from props

- [ ] In the `HeaderRight` component function signature (around line 8), add `onResetPart` to destructuring:

```tsx
const HeaderRight: React.FC<HeaderRightProps> = ({
  audioParts,
  currentPartIndex,
  setCurrentPartIndex,
  completedPartIds,
  colors,
  onNextPart,
  onPreviousPart,
  onResetPart,
}) => {
```

### Step 4: Add `dialogPart` state

- [ ] After the existing `useState` declarations (after `isDragging` state, around line 21), add:

```tsx
  const [dialogPart, setDialogPart] = useState<{ id: string; name: string } | null>(null);
```

### Step 5: Replace the completed-part button rows with long-press variants

Inside the modal list (`audioParts.map(...)`, around line 264), replace the existing `<button>` element for completed parts. The map currently renders one `<button>` for all parts. Change it to render a `CompletedPartButton` sub-component for completed parts and the existing `<button>` for others.

- [ ] Add a module-level component **above** `HeaderRight` (not inside it):

```tsx
interface CompletedPartButtonProps {
  part: TafsirAudioPart;
  idx: number;
  isCurrentPart: boolean;
  hasMultipleOccurrences: boolean;
  onSelect: () => void;
  onResetRequest: (id: string, name: string) => void;
}

function CompletedPartButton({
  part,
  idx,
  isCurrentPart,
  hasMultipleOccurrences,
  onSelect,
  onResetRequest,
}: CompletedPartButtonProps) {
  const firedRef = useRef(false);
  const { handlers, pressing } = useLongPress(() => {
    firedRef.current = true;
    onResetRequest(part.id, part.title || `Partie ${idx + 1}`);
  }, 600);

  return (
    <button
      key={part.id}
      data-part-index={idx}
      {...handlers}
      onClick={() => {
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        onSelect();
      }}
      className={`w-full py-4 px-6 flex flex-row items-center transition-all duration-200 ${
        pressing ? "bg-green-100" : isCurrentPart
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : "bg-white hover:bg-gray-50 border-l-4 border-l-transparent"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        isCurrentPart ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
      }`}>
        {idx + 1}
      </div>
      <div className="flex-1 ml-4 text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-medium ${isCurrentPart ? "text-blue-700" : "text-gray-800"}`}>
            {part.id === "remaining-verses"
              ? `${part.title} (${part.timings.length})`
              : part.title || `Partie ${idx + 1}`}
          </span>
          {hasMultipleOccurrences && part.id !== "remaining-verses" && (
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
              +occurrences
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center" aria-label="Partie complétée">
          <Check size={12} className="text-green-600" strokeWidth={2.5} />
        </div>
        <span className="text-xs text-gray-400">⟳ Maintenir</span>
        {isCurrentPart && (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-label="Partie actuelle" />
        )}
      </div>
    </button>
  );
}
```

- [ ] Inside `HeaderRight`'s modal list, update `audioParts.map(...)` to branch on `isCompleted`:

```tsx
              {audioParts.map((part, idx) => {
                const uniqueVerses = new Set(part.timings.map(t => t.id));
                const totalOccurrences = part.timings.length;
                const hasMultipleOccurrences = totalOccurrences > uniqueVerses.size;
                const isCompleted = completedPartIds.has(part.id) && part.id !== "remaining-verses";
                const isCurrentPart = idx === currentPartIndex;

                if (isCompleted) {
                  return (
                    <CompletedPartButton
                      key={part.id}
                      part={part}
                      idx={idx}
                      isCurrentPart={isCurrentPart}
                      hasMultipleOccurrences={hasMultipleOccurrences}
                      onSelect={() => handlePartSelection(idx)}
                      onResetRequest={(id, name) => {
                        setIsPartSelectorVisible(false);
                        setDialogPart({ id, name });
                      }}
                    />
                  );
                }

                return (
                  <button
                    key={part && part.id ? String(part.id) : String(idx)}
                    data-part-index={idx}
                    onClick={() => handlePartSelection(idx)}
                    className={`w-full py-4 px-6 flex flex-row items-center transition-all duration-200 ${
                      isCurrentPart
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                    } ${idx !== audioParts.length - 1 ? 'border-b border-gray-100' : ''}`}
                    aria-label={`Sélectionner ${part.title}`}
                    aria-current={isCurrentPart ? 'page' : undefined}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCurrentPart ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 ml-4 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${isCurrentPart ? 'text-blue-700' : 'text-gray-800'}`}>
                          {part.id === "remaining-verses" ? (
                            <>{part.title} ({part.timings.length})</>
                          ) : (
                            part.title || `Partie ${idx + 1}`
                          )}
                        </span>
                        {hasMultipleOccurrences && part.id !== "remaining-verses" && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium" aria-label="Contient des occurrences multiples">
                            +occurrences
                          </span>
                        )}
                      </div>
                      {part.id === "remaining-verses" && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium" aria-label="Partie sans audio">
                          sans audio
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isCurrentPart && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-label="Partie actuelle" />
                      )}
                    </div>
                  </button>
                );
              })}
```

### Step 6: Render the controlled dialog + add `useRef` import

- [ ] Add `useRef` to the React import at the top of `HeaderRight.tsx` (it currently imports `useState`, `useEffect`, `useRef` — check and add if missing).

- [ ] After the `{/* Modal de sélection */}` block's closing `</div>` (end of modal), add the controlled `ResetProgressDialog`:

```tsx
      {dialogPart && (
        <ResetProgressDialog
          name={dialogPart.name}
          onConfirm={() => {
            onResetPart?.(dialogPart.id);
            setDialogPart(null);
          }}
          open={true}
          onOpenChange={(o) => {
            if (!o) setDialogPart(null);
          }}
        />
      )}
```

### Step 7: Verify TypeScript compiles

- [ ] Run:

```powershell
npx tsc --noEmit
```

Expected: no errors.

---

## Task 7: Integration verification

- [ ] **Start the dev server**

```powershell
npm run dev
```

- [ ] **Navigate to a chapter with multiple parts** (e.g., `/sourates/26` — Ash-Shu'ara has many parts based on recent commits).

- [ ] **Complete a part** — listen to one audio track to completion so it gets the green ✓.

- [ ] **Test: pastille long-press**
  - On the completed part, hold the green "Partie complétée" badge for 600ms
  - Expected: badge darkens + growing green ring during hold → `ResetProgressDialog` opens with the part name
  - Click "Réinitialiser" → badge changes to "Partie non complétée"
  - Expected: hint "↓ Maintenir pour réviser" is visible on the completed badge, absent on the uncompleted badge

- [ ] **Test: quick tap on badge**
  - Quick-click the completed badge
  - Expected: nothing happens (no dialog opens)

- [ ] **Test: Select dropdown (desktop)**
  - Open the part selector dropdown
  - Expected: completed parts show `⟳ Maintenir` hint
  - Hold 600ms on a completed part
  - Expected: dropdown closes, `ResetProgressDialog` opens → confirm → part loses ✓ in dropdown

- [ ] **Test: HeaderRight modal (mobile, < 768px viewport)**
  - Resize browser to mobile width
  - Open the part selector via the `List` button
  - Expected: completed parts show `⟳ Maintenir` hint
  - Hold 600ms on a completed part button
  - Expected: modal closes, `ResetProgressDialog` opens → confirm → part loses ✓ badge

- [ ] **Test: chapter-reset still works**
  - Complete multiple parts, use the "Réviser" button in the header
  - Expected: all parts reset, dialog opens with the chapter name (not a part name)

- [ ] **Test: audio re-completion after part reset**
  - Reset the currently playing part
  - Expected: audio pauses
  - Resume and listen to end
  - Expected: part becomes completed again (Firestore write fires, badge turns green)

- [ ] **Test: context menu blocked on mobile**
  - On iOS/Android (or iOS simulator), long-press a completed badge
  - Expected: no native context menu appears, reset dialog opens at 600ms
