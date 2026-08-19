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
      {/* suppressHydrationWarning : `value`/`onIncrement`/`onDecrement` peuvent
          venir d'une préférence lue depuis localStorage dès le premier rendu
          client (ex. vitesse de lecture), donc légitimement différente du
          rendu serveur par défaut. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        disabled={!onDecrement}
        onClick={onDecrement}
        aria-label="Diminuer"
        suppressHydrationWarning
      >
        <Minus className="size-4" />
      </Button>
      <span
        className="w-8 text-center text-sm font-medium tabular-nums text-gray-700"
        suppressHydrationWarning
      >
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
        suppressHydrationWarning
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
