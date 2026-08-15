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
