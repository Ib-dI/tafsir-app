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
