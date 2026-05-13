"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ResetProgressDialogProps {
  chapterName: string;
  onConfirm: () => void;
  trigger: ReactNode;
}

export default function ResetProgressDialog({
  chapterName,
  onConfirm,
  trigger,
}: ResetProgressDialogProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clonedTrigger = React.isValidElement(trigger)
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

  const handleConfirm = () => {
    setOpen(false);
    onConfirm();
  };

  const modal = (
    <AnimatePresence>
      {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[950] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.82, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.05 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-yellow-300 to-amber-400 p-[1.5px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex flex-col items-center rounded-2xl bg-white px-6 pb-6 pt-8 text-center">
                {/* Fermeture */}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Icône */}
                <motion.div
                  initial={{ rotate: -160, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 12, delay: 0.15 }}
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 shadow-inner ring-1 ring-amber-200/60"
                >
                  <RotateCcw className="h-7 w-7 text-amber-500" strokeWidth={2} />
                </motion.div>

                {/* Titre */}
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.35 }}
                  className="mb-2 text-lg font-bold tracking-tight text-gray-800"
                >
                  Réviser ce chapitre ?
                </motion.h3>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.35 }}
                  className="mb-7 text-sm leading-relaxed text-gray-500"
                >
                  La progression de{" "}
                  <span className="font-semibold text-gray-700">{chapterName}</span>{" "}
                  sera réinitialisée. Vous pourrez recommencer depuis le début.
                </motion.p>

                {/* Boutons */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.37, duration: 0.35 }}
                  className="flex w-full gap-3"
                >
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200/60 transition-all hover:brightness-105 hover:shadow-lg hover:shadow-amber-200/80 active:scale-95"
                  >
                    Réinitialiser
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  return (
    <>
      {clonedTrigger}
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
