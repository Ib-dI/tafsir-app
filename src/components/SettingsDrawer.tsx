"use client";

import { Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Counter } from "@/components/ui/counter";
import { Switch } from "@/components/ui/switch";
import {
  useFontSettings,
  FONT_SCALE_STEPS_MOBILE,
  type ArabicFontStyle,
  type ArabicScript,
} from "@/context/FontSettingsContext";
import {
  DEFAULT_SHOW_TRANSLATION,
  useTranslationDisplay,
} from "@/context/TranslationDisplayContext";
import {
  DEFAULT_WORD_BY_WORD_ENABLED,
  useWordByWord,
} from "@/context/WordByWordContext";
import { applyOrnamentFor, isDigitalKhattFontStyle } from "@/lib/ayahMarker";
import { wordContent } from "@/lib/arabicWordContent";
import { InteractiveWord } from "./VerseItem";
import { useMediaQuery } from "./UseMediaQuery";
import { VerseHighlight } from "@/types/types";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

type SettingsTab = "arabic" | "translation" | "wordByWord";

const ARABIC_SCRIPTS: { id: ArabicScript; label: string }[] = [
  { id: "uthmani", label: "Uthmani" },
  { id: "indopak", label: "IndoPak" },
  { id: "tajweed", label: "Tajweed" },
];

// Les polices DigitalKhatt (https://digitalkhatt.org) sont des polices
// Unicode Uthmani complètes — utilisables pour le script Uthmani et Tajweed,
// pas pour IndoPak qui a sa propre police dédiée.
const FONT_STYLE_OPTIONS: { value: ArabicFontStyle; label: string }[] = [
  { value: "default", label: "QPC Uthmani Hafs" },
  { value: "digitalkhatt-v1", label: "DigitalKhatt V1 (Old Madina)" },
  { value: "digitalkhatt-v2", label: "DigitalKhatt V2 (New Madina)" },
];

// Aperçu en direct du verset, mot par mot interactif — démontre toujours
// l'infobulle de traduction (survol/tap), indépendamment du réglage "Mot par
// mot" de l'utilisateur : son rôle est de montrer ce que ce réglage active.
// Porté depuis VersePreview (extractor-quran), réutilisé dans les deux
// onglets comme là-bas.
function VersePreview({ verse }: { verse: VerseHighlight | undefined }) {
  const { arabicScript, fontStyle } = useFontSettings();
  const { showTranslation } = useTranslationDisplay();
  const [openWordIndex, setOpenWordIndex] = useState<number | null>(null);
  const applyOrnament = applyOrnamentFor(fontStyle);
  const useDigitalKhattText =
    arabicScript === "uthmani" && isDigitalKhattFontStyle(fontStyle);

  if (!verse || verse.words.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#3D3226]/5 p-4">
      <p className="mb-3 text-xs font-medium text-[#3D3226]/60">Aperçu :</p>
      <div
        className="verse-arabic-text mb-3 text-right"
        data-script={arabicScript}
        lang="ar"
        dir="rtl"
      >
        {verse.words.flatMap((word, index) => {
          const content = wordContent(
            word,
            index,
            arabicScript,
            useDigitalKhattText,
            applyOrnament,
          );
          const nodes: ReactNode[] = index > 0 ? [" "] : [];
          nodes.push(
            <InteractiveWord
              key={index}
              content={content}
              translation={word.translation}
              isOpen={openWordIndex === index}
              onOpenChange={(open) => setOpenWordIndex(open ? index : null)}
            />,
          );
          return nodes;
        })}
      </div>
      {showTranslation && (
        <p className="text-sm text-[#3D3226]/80">{verse.translation}</p>
      )}
    </div>
  );
}

interface SettingsDrawerProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  previewVerse?: VerseHighlight;
}

export default function SettingsDrawer({
  playbackRate,
  onPlaybackRateChange,
  previewVerse,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("arabic");
  const {
    fontScaleIndex,
    increaseFontScale,
    decreaseFontScale,
    resetFontScale,
    arabicScript,
    setArabicScript,
    fontStyle,
    setFontStyle,
  } = useFontSettings();
  const { wordByWordEnabled, setWordByWordEnabled } = useWordByWord();
  const { showTranslation, setShowTranslation } = useTranslationDisplay();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const speedIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
  const canDecreaseSpeed = speedIndex > 0;
  const canIncreaseSpeed = speedIndex !== -1 && speedIndex < SPEEDS.length - 1;

  const handleReset = () => {
    resetFontScale();
    onPlaybackRateChange(1);
    setWordByWordEnabled(DEFAULT_WORD_BY_WORD_ENABLED);
    setShowTranslation(DEFAULT_SHOW_TRANSLATION);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Réglages"
          aria-label="Réglages"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#3D3226]/70 transition-colors hover:bg-[#3D3226]/8"
        >
          <Settings className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`flex flex-col gap-0 border-none bg-[#FBF3E4] p-0 text-[#3D3226] ${
          isMobile ? "max-h-[85vh] rounded-t-2xl" : ""
        }`}
      >
        <SheetHeader className="border-b border-[#3D3226]/10 p-4 pb-0">
          <SheetTitle className="text-[#3D3226]">Réglages</SheetTitle>
          <div className="mt-3 flex gap-4" role="tablist" aria-label="Réglages">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "arabic"}
              onClick={() => setActiveTab("arabic")}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                activeTab === "arabic"
                  ? "border-[#3D3226] text-[#3D3226]"
                  : "border-transparent text-[#3D3226]/50 hover:text-[#3D3226]/80"
              }`}
            >
              Arabe
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "translation"}
              onClick={() => setActiveTab("translation")}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                activeTab === "translation"
                  ? "border-[#3D3226] text-[#3D3226]"
                  : "border-transparent text-[#3D3226]/50 hover:text-[#3D3226]/80"
              }`}
            >
              Traduction
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wordByWord"}
              onClick={() => setActiveTab("wordByWord")}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                activeTab === "wordByWord"
                  ? "border-[#3D3226] text-[#3D3226]"
                  : "border-transparent text-[#3D3226]/50 hover:text-[#3D3226]/80"
              }`}
            >
              Mot par mot
            </button>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {activeTab === "arabic" && (
            <>
              <VersePreview verse={previewVerse} />

              {/* Choix du script arabe */}
              <div className="flex items-center gap-1 rounded-full bg-[#3D3226]/8 p-1">
                {ARABIC_SCRIPTS.map((script) => {
                  const isSelected = script.id === arabicScript;
                  return (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => setArabicScript(script.id)}
                      className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-white text-[#3D3226] shadow-sm"
                          : "text-[#3D3226]/60 hover:text-[#3D3226]"
                      }`}
                    >
                      {script.label}
                    </button>
                  );
                })}
              </div>

              {/* Style de police — IndoPak a sa propre police fixe */}
              {arabicScript !== "indopak" && (
                <div className="flex items-center justify-between gap-3 py-1">
                  <label
                    htmlFor="quran-font-style"
                    className="text-sm font-medium text-[#3D3226]"
                  >
                    Style de police
                  </label>
                  <select
                    id="quran-font-style"
                    value={fontStyle}
                    onChange={(e) =>
                      setFontStyle(e.target.value as ArabicFontStyle)
                    }
                    className="max-w-[11rem] truncate rounded-full border border-[#3D3226]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#3D3226]"
                  >
                    {FONT_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Taille de police */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-[#3D3226]">
                  Taille de police
                </span>
                <Counter
                  value={fontScaleIndex + 1}
                  onDecrement={
                    fontScaleIndex === 0 ? undefined : decreaseFontScale
                  }
                  onIncrement={
                    fontScaleIndex === FONT_SCALE_STEPS_MOBILE.length - 1
                      ? undefined
                      : increaseFontScale
                  }
                />
              </div>
            </>
          )}

          {activeTab === "translation" && (
            <>
              <VersePreview verse={previewVerse} />

              {/* Traduction / translitération */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#3D3226]">
                    Afficher la traduction
                  </span>
                  <span className="text-xs text-[#3D3226]/60">
                    Traduction française et translitération sous le verset
                  </span>
                </div>
                <Switch
                  checked={showTranslation}
                  onCheckedChange={setShowTranslation}
                  aria-label="Afficher la traduction et la translitération"
                />
              </div>
            </>
          )}

          {activeTab === "wordByWord" && (
            <>
              <VersePreview verse={previewVerse} />

              {/* Mot par mot */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#3D3226]">
                    Mot par mot
                  </span>
                  <span className="text-xs text-[#3D3226]/60">
                    Survol ou tap sur un mot pour sa traduction
                  </span>
                </div>
                <Switch
                  checked={wordByWordEnabled}
                  onCheckedChange={setWordByWordEnabled}
                  aria-label="Activer le mode mot par mot"
                />
              </div>
            </>
          )}

          {/* Vitesse de lecture — hors onglets : ne concerne pas l'affichage arabe */}
          <div className="flex items-center justify-between border-t border-[#3D3226]/10 py-1 pt-4">
            <span className="text-sm font-medium text-[#3D3226]">
              Vitesse de lecture
            </span>
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

        <SheetFooter className="flex-row items-center justify-between border-t border-[#3D3226]/10 p-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-[#3D3226]/70 hover:text-[#3D3226]"
          >
            Réinitialiser
          </button>
          <SheetClose asChild>
            <button
              type="button"
              className="rounded-full bg-[#3D3226] px-6 py-2 text-sm font-medium text-white hover:bg-[#3D3226]/90"
            >
              OK
            </button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
