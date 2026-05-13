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
