"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, List, Check, X } from "lucide-react";
import { HeaderRightProps } from "@/types/types";
import type { TafsirAudioPart } from "@/types/types";
import { useCompletedPartLongPress } from "@/hooks/useCompletedPartLongPress";
import ResetProgressDialog from "./ResetProgressDialog";

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
  const { handlers, pressing, onClick } = useCompletedPartLongPress({
    onLongPress: () =>
      onResetRequest(part.id, part.title || `Partie ${idx + 1}`),
    onSelect,
  });

  return (
    <button
      data-part-index={idx}
      {...handlers}
      onClick={onClick}
      className={`flex w-full flex-row items-center border-b border-[#3D3226]/10 px-6 py-4 transition-all duration-200 ${
        pressing
          ? "border-l-4 border-l-transparent bg-green-100"
          : isCurrentPart
            ? "border-l-4 border-l-[#d28820] bg-[#d28820]/10"
            : "border-l-4 border-l-transparent bg-[#FBF3E4] hover:bg-[#3D3226]/5"
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
          isCurrentPart
            ? "bg-[#d28820] text-white"
            : "bg-[#3D3226]/10 text-[#3D3226]/70"
        }`}
      >
        {idx + 1}
      </div>
      <div className="ml-4 flex-1 text-left">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`font-medium ${isCurrentPart ? "text-[#d28820]" : "text-[#3D3226]"}`}
          >
            {part.title || `Partie ${idx + 1}`}
          </span>
          {hasMultipleOccurrences && (
            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600">
              +occurrences
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-300 bg-green-100"
          aria-label="Partie complétée"
        >
          <Check size={12} className="text-green-600" strokeWidth={2.5} />
        </div>
        <span className="text-xs text-[#3D3226]/40">⟳ Maintenir</span>
        {isCurrentPart && (
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-[#d28820]"
            aria-label="Partie actuelle"
          />
        )}
      </div>
    </button>
  );
}

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
  const [isPartSelectorVisible, setIsPartSelectorVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dialogPart, setDialogPart] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef<number>(0);
  const startScrollTop = useRef<number>(0);

  // Déterminer si la partie actuelle est complétée
  const currentPart = audioParts[currentPartIndex];
  const isCurrentPartCompleted =
    currentPart && completedPartIds.has(currentPart.id);

  // ✅ GESTIONNAIRES pour les boutons de navigation
  const handleNextPart = () => {
    if (currentPartIndex < audioParts.length - 1) {
      if (onNextPart) {
        onNextPart();
      } else {
        setCurrentPartIndex(currentPartIndex + 1);
      }
    }
  };

  const handlePreviousPart = () => {
    if (currentPartIndex > 0) {
      if (onPreviousPart) {
        onPreviousPart();
      } else {
        setCurrentPartIndex(currentPartIndex - 1);
      }
    }
  };

  // ✅ GESTIONNAIRE pour la sélection de partie
  const handlePartSelection = (newPartIndex: number) => {
    console.log("🔄 HeaderRight: Sélection partie:", newPartIndex);
    setCurrentPartIndex(newPartIndex);
    setIsPartSelectorVisible(false);
  };

  // ✅ GESTIONNAIRES de swipe pour fermer la modal
  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    startTouchY.current = e.touches[0].clientY;
    startScrollTop.current = scrollContainer.scrollTop;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const currentTouchY = e.touches[0].clientY;
    const deltaY = currentTouchY - startTouchY.current;

    // Ne déclencher le drag que si on est en haut et qu'on tire vers le bas
    if (startScrollTop.current === 0 && deltaY > 0) {
      setIsDragging(true);
      setDragOffset(deltaY);

      // Empêcher le scroll par défaut pendant le drag
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      // Si on a tiré de plus de 150px, fermer la modal
      if (dragOffset > 150) {
        setIsPartSelectorVisible(false);
      }

      // Réinitialiser
      setDragOffset(0);
      setIsDragging(false);
    }
  };

  // Empêcher le défilement du body et gérer le scroll initial
  useEffect(() => {
    if (isPartSelectorVisible) {
      document.body.style.overflow = "hidden";

      // Reset du drag offset
      setDragOffset(0);
      setIsDragging(false);

      // Scroll vers la partie sélectionnée
      setTimeout(() => {
        const currentButton = document.querySelector(
          `[data-part-index="${currentPartIndex}"]`,
        );
        if (currentButton && scrollContainerRef.current) {
          currentButton.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 100);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isPartSelectorVisible, currentPartIndex]);

  return (
    <>
      {audioParts && audioParts.length > 1 ? (
        <div className="flex flex-row items-center gap-2">
          {/* Bouton précédent */}
          <button
            onClick={handlePreviousPart}
            className="rounded-full border px-3 py-2 transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
            disabled={currentPartIndex === 0}
            aria-label="Partie précédente"
          >
            <ArrowLeft
              size={16}
              color={
                currentPartIndex === 0 ? colors.textSecondary : colors.text
              }
            />
          </button>

          {/* Sélecteur de partie */}
          <button
            onClick={() => setIsPartSelectorVisible(true)}
            className={`relative flex flex-row items-center gap-1.5 rounded-full border px-3 py-2 transition-all duration-200 hover:shadow-sm active:scale-95 ${
              isCurrentPartCompleted
                ? "border-green-300 bg-green-100/50 text-green-600"
                : ""
            }`}
            style={{
              backgroundColor: isCurrentPartCompleted ? "" : colors.card,
              borderColor: isCurrentPartCompleted ? "" : colors.border,
              color: isCurrentPartCompleted ? "" : colors.text,
            }}
            aria-label="Choisir la partie"
          >
            {/* Icône de validation si la partie est complétée */}
            {isCurrentPartCompleted && (
              <div className="absolute -top-1 -right-1 rounded-full border border-green-300 bg-white p-0.5 shadow-sm">
                <Check size={10} className="text-green-600" />
              </div>
            )}

            <List
              size={16}
              className={isCurrentPartCompleted ? "text-green-600" : ""}
            />
            <span
              className={`font-mono text-xs ${isCurrentPartCompleted ? "text-green-600" : ""}`}
            >
              {currentPartIndex + 1}/{audioParts.length}
            </span>
          </button>

          {/* Bouton suivant */}
          <button
            onClick={handleNextPart}
            className="rounded-full border px-3 py-2 transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
            disabled={currentPartIndex === audioParts.length - 1}
            aria-label="Partie suivante"
          >
            <ArrowRight
              size={16}
              color={
                currentPartIndex === audioParts.length - 1
                  ? colors.textSecondary
                  : colors.text
              }
            />
          </button>
        </div>
      ) : null}

      {/* Modal de sélection des parties avec swipe to dismiss */}
      {isPartSelectorVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setIsPartSelectorVisible(false)}
        >
          {/* Overlay avec animation de fade et opacité dynamique */}
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] transition-opacity duration-200"
            style={{
              opacity: isDragging ? Math.max(0, 1 - dragOffset / 300) : 1,
            }}
          />

          {/* Conteneur de la modal avec animations et swipe */}
          <div
            ref={modalRef}
            className="relative mx-1 mb-0 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#FBF3E4] shadow-xl"
            style={{
              maxHeight: "70vh",
              transform: `translateY(${dragOffset}px)`,
              transition: isDragging ? "none" : "transform 0.3s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* En-tête fixe avec design amélioré */}
            <div className="relative shrink-0 border-b border-[#3D3226]/10 bg-[#FBF3E4] px-6 pt-4 pb-3">
              {/* Poignée de drag centrée et stylisée */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 transform">
                <div
                  className="h-1 w-12 rounded-full bg-[#3D3226]/25 transition-all duration-200"
                  style={{
                    width: isDragging ? "16px" : "48px",
                    backgroundColor:
                      isDragging && dragOffset > 150 ? "#22c55e" : "",
                  }}
                />
              </div>

              {/* Conteneur du titre et croix */}
              <div className="flex items-center justify-between pt-2">
                <div className="w-8" />

                <h3 className="text-center text-lg font-semibold text-[#3D3226]">
                  Choisir la partie
                </h3>

                <button
                  onClick={() => setIsPartSelectorVisible(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3D3226]/8 transition-colors duration-200 hover:bg-[#3D3226]/15 active:scale-95"
                  aria-label="Fermer"
                >
                  <X size={18} className="text-[#3D3226]/70" />
                </button>
              </div>
            </div>

            {/* Liste des parties avec défilement interne */}
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[#3D3226]/5"
              style={{
                overflowY: isDragging ? "hidden" : "auto",
              }}
            >
              {audioParts.map((part, idx) => {
                const uniqueVerses = new Set(part.timings.map((t) => t.id));
                const totalOccurrences = part.timings.length;
                const hasMultipleOccurrences =
                  totalOccurrences > uniqueVerses.size;
                const isCompleted =
                  completedPartIds.has(part.id) &&
                  part.id !== "remaining-verses";
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
                    className={`flex w-full flex-row items-center px-6 py-4 transition-all duration-200 ${
                      isCurrentPart
                        ? "border-l-4 border-l-[#d28820] bg-[#d28820]/10"
                        : "border-l-4 border-l-transparent bg-[#FBF3E4] hover:bg-[#3D3226]/5"
                    } ${idx !== audioParts.length - 1 ? "border-b border-[#3D3226]/10" : ""}`}
                    aria-label={`Sélectionner ${part.title}`}
                    aria-current={isCurrentPart ? "page" : undefined}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isCurrentPart
                          ? "bg-[#d28820] text-white"
                          : "bg-[#3D3226]/10 text-[#3D3226]/70"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="ml-4 flex-1 text-left">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`font-medium ${isCurrentPart ? "text-[#d28820]" : "text-[#3D3226]"}`}
                        >
                          {part.id === "remaining-verses" ? (
                            <>
                              {part.title} ({part.timings.length})
                            </>
                          ) : (
                            part.title || `Partie ${idx + 1}`
                          )}
                        </span>
                        {hasMultipleOccurrences &&
                          part.id !== "remaining-verses" && (
                            <span
                              className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600"
                              aria-label="Contient des occurrences multiples"
                            >
                              +occurrences
                            </span>
                          )}
                      </div>
                      {part.id === "remaining-verses" && (
                        <span
                          className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-600"
                          aria-label="Partie sans audio"
                        >
                          sans audio
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isCurrentPart && (
                        <div
                          className="h-2 w-2 animate-pulse rounded-full bg-[#d28820]"
                          aria-label="Partie actuelle"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

export default HeaderRight;
