"use client";

import { Settings } from "lucide-react";
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
import {
  useFontSettings,
  FONT_SCALE_STEPS_MOBILE,
  type ArabicScript,
} from "@/context/FontSettingsContext";
import { useMediaQuery } from "./UseMediaQuery";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

const PREVIEW_VERSE = {
  text: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
  translation:
    "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux",
};

const ARABIC_SCRIPTS: { id: ArabicScript | "tajweed"; label: string; enabled: boolean }[] = [
  { id: "uthmani", label: "Uthmani", enabled: true },
  { id: "indopak", label: "IndoPak", enabled: true },
  { id: "tajweed", label: "Tajweed", enabled: false },
];

interface SettingsDrawerProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export default function SettingsDrawer({
  playbackRate,
  onPlaybackRateChange,
}: SettingsDrawerProps) {
  const {
    fontScaleIndex,
    increaseFontScale,
    decreaseFontScale,
    resetFontScale,
    arabicScript,
    setArabicScript,
  } = useFontSettings();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const speedIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
  const canDecreaseSpeed = speedIndex > 0;
  const canIncreaseSpeed = speedIndex !== -1 && speedIndex < SPEEDS.length - 1;

  const handleReset = () => {
    resetFontScale();
    onPlaybackRateChange(1);
  };

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
        className={`flex flex-col gap-0 border-none bg-[#FBF3E4] p-0 text-[#3D3226] ${
          isMobile ? "max-h-[85vh] rounded-t-2xl" : ""
        }`}
      >
        <SheetHeader className="border-b border-[#3D3226]/10 p-4">
          <SheetTitle className="text-[#3D3226]">Réglages</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* Aperçu */}
          <div className="rounded-2xl bg-[#3D3226]/5 p-4">
            <p className="mb-3 text-xs font-medium text-[#3D3226]/60">Aperçu :</p>
            <div
              className="verse-arabic-text mb-3 text-right leading-relaxed"
              style={{ direction: "rtl" }}
            >
              {PREVIEW_VERSE.text}
            </div>
            <p className="text-sm text-[#3D3226]/80">{PREVIEW_VERSE.translation}</p>
          </div>

          {/* Choix du script arabe */}
          <div className="flex items-center gap-1 rounded-full bg-[#3D3226]/8 p-1">
            {ARABIC_SCRIPTS.map((script) => {
              const isSelected = script.enabled && script.id === arabicScript;
              return (
                <button
                  key={script.id}
                  type="button"
                  disabled={!script.enabled}
                  title={script.enabled ? undefined : "Bientôt disponible"}
                  onClick={
                    script.enabled
                      ? () => setArabicScript(script.id as ArabicScript)
                      : undefined
                  }
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-white text-[#3D3226] shadow-sm"
                      : script.enabled
                        ? "text-[#3D3226]/60 hover:text-[#3D3226]"
                        : "cursor-not-allowed text-[#3D3226]/35"
                  }`}
                >
                  {script.label}
                </button>
              );
            })}
          </div>

          {/* Taille de police */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-[#3D3226]">Taille de police</span>
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

          {/* Vitesse de lecture */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-[#3D3226]">Vitesse de lecture</span>
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
