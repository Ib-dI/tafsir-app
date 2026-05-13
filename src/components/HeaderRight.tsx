"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, List, Check, X } from 'lucide-react';
import { HeaderRightProps } from "@/types/types";
import type { TafsirAudioPart } from "@/types/types";
import { useLongPress } from "@/hooks/useLongPress";
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
  const firedRef = useRef(false);
  const { handlers, pressing } = useLongPress(() => {
    firedRef.current = true;
    onResetRequest(part.id, part.title || `Partie ${idx + 1}`);
  }, 600);

  return (
    <button
      data-part-index={idx}
      {...handlers}
      onClick={() => {
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        onSelect();
      }}
      className={`w-full py-4 px-6 flex flex-row items-center transition-all duration-200 border-b border-gray-100 ${
        pressing
          ? "bg-green-100 border-l-4 border-l-transparent"
          : isCurrentPart
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
            {part.title || `Partie ${idx + 1}`}
          </span>
          {hasMultipleOccurrences && (
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
              +occurrences
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
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
  const [dialogPart, setDialogPart] = useState<{ id: string; name: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef<number>(0);
  const startScrollTop = useRef<number>(0);
  
  // Déterminer si la partie actuelle est complétée
  const currentPart = audioParts[currentPartIndex];
  const isCurrentPartCompleted = currentPart && completedPartIds.has(currentPart.id);

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
    console.log('🔄 HeaderRight: Sélection partie:', newPartIndex);
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
      document.body.style.overflow = 'hidden';
      
      // Reset du drag offset
      setDragOffset(0);
      setIsDragging(false);
      
      // Scroll vers la partie sélectionnée
      setTimeout(() => {
        const currentButton = document.querySelector(`[data-part-index="${currentPartIndex}"]`);
        if (currentButton && scrollContainerRef.current) {
          currentButton.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPartSelectorVisible, currentPartIndex]);

  return (
    <>
      {audioParts && audioParts.length > 1 ? (
        <div className="flex flex-row items-center gap-2">
          {/* Bouton précédent */}
          <button
            onClick={handlePreviousPart}
            className="px-3 py-2 rounded-full border transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
            disabled={currentPartIndex === 0}
            aria-label="Partie précédente"
          >
            <ArrowLeft 
              size={16} 
              color={currentPartIndex === 0 ? colors.textSecondary : colors.text} 
            />
          </button>
          
          {/* Sélecteur de partie */}
          <button
            onClick={() => setIsPartSelectorVisible(true)}
            className={`px-3 py-2 rounded-full flex flex-row items-center gap-1.5 border relative transition-all duration-200 hover:shadow-sm active:scale-95 ${
              isCurrentPartCompleted 
                ? 'bg-green-100/50 text-green-600 border-green-300' 
                : ''
            }`}
            style={{
              backgroundColor: isCurrentPartCompleted ? '' : colors.card,
              borderColor: isCurrentPartCompleted ? '' : colors.border,
              color: isCurrentPartCompleted ? '' : colors.text
            }}
            aria-label="Choisir la partie"
          >
            {/* Icône de validation si la partie est complétée */}
            {isCurrentPartCompleted && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border border-green-300 shadow-sm">
                <Check size={10} className="text-green-600" />
              </div>
            )}
            
            <List 
              size={16} 
              className={isCurrentPartCompleted ? 'text-green-600' : ''} 
            />
            <span className={`text-xs font-mono ${isCurrentPartCompleted ? 'text-green-600' : ''}`}>
              {currentPartIndex + 1}/{audioParts.length}
            </span>
          </button>
          
          {/* Bouton suivant */}
          <button
            onClick={handleNextPart}
            className="px-3 py-2 rounded-full border transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
            disabled={currentPartIndex === audioParts.length - 1}
            aria-label="Partie suivante"
          >
            <ArrowRight 
              size={16} 
              color={currentPartIndex === audioParts.length - 1 ? colors.textSecondary : colors.text} 
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
              opacity: isDragging ? Math.max(0, 1 - dragOffset / 300) : 1
            }}
          />
          
          {/* Conteneur de la modal avec animations et swipe */}
          <div 
            ref={modalRef}
            className="relative bg-white rounded-t-3xl shadow-xl w-full max-w-lg mx-1 mb-0 overflow-hidden flex flex-col"
            style={{ 
              maxHeight: '70vh',
              transform: `translateY(${dragOffset}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* En-tête fixe avec design amélioré */}
            <div className="relative px-6 pt-4 pb-3 bg-white border-b border-gray-100 shrink-0">
              {/* Poignée de drag centrée et stylisée */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <div 
                  className="w-12 h-1 rounded-full bg-gray-300 transition-all duration-200"
                  style={{
                    width: isDragging ? '16px' : '48px',
                    backgroundColor: isDragging && dragOffset > 150 ? '#22c55e' : ''
                  }}
                />
              </div>
              
              {/* Conteneur du titre et croix */}
              <div className="flex items-center justify-between pt-2">
                <div className="w-8" />
                
                <h3 className="font-semibold text-lg text-gray-800 text-center">
                  Choisir la partie
                </h3>
                
                <button
                  onClick={() => setIsPartSelectorVisible(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center active:scale-95"
                  aria-label="Fermer"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Liste des parties avec défilement interne */}
            <div 
              ref={scrollContainerRef}
              className="overflow-y-auto flex-1 bg-gray-50/30 min-h-0"
              style={{
                overflowY: isDragging ? 'hidden' : 'auto'
              }}
            >
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